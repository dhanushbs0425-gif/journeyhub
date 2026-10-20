/**
 * JourneyHub Cloud Backend Status & Cold-Start Recovery Manager
 * Handles Render free tier cold starts, connection timeouts, and automatic retry.
 */
const BackendStatus = {
  isWakingUp: false,
  isOnline: true,
  wakeUpStart: null,
  timerInterval: null,
  pingInterval: null,
  hasAnnouncedOnline: false,

  init() {
    this.createBanner();
    this.setupListeners();
    // Proactively check backend health in background
    this.probeBackend(true);
  },

  getWarmingHtml() {
    return `
      <div class="backend-status-content">
        <div class="backend-status-pulse"></div>
        <div class="backend-status-info">
          <div class="backend-status-title">
            <i class="fas fa-satellite-dish"></i> Cloud Engine Waking Up...
          </div>
          <div class="backend-status-desc">
            JourneyHub is hosted on Render's cloud. Free instances sleep after 15 min of inactivity and take ~30–45s to warm up. 
            <span class="backend-status-elapsed">(Warming up: <strong id="backend-status-seconds">0</strong>s)</span>
          </div>
        </div>
        <div class="backend-status-actions">
          <button class="btn btn-sm btn-outline" id="backend-status-retry-btn" onclick="BackendStatus.manualRetry()">
            <i class="fas fa-sync-alt" id="backend-retry-icon"></i> Check Now
          </button>
        </div>
      </div>
    `;
  },

  getConnectedHtml() {
    return `
      <div class="backend-status-content">
        <div class="backend-status-check"><i class="fas fa-check-circle"></i></div>
        <div class="backend-status-info">
          <div class="backend-status-title" style="color: #10b981;">
            Cloud Engine Connected!
          </div>
          <div class="backend-status-desc">
            Backend is active. All real-time travel services and database connections are operational.
          </div>
        </div>
      </div>
    `;
  },

  createBanner() {
    let banner = document.getElementById('backend-status-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'backend-status-banner';
      document.body.appendChild(banner);
    }
    banner.className = 'backend-status-banner hidden';
    banner.innerHTML = this.getWarmingHtml();
  },

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.probeBackend();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showOffline();
    });
  },

  triggerWakeup(reason = '') {
    if (this.isWakingUp) return;
    this.isWakingUp = true;
    this.wakeUpStart = Date.now();

    console.log('[BackendStatus] Cloud engine wake-up detected:', reason);
    this.renderWakeupUI();
    this.startElapsedTimer();
    this.startHealthPolling();

    // Update navbar indicator if present
    this.updateNavbarIndicator('waking_up');
  },

  renderWakeupUI() {
    const banner = document.getElementById('backend-status-banner');
    if (!banner) return;

    banner.innerHTML = this.getWarmingHtml();
    banner.className = 'backend-status-banner visible warming';
    const secondsEl = document.getElementById('backend-status-seconds');
    if (secondsEl) secondsEl.textContent = '0';
  },

  startElapsedTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.wakeUpStart) return;
      const elapsed = Math.floor((Date.now() - this.wakeUpStart) / 1000);
      const secondsEl = document.getElementById('backend-status-seconds');
      if (secondsEl) {
        secondsEl.textContent = elapsed;
      }
    }, 1000);
  },

  startHealthPolling() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(async () => {
      await this.probeBackend();
    }, 4000);
  },

  async probeBackend(silent = false) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.status === 'online') {
          this.setAwake();
          return true;
        }
      }
      return false;
    } catch (err) {
      if (!silent) {
        console.log('[BackendStatus] Probe failed, backend still warming up...');
      }
      return false;
    }
  },

  setAwake() {
    const wasWakingUp = this.isWakingUp;
    this.isWakingUp = false;
    this.isOnline = true;
    this.hasAnnouncedOnline = true;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Always update navbar indicator quietly without flashing or triggering toasts
    this.updateNavbarIndicator('connected');

    // ONLY show success notification & banner if we genuinely recovered from a confirmed waking-up or offline state
    if (wasWakingUp) {
      const banner = document.getElementById('backend-status-banner');
      if (banner) {
        banner.className = 'backend-status-banner visible connected';
        banner.innerHTML = this.getConnectedHtml();

        setTimeout(() => {
          banner.className = 'backend-status-banner hidden';
          setTimeout(() => {
            const b = document.getElementById('backend-status-banner');
            if (b) b.innerHTML = this.getWarmingHtml();
          }, 600);
        }, 3500);
      }

      window.dispatchEvent(new CustomEvent('backend_awake'));
      if (window.Toast) {
        window.Toast.show('Cloud server connected successfully!', 'success');
      }
    }
  },

  showOffline() {
    this.isWakingUp = true;
    const banner = document.getElementById('backend-status-banner');
    if (!banner) return;
    banner.className = 'backend-status-banner visible offline';
    banner.innerHTML = `
      <div class="backend-status-content">
        <div class="backend-status-info">
          <div class="backend-status-title" style="color: #ef4444;">
            <i class="fas fa-wifi"></i> No Internet Connection
          </div>
          <div class="backend-status-desc">
            Your device appears to be offline. Reconnect to Wi-Fi or mobile data to continue.
          </div>
        </div>
      </div>
    `;
  },

  async manualRetry() {
    const icon = document.getElementById('backend-retry-icon');
    if (icon) icon.className = 'fas fa-sync-alt fa-spin';

    const isAwake = await this.probeBackend();
    if (isAwake) {
      this.setAwake();
    } else {
      if (icon) icon.className = 'fas fa-sync-alt';
      if (window.Toast) {
        window.Toast.show('Cloud server still booting up, please hold on a few seconds...', 'info');
      }
    }
  },

  updateNavbarIndicator(status) {
    const indicator = document.getElementById('navbar-backend-pill');
    if (!indicator) return;

    if (status === 'waking_up') {
      indicator.className = 'backend-pill waking-up';
      indicator.innerHTML = '<span class="pulse-dot"></span> <span>Cloud Waking Up</span>';
      indicator.title = 'Backend instance is warming up on Render';
    } else if (status === 'connected') {
      indicator.className = 'backend-pill connected';
      indicator.innerHTML = '<i class="fas fa-cloud"></i> <span>Live</span>';
      indicator.title = 'Cloud engine connected and operational';
    }
  }
};

window.BackendStatus = BackendStatus;
