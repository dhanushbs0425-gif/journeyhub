/**
 * Page: Organiser Join Requests Management
 * Allows tour organisers to review, approve, and reject traveler join requests
 * for both Normal Expeditions and Mystery Miles trips.
 * Shared across all three organisers (Sai, Dhanush, Divya) with real-time socket & polling updates.
 */
const OrganiserRequestsPage = {
  requests: [],
  activeFilter: 'pending',
  pollInterval: null,
  socketHandlerAttached: false,

  render() {
    return `
      <div class="page-container">
        <!-- Header -->
        <div class="jh-card" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-left: 4px solid var(--primary-teal);">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-teal">Organiser Dashboard</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-sync fa-spin" id="org-sync-indicator" style="display: none; margin-right: 4px;"></i> Live Synchronized</span>
            </div>
            <h1 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: var(--text-main);">
              Traveler Join Requests
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">
              Shared expedition review portal. Approvals and rejections synchronize live across all three organisers.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-outline btn-md" id="btn-clear-all-requests" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" onclick="OrganiserRequestsPage.confirmClearAll()">
              <i class="fas fa-trash-alt"></i> Clear All
            </button>
            <a href="#/organiser-trips" class="btn btn-outline btn-md">
              <i class="fas fa-tasks"></i> Manage Trips
            </a>
            <a href="#/trips/create" class="btn btn-teal btn-md">
              <i class="fas fa-plus"></i> Create New Trip
            </a>
          </div>
        </div>

        <!-- Filter Bar -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm ${this.activeFilter === 'pending' ? 'btn-teal' : 'btn-outline'}" onclick="OrganiserRequestsPage.setFilter('pending')">
            <i class="fas fa-clock" style="color: #f59e0b;"></i> Pending Review (<span id="org-count-pending">0</span>)
          </button>
          <button class="btn btn-sm ${this.activeFilter === 'approved' ? 'btn-teal' : 'btn-outline'}" onclick="OrganiserRequestsPage.setFilter('approved')">
            <i class="fas fa-check-circle" style="color: #10b981;"></i> Approved (<span id="org-count-approved">0</span>)
          </button>
          <button class="btn btn-sm ${this.activeFilter === 'rejected' ? 'btn-teal' : 'btn-outline'}" onclick="OrganiserRequestsPage.setFilter('rejected')">
            <i class="fas fa-times-circle" style="color: #ef4444;"></i> Declined (<span id="org-count-rejected">0</span>)
          </button>
          <button class="btn btn-sm ${this.activeFilter === 'all' ? 'btn-teal' : 'btn-outline'}" onclick="OrganiserRequestsPage.setFilter('all')">
            All (<span id="org-count-all">0</span>)
          </button>
        </div>

        <!-- Requests Grid / List -->
        <div id="organiser-requests-list" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="text-align: center; padding: 3rem;" class="jh-card">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Loading traveler requests...</p>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    if (!window.State.currentUser || !window.State.isOrganiser()) {
      window.Toast?.show('Organiser privileges required to access this portal.', 'warning');
      window.location.hash = '#/dashboard';
      return;
    }

    await this.fetchData();
    this.updateCounters();
    this.renderList();

    // Attach Real-Time Socket.IO listeners
    this.attachSocketListeners();

    // Start lightweight background polling (every 5 seconds) to guarantee synchronization across all three organisers
    this.clearIntervals();
    this.pollInterval = setInterval(async () => {
      await this.fetchData(true);
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

      window.socket.on('join_request_created', async () => {
        await this.fetchData(true);
        this.updateCounters();
        this.renderList();
        if (window.Toast) {
          window.Toast.show('New traveler join request received!', 'info');
        }
      });

      window.socket.on('join_request_updated', async () => {
        await this.fetchData(true);
        this.updateCounters();
        this.renderList();
      });
    }
  },

  async fetchData(silent = false) {
    const indicator = document.getElementById('org-sync-indicator');
    if (indicator && silent) indicator.style.display = 'inline-block';

    try {
      const res = await window.API.get('/api/join-requests/organiser-requests');
      this.requests = res?.requests || [];
    } catch (err) {
      if (!silent) {
        window.Toast?.show('Failed to fetch requests: ' + err.message, 'error');
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

    const elAll = document.getElementById('org-count-all');
    const elPen = document.getElementById('org-count-pending');
    const elApp = document.getElementById('org-count-approved');
    const elRej = document.getElementById('org-count-rejected');

    if (elAll) elAll.textContent = all;
    if (elPen) elPen.textContent = pending;
    if (elApp) elApp.textContent = approved;
    if (elRej) elRej.textContent = rejected;
  },

  renderList() {
    const container = document.getElementById('organiser-requests-list');
    if (!container) return;

    let filtered = this.requests;
    if (this.activeFilter !== 'all') {
      filtered = this.requests.filter(r => r.status === this.activeFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="jh-card" style="text-align: center; padding: 3.5rem 1rem;">
          <i class="fas fa-check-double" style="font-size: 2.8rem; color: var(--primary-teal); margin-bottom: 1rem;"></i>
          <h3 style="font-weight: 700; color: var(--text-main);">No ${this.activeFilter} requests</h3>
          <p style="color: var(--text-secondary); max-width: 400px; margin: 0.5rem auto 0 auto;">
            ${this.activeFilter === 'pending' 
              ? 'All traveler requests have been reviewed across your expeditions.' 
              : 'No join requests match this filter.'}
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(req => {
      const isMystery = req.tripType === 'mystery' || Boolean(req.mysteryTrip);
      const trip = isMystery ? (req.mysteryTrip || {}) : (req.trip || {});
      const traveler = req.user || {};
      const status = req.status || 'pending';
      const seatsRequested = req.seatsRequested || 1;
      const availableSeats = trip.availableSeats !== undefined ? trip.availableSeats : 0;
      const capacity = isMystery ? (trip.maxParticipants || 12) : (trip.capacity || 10);
      const hasEnoughCapacity = availableSeats >= seatsRequested;
      const reviewedByName = req.reviewedBy?.name || 'an Organiser';

      const dateStr = new Date(req.requestedAt || req.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="jh-card" style="padding: 1.25rem; border-left: 4px solid ${status === 'pending' ? 'var(--accent-orange, #f59e0b)' : status === 'approved' ? '#10b981' : '#ef4444'};">
          <div style="display: flex; gap: 1.25rem; flex-wrap: wrap; justify-content: space-between;">
            <!-- Traveler Info -->
            <div style="display: flex; gap: 1rem; align-items: flex-start; flex: 2; min-width: 300px;">
              <img src="${traveler.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}" 
                   style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0;">
                    ${traveler.name || 'Traveler'}
                  </h3>
                  <span class="badge ${status === 'approved' ? 'badge-success' : status === 'rejected' ? 'badge-danger' : 'badge-warning'}">
                    ${status.toUpperCase()}
                  </span>
                  ${isMystery ? `
                    <span class="badge" style="background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; font-size: 0.72rem;">
                      <i class="fas fa-mask"></i> Mystery Miles
                    </span>
                  ` : ''}
                </div>

                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">
                  <i class="far fa-envelope"></i> ${traveler.email || ''} 
                  ${traveler.phone ? `• <i class="fas fa-phone-alt"></i> ${traveler.phone}` : ''}
                </p>

                <!-- Trip Target Context -->
                <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; font-size: 0.85rem;">
                  <span style="font-weight: 600; color: var(--text-main);">
                    Trip: ${isMystery 
                      ? `<a href="#/mystery-trips" style="color: #6d28d9; font-weight: 700;">${trip.title || 'Mystery Expedition'}</a>`
                      : `<a href="#/trips/${trip._id}" style="color: var(--primary-teal); font-weight: 700;">${trip.title || 'Trip'}</a>`}
                  </span>

                  ${isMystery && trip.destinationSecret ? `
                    <span class="badge badge-purple" style="font-size: 0.72rem;">
                      <i class="fas fa-key"></i> Secret: ${trip.destinationSecret}
                    </span>
                  ` : !isMystery && trip.destination ? `
                    <span class="badge badge-navy" style="font-size: 0.72rem;">
                      <i class="fas fa-map-marker-alt"></i> ${trip.destination}
                    </span>
                  ` : ''}

                  <span class="badge badge-navy" style="font-size: 0.72rem;">
                    <i class="fas fa-chair"></i> ${seatsRequested} seat(s) requested
                  </span>
                  <span class="badge ${availableSeats > 0 ? 'badge-teal' : 'badge-danger'}" style="font-size: 0.72rem;">
                    Remaining: ${availableSeats} / ${capacity}
                  </span>
                </div>

                <!-- Traveler Note -->
                ${req.message ? `
                  <div style="margin-top: 0.6rem; font-size: 0.825rem; background: var(--bg-surface, #f8fafc); padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 2px solid var(--border-color); color: var(--text-secondary);">
                    <strong>Traveler Message:</strong> "${req.message}"
                  </div>
                ` : ''}

                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">
                  Submitted on ${dateStr}
                  ${status !== 'pending' && req.reviewedAt ? ` • Reviewed by <strong>${reviewedByName}</strong> on ${new Date(req.reviewedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
              </div>
            </div>

            <!-- Organiser Actions -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center; min-width: 150px;">
              ${status === 'pending' ? `
                <button class="btn btn-teal btn-sm" id="btn-approve-${req._id}" onclick="OrganiserRequestsPage.respondRequest('${req._id}', 'approved', ${hasEnoughCapacity}, ${seatsRequested}, ${availableSeats})">
                  <i class="fas fa-check"></i> Approve Traveler
                </button>
                <button class="btn btn-outline btn-sm" id="btn-decline-${req._id}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" onclick="OrganiserRequestsPage.openRejectModal('${req._id}')">
                  <i class="fas fa-times"></i> Decline
                </button>
              ` : status === 'approved' ? `
                <div style="text-align: center;">
                  <span class="badge badge-success" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <i class="fas fa-check-circle"></i> Confirmed
                  </span>
                  <div style="margin-top: 0.4rem;">
                    ${isMystery ? `
                      <a href="#/mystery-trips" class="btn btn-outline btn-sm" style="font-size: 0.75rem;">View Mystery Trip</a>
                    ` : `
                      <a href="#/trips/${trip._id}/members" class="btn btn-outline btn-sm" style="font-size: 0.75rem;">View Members</a>
                    `}
                  </div>
                </div>
              ` : `
                <div style="text-align: center;">
                  <span class="badge badge-danger" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
                    Declined
                  </span>
                  ${req.rejectionReason ? `<div style="font-size: 0.72rem; color: #ef4444; margin-top: 0.3rem;">Reason: ${req.rejectionReason}</div>` : ''}
                </div>
              `}
              <button class="btn btn-outline btn-sm" id="btn-delete-${req._id}" style="color: #64748b; border-color: #cbd5e1; font-size: 0.75rem; margin-top: 0.25rem;" onclick="OrganiserRequestsPage.confirmDelete('${req._id}')" title="Delete this join request">
                <i class="fas fa-trash-alt"></i> Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async respondRequest(requestId, decision, hasCapacity, seatsRequested, availableSeats) {
    if (decision === 'approved' && !hasCapacity) {
      if (!confirm(`Warning: Only ${availableSeats} seat(s) remain, but ${seatsRequested} were requested. Approving will exceed capacity limit. Proceed anyway?`)) {
        return;
      }
    }

    const btn = document.getElementById(`btn-approve-${requestId}`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width: 12px; height: 12px; display: inline-block;"></span> Approving...`;
    }

    try {
      await window.API.patch(`/api/join-requests/${requestId}`, {
        status: decision
      });

      window.Toast?.show(`Traveler request marked as ${decision}! Synchronized for all organisers.`, 'success');
      await this.fetchData(true);
      this.updateCounters();
      this.renderList();
      if (window.State?.loadNotificationsCount) {
        window.State.loadNotificationsCount();
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-check"></i> Approve Traveler`;
      }
      window.Toast?.show('Could not update request: ' + err.message, 'error');
    }
  },

  openRejectModal(requestId) {
    const reason = prompt('Please enter a brief note for declining this request (optional):');
    if (reason === null) return; // User pressed Cancel
    this.executeDecline(requestId, reason);
  },

  async executeDecline(requestId, reason) {
    const btn = document.getElementById(`btn-decline-${requestId}`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width: 12px; height: 12px; display: inline-block;"></span>`;
    }

    try {
      await window.API.patch(`/api/join-requests/${requestId}`, {
        status: 'rejected',
        rejectionReason: reason || 'Seats could not be allocated at this time.'
      });

      window.Toast?.show('Request declined and status synchronized for all organisers.', 'info');
      await this.fetchData(true);
      this.updateCounters();
      this.renderList();
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-times"></i> Decline`;
      }
      window.Toast?.show('Could not decline request: ' + err.message, 'error');
    }
  },

  confirmDelete(requestId) {
    window.Modal.confirm({
      title: 'Delete Join Request?',
      message: 'Are you sure you want to permanently delete this join request record? This action cannot be undone.',
      confirmText: 'Delete Request',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        const btn = document.getElementById(`btn-delete-${requestId}`);
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<span class="spinner" style="width: 12px; height: 12px; display: inline-block;"></span>`;
        }
        try {
          const res = await window.API.delete(`/api/join-requests/${requestId}`);
          window.Toast?.show(res.message || 'Join request deleted successfully.', 'info');
          await this.fetchData(true);
          this.updateCounters();
          this.renderList();
        } catch (err) {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-trash-alt"></i> Delete`;
          }
          window.Toast?.show('Could not delete request: ' + err.message, 'error');
        }
      }
    });
  },

  confirmClearAll() {
    window.Modal.confirm({
      title: 'Clear All Join Requests?',
      message: 'Are you sure you want to clear all join requests for your expeditions? Only requests for expeditions you organise will be cleared.',
      confirmText: 'Clear All Requests',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        const btn = document.getElementById('btn-clear-all-requests');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<span class="spinner" style="width: 12px; height: 12px; display: inline-block;"></span> Clearing...`;
        }
        try {
          const res = await window.API.delete('/api/join-requests/clear-all');
          window.Toast?.show(res.message || 'All join requests cleared for your expeditions.', 'success');
          await this.fetchData(true);
          this.updateCounters();
          this.renderList();
        } catch (err) {
          window.Toast?.show('Could not clear requests: ' + err.message, 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-trash-alt"></i> Clear All`;
          }
        }
      }
    });
  }
};

window.OrganiserRequestsPage = OrganiserRequestsPage;
