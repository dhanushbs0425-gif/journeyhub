/**
 * Page: My Join Requests (For Travelers)
 * Displays traveler join requests for both Regular Trips and Mystery Miles expeditions
 * with real-time socket updates, background polling, and secrecy preservation.
 */
const MyRequestsPage = {
  requests: [],
  activeFilter: 'all',
  pollInterval: null,
  socketHandlerAttached: false,

  render() {
    return `
      <div class="page-container">
        <!-- Header -->
        <div class="jh-card" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-navy">Traveler Portal</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-sync fa-spin" id="my-req-sync-indicator" style="display: none; margin-right: 4px;"></i> Live Updates</span>
            </div>
            <h1 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: var(--text-main);">
              My Trip Requests
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">
              Track the live approval status of your requests to join expeditions and Mystery Miles adventures.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <a href="#/explore-trips" class="btn btn-teal btn-md">
              <i class="fas fa-compass"></i> Explore Trips
            </a>
            <a href="#/mystery-trips" class="btn btn-outline btn-md" style="color: #6d28d9; border-color: #ddd6fe;">
              <i class="fas fa-mask"></i> Mystery Miles
            </a>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm ${this.activeFilter === 'all' ? 'btn-teal' : 'btn-outline'}" onclick="MyRequestsPage.setFilter('all')">
            All Requests (<span id="req-count-all">0</span>)
          </button>
          <button class="btn btn-sm ${this.activeFilter === 'pending' ? 'btn-teal' : 'btn-outline'}" onclick="MyRequestsPage.setFilter('pending')">
            <i class="fas fa-clock" style="color: #f59e0b;"></i> Pending (<span id="req-count-pending">0</span>)
          </button>
          <button class="btn btn-sm ${this.activeFilter === 'approved' ? 'btn-teal' : 'btn-outline'}" onclick="MyRequestsPage.setFilter('approved')">
            <i class="fas fa-check-circle" style="color: #10b981;"></i> Approved (<span id="req-count-approved">0</span>)
          </button>
          <button class="btn btn-sm ${this.activeFilter === 'rejected' ? 'btn-teal' : 'btn-outline'}" onclick="MyRequestsPage.setFilter('rejected')">
            <i class="fas fa-times-circle" style="color: #ef4444;"></i> Rejected (<span id="req-count-rejected">0</span>)
          </button>
        </div>

        <!-- Requests List -->
        <div id="my-requests-list" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="text-align: center; padding: 3rem;" class="jh-card">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Loading your requests...</p>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    if (!window.State.currentUser) {
      window.Toast?.show('Please log in to view your join requests.', 'warning');
      window.location.hash = '#/login';
      return;
    }

    await this.fetchRequests();
    this.updateCounters();
    this.renderList();

    this.attachSocketListeners();

    // Start lightweight background polling (every 5 seconds) to catch organiser approvals in real-time
    this.clearIntervals();
    this.pollInterval = setInterval(async () => {
      await this.fetchRequests(true);
      this.updateCounters();
      this.renderList();
    }, 5000);
  },

  destroy() {
    this.clearIntervals();
  },

  clearIntervals() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },

  attachSocketListeners() {
    if (window.socket && !this.socketHandlerAttached) {
      this.socketHandlerAttached = true;

      window.socket.on('join_request_updated', async (data) => {
        const curUser = window.State.currentUser;
        if (!curUser) return;
        const uid = curUser._id ? curUser._id.toString() : curUser.id;

        if (!data.userId || data.userId === uid) {
          await this.fetchRequests(true);
          this.updateCounters();
          this.renderList();

          if (data.status === 'approved') {
            window.Toast?.show('🎉 Great news! Your trip join request has been approved!', 'success');
          } else if (data.status === 'rejected') {
            window.Toast?.show('Your join request update: Not accepted.', 'info');
          }
        }
      });
    }
  },

  async fetchRequests(silent = false) {
    const indicator = document.getElementById('my-req-sync-indicator');
    if (indicator && silent) indicator.style.display = 'inline-block';

    try {
      const res = await window.API.get('/api/join-requests/my-requests');
      this.requests = res?.requests || [];
    } catch (err) {
      if (!silent) {
        window.Toast?.show('Failed to fetch your join requests: ' + err.message, 'error');
      }
    } finally {
      if (indicator) indicator.style.display = 'none';
    }
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.renderList();
  },

  updateCounters() {
    const all = this.requests.length;
    const pending = this.requests.filter(r => r.status === 'pending').length;
    const approved = this.requests.filter(r => r.status === 'approved').length;
    const rejected = this.requests.filter(r => r.status === 'rejected').length;

    const elAll = document.getElementById('req-count-all');
    const elPen = document.getElementById('req-count-pending');
    const elApp = document.getElementById('req-count-approved');
    const elRej = document.getElementById('req-count-rejected');

    if (elAll) elAll.textContent = all;
    if (elPen) elPen.textContent = pending;
    if (elApp) elApp.textContent = approved;
    if (elRej) elRej.textContent = rejected;
  },

  renderList() {
    const container = document.getElementById('my-requests-list');
    if (!container) return;

    let filtered = this.requests;
    if (this.activeFilter !== 'all') {
      filtered = this.requests.filter(r => r.status === this.activeFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="jh-card" style="text-align: center; padding: 3.5rem 1rem;">
          <i class="fas fa-inbox" style="font-size: 2.8rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3 style="font-weight: 700; color: var(--text-main);">No Requests Found</h3>
          <p style="color: var(--text-secondary); max-width: 400px; margin: 0.5rem auto 1.5rem auto;">
            ${this.activeFilter === 'all' 
              ? 'You have not submitted any join requests yet. Discover incredible upcoming trips or join a Mystery Miles expedition!' 
              : `You have no ${this.activeFilter} requests right now.`}
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <a href="#/explore-trips" class="btn btn-teal btn-md">Explore Published Trips</a>
            <a href="#/mystery-trips" class="btn btn-outline btn-md">Explore Mystery Miles</a>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(req => {
      const isMystery = req.tripType === 'mystery' || Boolean(req.mysteryTrip);
      const trip = isMystery ? (req.mysteryTrip || {}) : (req.trip || {});
      const organiser = req.organiser || trip.organiserId || {};
      const status = req.status || 'pending';
      const requestedDate = new Date(req.requestedAt || req.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const cover = window.DestinationImages 
        ? window.DestinationImages.getTripCoverImage(trip)
        : (trip.coverImage || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80');
      const safeDest = (trip.destination || '').replace(/'/g, "\\'");
      const safeTitle = (trip.title || '').replace(/'/g, "\\'");

      let badgeClass = 'badge-warning';
      let statusIcon = 'fa-clock';
      let statusText = 'Pending Organiser Review';

      if (status === 'approved') {
        badgeClass = 'badge-success';
        statusIcon = 'fa-check-circle';
        statusText = 'Approved! You are Confirmed';
      } else if (status === 'rejected') {
        badgeClass = 'badge-danger';
        statusIcon = 'fa-times-circle';
        statusText = 'Request Not Accepted';
      } else if (status === 'cancelled') {
        badgeClass = 'badge-navy';
        statusIcon = 'fa-ban';
        statusText = 'Cancelled by You';
      }

      return `
        <div class="jh-card" style="padding: 1.25rem; border-left: 4px solid ${status === 'approved' ? '#10b981' : status === 'rejected' ? '#ef4444' : 'var(--accent-orange, #f59e0b)'};">
          <div style="display: flex; gap: 1.25rem; flex-wrap: wrap; justify-content: space-between;">
            <!-- Trip Image & Details -->
            <div style="display: flex; gap: 1rem; align-items: flex-start; flex: 1; min-width: 280px;">
              <img src="${cover}" 
                   alt="${safeTitle || safeDest || 'Trip'}"
                   loading="lazy"
                   onerror="if(window.DestinationImages){window.DestinationImages.handleImageError(this, '${safeDest}', '${safeTitle}');}"
                   style="width: 100px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap;">
                  <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0;">
                    ${trip.title || (isMystery ? 'Mystery Miles Expedition' : 'Trip Details')}
                  </h3>
                  <span class="badge ${badgeClass}" style="font-size: 0.72rem;">
                    <i class="fas ${statusIcon}" style="margin-right: 0.25rem;"></i> ${statusText}
                  </span>
                  ${isMystery ? `
                    <span class="badge" style="background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; font-size: 0.72rem;">
                      <i class="fas fa-mask"></i> Mystery Miles
                    </span>
                  ` : ''}
                </div>

                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
                  ${isMystery ? `
                    <i class="fas fa-question-circle" style="color: #8b5cf6;"></i> 
                    ${trip.isRevealed && trip.destinationSecret 
                      ? `<strong style="color: #6d28d9;">Revealed Destination: ${trip.destinationSecret}</strong>` 
                      : `<span>${trip.destinationHint || 'Secret Destination (To be revealed)'}</span>`}
                    ${trip.departureDate ? ` • Departs: ${new Date(trip.departureDate).toLocaleDateString()}` : ''}
                  ` : `
                    <i class="fas fa-map-marker-alt" style="color: var(--accent-orange, #f59e0b);"></i> ${trip.destination || 'India'}
                    ${trip.startDate ? ` • ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}` : ''}
                  `}
                </p>

                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
                  <strong>Organiser:</strong> ${organiser.name || 'Expedition Organisers'} • 
                  <strong>Seats:</strong> ${req.seatsRequested || 1} seat(s) • 
                  <strong>Requested:</strong> ${requestedDate}
                </p>

                ${req.message ? `
                  <div style="margin-top: 0.5rem; font-size: 0.8rem; background: var(--bg-surface, #f8fafc); padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 3px solid var(--border-color); color: var(--text-secondary);">
                    <em>"${req.message}"</em>
                  </div>
                ` : ''}

                ${req.rejectionReason ? `
                  <div style="margin-top: 0.5rem; font-size: 0.8rem; background: rgba(239, 68, 68, 0.08); padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 3px solid #ef4444; color: #dc2626;">
                    <strong>Organiser Note:</strong> ${req.rejectionReason}
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center; min-width: 140px;">
              ${isMystery ? `
                <a href="#/mystery-trips" class="btn ${status === 'approved' ? 'btn-teal' : 'btn-outline'} btn-sm">
                  <i class="fas fa-mask"></i> ${status === 'approved' ? 'View Clues Hub' : 'View Mystery Trip'}
                </a>
              ` : status === 'approved' ? `
                <a href="#/trips/${trip._id}" class="btn btn-teal btn-sm">
                  <i class="fas fa-door-open"></i> Enter Trip Hub
                </a>
              ` : `
                <a href="#/trips/${trip._id}" class="btn btn-outline btn-sm">
                  <i class="fas fa-eye"></i> View Trip
                </a>
              `}

              ${status === 'pending' ? `
                <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" onclick="MyRequestsPage.cancelRequest('${req._id}')">
                  <i class="fas fa-trash-alt"></i> Cancel Request
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async cancelRequest(requestId) {
    if (!confirm('Are you sure you want to cancel this join request?')) return;

    try {
      await window.API.delete(`/api/join-requests/${requestId}`);
      window.Toast?.show('Join request cancelled successfully.', 'info');
      await this.fetchRequests(true);
      this.updateCounters();
      this.renderList();
    } catch (err) {
      window.Toast?.show('Could not cancel request: ' + err.message, 'error');
    }
  }
};

window.MyRequestsPage = MyRequestsPage;
