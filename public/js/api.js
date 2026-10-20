/**
 * JourneyHub Central API Client
 * Features: Cold-start detection, automatic retries, request timeouts, and resilient error recovery.
 */
const API = {
  tokenKey: 'journeyhub_jwt_token',
  defaultTimeoutMs: 35000, // 35s to accommodate Render micro-VM cold starts

  getBaseUrl() {
    if (window.JOURNEYHUB_API_URL) return window.JOURNEYHUB_API_URL.replace(/\/$/, '');
    const hostname = window.location.hostname;
    // If frontend is deployed on an independent static host (Cloudflare Pages, Render Static Site, GitHub Pages, Vercel, Netlify)
    if (
      hostname.endsWith('pages.dev') ||
      hostname.endsWith('github.io') ||
      hostname.endsWith('vercel.app') ||
      hostname.endsWith('netlify.app') ||
      (hostname.endsWith('onrender.com') && !hostname.includes('journeyhub-m5lq'))
    ) {
      return 'https://journeyhub-m5lq.onrender.com';
    }
    return '';
  },

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  },

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  },

  /**
   * Execute an HTTP request with timeout, cold-start detection, and automatic retries
   */
  async request(endpoint, options = {}, retries = 2) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = endpoint.startsWith('http') 
      ? endpoint 
      : `${this.getBaseUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const controller = new AbortController();
    const timeout = options.timeout || this.defaultTimeoutMs;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    // If request takes longer than 3 seconds, inform BackendStatus that a cold start might be underway
    const slowTimer = setTimeout(() => {
      if (window.BackendStatus) {
        window.BackendStatus.triggerWakeup('Slow request response');
      }
    }, 3000);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearTimeout(slowTimer);

      // Backend answered successfully, mark awake
      if (window.BackendStatus && response.ok) {
        window.BackendStatus.setAwake();
      }

      // Special handling for CSV file downloads
      if (headers['Accept'] === 'text/csv' || endpoint.endsWith('/csv')) {
        if (!response.ok) throw new Error('Failed to download report');
        return await response.text();
      }

      // Check for Render/Cloud Gateway sleeping codes (502 Bad Gateway, 503, 504 Gateway Timeout)
      if ([502, 503, 504].includes(response.status)) {
        if (window.BackendStatus) {
          window.BackendStatus.triggerWakeup(`HTTP ${response.status} from cloud gateway`);
        }

        // Retry idempotent GET requests if retries remaining
        if ((!options.method || options.method === 'GET') && retries > 0) {
          console.warn(`[API] Cloud gateway returned ${response.status}. Retrying in 3s... (${retries} attempts left)`);
          await new Promise(r => setTimeout(r, 3000));
          return this.request(endpoint, options, retries - 1);
        }

        const gatewayErr = new Error('Cloud server is waking up. Please retry in a few moments.');
        gatewayErr.status = response.status;
        gatewayErr.isColdStart = true;
        throw gatewayErr;
      }

      // Parse JSON safely (Render cold-start error pages might return HTML)
      let data = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.warn('[API] Could not parse JSON response:', jsonErr.message);
          data = {};
        }
      } else {
        const text = await response.text().catch(() => '');
        if (text.includes('Service Waking Up') || text.includes('Application Loading') || text.includes('no-server')) {
          if (window.BackendStatus) {
            window.BackendStatus.triggerWakeup('Render wakeup splash received');
          }
          if ((!options.method || options.method === 'GET') && retries > 0) {
            console.warn(`[API] Render cold-start splash detected. Retrying in 4s... (${retries} left)`);
            await new Promise(r => setTimeout(r, 4000));
            return this.request(endpoint, options, retries - 1);
          }
        }
        data = { message: text.slice(0, 200) || `HTTP error ${response.status}` };
      }

      if (response.status === 401) {
        // Expired or invalid token
        this.clearToken();
        if (window.State) window.State.setUser(null);
        window.location.hash = '#/login';
        throw new Error(data.message || 'Session expired. Please log in.');
      }

      if (!response.ok) {
        const err = new Error(data.message || `An error occurred (${response.status}) while processing your request.`);
        err.status = response.status;
        err.code = data.code;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      clearTimeout(slowTimer);

      // Detect network failure or timeout (typical of sleeping free instances)
      if (err.name === 'AbortError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        if (window.BackendStatus) {
          window.BackendStatus.triggerWakeup(err.name === 'AbortError' ? 'Request timed out' : 'Network unreachable');
        }

        // Retry idempotent GET requests if retries remaining
        if ((!options.method || options.method === 'GET') && retries > 0) {
          console.warn(`[API] Connection issue (${err.message}). Retrying in 3.5s... (${retries} attempts left)`);
          await new Promise(r => setTimeout(r, 3500));
          return this.request(endpoint, options, retries - 1);
        }

        const networkErr = new Error(
          err.name === 'AbortError' 
            ? 'The server took too long to respond. The free cloud instance may be waking up.' 
            : 'Unable to reach the cloud server. The backend may be waking up.'
        );
        networkErr.isColdStart = true;
        networkErr.originalError = err;
        throw networkErr;
      }

      console.error(`[API Error] ${endpoint}:`, err.message);
      throw err;
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },

  /**
   * Helper to render a user-friendly retry card on any container
   */
  renderRetryCard(container, message = '', onRetryFn) {
    if (!container) return;
    const retryFnName = `_retry_${Date.now()}`;
    window[retryFnName] = async () => {
      delete window[retryFnName];
      if (typeof onRetryFn === 'function') {
        container.innerHTML = '<div class="spinner"></div><p style="text-align: center; color: var(--text-secondary); margin-top: 0.5rem;">Connecting to server...</p>';
        await onRetryFn();
      }
    };

    container.innerHTML = `
      <div class="empty-state jh-retry-card" style="padding: 2.5rem 1.5rem; text-align: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); margin: 1.5rem 0;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(245, 158, 11, 0.12); color: var(--accent-orange, #f59e0b); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin: 0 auto 1rem auto;">
          <i class="fas fa-satellite-dish"></i>
        </div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">
          Cloud Server Connecting...
        </h3>
        <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 1.25rem auto; font-size: 0.9rem; line-height: 1.5;">
          ${message || 'The cloud backend is either warming up (Render free tier cold start) or experiencing high latency. You can retry now or hold on while we reconnect.'}
        </p>
        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-teal btn-sm" onclick="window['${retryFnName}']()">
            <i class="fas fa-redo"></i> Retry Request
          </button>
          <button class="btn btn-outline btn-sm" onclick="if(window.BackendStatus)window.BackendStatus.manualRetry()">
            <i class="fas fa-heartbeat"></i> Check Status
          </button>
        </div>
      </div>
    `;
  }
};

window.API = API;
