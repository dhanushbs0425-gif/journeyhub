/**
 * Page 5: Main Dashboard
 * Role-aware dashboard: Organiser metrics vs Traveler enrolled journeys.
 * Displays live join requests synchronization across all three organisers and travelers.
 */
const DashboardPage = {
  currentFilter: 'all',
  searchQuery: '',
  pollInterval: null,
  socketAttached: false,

  async render() {
    const isOrganiser = window.State.isOrganiser();
    const user = window.State.currentUser;

    let headerActionsHtml = '';
    if (isOrganiser) {
      headerActionsHtml = `
        <a href="#/trips/create" class="btn btn-teal"><i class="fas fa-plus-circle"></i> Create Trip</a>
        <a href="#/organiser-requests" class="btn btn-outline" id="dash-btn-requests">
          <i class="fas fa-user-check"></i> Join Requests 
          <span id="dash-pending-badge" class="badge badge-warning" style="display: none; margin-left: 0.35rem; font-size: 0.75rem;">0</span>
        </a>
      `;
    } else {
      headerActionsHtml = `
        <a href="#/explore-trips" class="btn btn-teal"><i class="fas fa-compass"></i> Explore Published Trips</a>
        <a href="#/my-requests" class="btn btn-outline"><i class="fas fa-paper-plane"></i> My Requests</a>
      `;
    }

    return `
      <div class="dashboard-page">
        <!-- Top Metrics & Action Row -->
        <div class="page-header" style="border-left: 4px solid ${isOrganiser ? 'var(--primary-teal)' : '#6366f1'}; padding-left: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge ${isOrganiser ? 'badge-teal' : 'badge-navy'}">
                ${isOrganiser ? 'Organiser Control Center' : 'Traveler Portal'}
              </span>
            </div>
            <h1 class="page-title">${isOrganiser ? 'Organised Expeditions Hub' : 'My Enrolled Journeys'}</h1>
            <p class="page-subtitle">
              ${isOrganiser 
                ? 'Manage trip itineraries, review shared traveler applications, and monitor seat allocations.' 
                : 'Access active trip itineraries, packing checklists, expense trackers, and travel diaries.'}
            </p>
          </div>
          <div class="page-actions">
            ${headerActionsHtml}
          </div>
        </div>

        <!-- Join Requests Real-Time Alert Banner -->
        <div id="dash-requests-banner" style="margin-bottom: 1.5rem;"></div>

        <!-- Filter & Search Controls -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div class="tabs-header" style="margin-bottom: 0;">
            ${isOrganiser ? `
              <button class="tab-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="DashboardPage.setFilter('all', this)">All Expeditions</button>
              <button class="tab-btn ${this.currentFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming" onclick="DashboardPage.setFilter('upcoming', this)">Upcoming</button>
              <button class="tab-btn ${this.currentFilter === 'ongoing' ? 'active' : ''}" data-filter="ongoing" onclick="DashboardPage.setFilter('ongoing', this)">Ongoing</button>
              <button class="tab-btn ${this.currentFilter === 'completed' ? 'active' : ''}" data-filter="completed" onclick="DashboardPage.setFilter('completed', this)">Completed</button>
            ` : `
              <button class="tab-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="DashboardPage.setFilter('all', this)">All Trips</button>
              <button class="tab-btn ${this.currentFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming" onclick="DashboardPage.setFilter('upcoming', this)">Upcoming Trips</button>
              <button class="tab-btn ${this.currentFilter === 'ongoing' ? 'active' : ''}" data-filter="ongoing" onclick="DashboardPage.setFilter('ongoing', this)">Ongoing Trips</button>
              <button class="tab-btn ${this.currentFilter === 'completed' ? 'active' : ''}" data-filter="completed" onclick="DashboardPage.setFilter('completed', this)">Completed Trips</button>
            `}
          </div>

          <div style="position: relative; width: 280px;">
            <i class="fas fa-search" style="position: absolute; left: 12px; top: 12px; color: var(--text-muted); font-size: 0.85rem;"></i>
            <input type="text" id="trip-search-input" class="form-control" placeholder="Search destination, trip..." style="padding-left: 2rem;" />
          </div>
        </div>

        <!-- Trips List Container -->
        <div id="trips-list-container">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount() {
    const searchInput = document.getElementById('trip-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        DashboardPage.searchQuery = e.target.value.trim();
        DashboardPage.loadTripsList();
      });
    }

    await DashboardPage.loadTripsList();
    await DashboardPage.loadRequestsSummary();

    this.attachSocket();

    if (this._awakeHandler) {
      window.removeEventListener('backend_awake', this._awakeHandler);
    }
    this._awakeHandler = () => {
      DashboardPage.loadTripsList(true);
      DashboardPage.loadRequestsSummary(true);
    };
    window.addEventListener('backend_awake', this._awakeHandler);

    this.clearIntervals();
    this.pollInterval = setInterval(async () => {
      await DashboardPage.loadRequestsSummary(true);
    }, 6000);
  },

  destroy() {
    this.clearIntervals();
    if (this._awakeHandler) {
      window.removeEventListener('backend_awake', this._awakeHandler);
      this._awakeHandler = null;
    }
  },

  clearIntervals() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },

  attachSocket() {
    if (window.socket && !this.socketAttached) {
      this.socketAttached = true;
      window.socket.on('join_request_created', async () => {
        await DashboardPage.loadRequestsSummary(true);
      });
      window.socket.on('join_request_updated', async () => {
        await DashboardPage.loadRequestsSummary(true);
        await DashboardPage.loadTripsList(true);
      });
      window.socket.on('trip_published', async (data) => {
        console.log('[Dashboard] Real-time event: trip_published', data.trip?.title);
        await DashboardPage.loadTripsList(true);
      });
      window.socket.on('trip_unpublished', async () => {
        console.log('[Dashboard] Real-time event: trip_unpublished');
        await DashboardPage.loadTripsList(true);
      });
    }
  },

  async loadRequestsSummary(silent = false) {
    const isOrganiser = window.State.isOrganiser();
    const banner = document.getElementById('dash-requests-banner');
    if (!banner) return;

    if (isOrganiser) {
      try {
        const res = await window.API.get('/api/join-requests/organiser-requests');
        const pendingCount = res?.pendingCount || (res?.requests || []).filter(r => r.status === 'pending').length;
        const badge = document.getElementById('dash-pending-badge');
        if (badge) {
          if (pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.style.display = 'inline-block';
          } else {
            badge.style.display = 'none';
          }
        }

        if (pendingCount > 0) {
          banner.innerHTML = `
            <div class="jh-card" style="padding: 1rem 1.25rem; background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #fde68a; display: flex; align-items: center; justify-content: center; color: #b45309; font-size: 1.1rem;">
                  <i class="fas fa-bell"></i>
                </div>
                <div>
                  <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #92400e;">
                    ${pendingCount} Traveler Join Request${pendingCount > 1 ? 's' : ''} Awaiting Review
                  </h4>
                  <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: #b45309;">
                    Shared with all organisers (Sai, Dhanush, Divya). Review traveler requests and allocate seats.
                  </p>
                </div>
              </div>
              <div>
                <a href="#/organiser-requests" class="btn btn-warning btn-sm" style="font-weight: 700;">
                  <i class="fas fa-user-check"></i> Review Requests (${pendingCount})
                </a>
              </div>
            </div>
          `;
        } else {
          banner.innerHTML = '';
        }
      } catch (err) {
        if (!silent) console.warn('[Dashboard] Could not fetch organiser requests:', err);
      }
    } else {
      // Traveler view
      try {
        const res = await window.API.get('/api/join-requests/my-requests');
        const requests = res?.requests || [];
        const pending = requests.filter(r => r.status === 'pending');
        const approved = requests.filter(r => r.status === 'approved');

        if (requests.length > 0) {
          banner.innerHTML = `
            <div class="jh-card" style="padding: 1rem 1.25rem; background: var(--bg-surface, #f8fafc); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(13,148,136,0.1); display: flex; align-items: center; justify-content: center; color: var(--primary-teal); font-size: 1.1rem;">
                  <i class="fas fa-paper-plane"></i>
                </div>
                <div>
                  <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
                    My Trip Applications (${requests.length})
                  </h4>
                  <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                    ${pending.length} Pending review • ${approved.length} Confirmed journeys
                  </p>
                </div>
              </div>
              <div>
                <a href="#/my-requests" class="btn btn-outline btn-sm">
                  <i class="fas fa-list"></i> Track My Requests
                </a>
              </div>
            </div>
          `;
        } else {
          banner.innerHTML = '';
        }
      } catch (err) {
        if (!silent) console.warn('[Dashboard] Could not fetch traveler requests:', err);
      }
    }
  },

  setFilter(filter, btn) {
    DashboardPage.currentFilter = filter;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    DashboardPage.loadTripsList();
  },

  async loadTripsList(silent = false) {
    const container = document.getElementById('trips-list-container');
    if (!container) return;

    const isOrganiser = window.State.isOrganiser();

    try {
      let endpoint = `/api/trips?status=${DashboardPage.currentFilter}`;
      if (DashboardPage.searchQuery) {
        endpoint += `&q=${encodeURIComponent(DashboardPage.searchQuery)}`;
      }

      const res = await window.API.get(endpoint);
      const trips = res.trips || [];

      if (trips.length === 0) {
        let emptyTitle = 'No trips found';
        let emptyText = 'No trips available in this category.';
        let emptyAction = `<a href="#/explore-trips" class="btn btn-teal"><i class="fas fa-compass"></i> Explore Published Trips</a>`;

        if (isOrganiser) {
          if (DashboardPage.currentFilter === 'upcoming') {
            emptyTitle = 'No upcoming expeditions';
            emptyText = 'You have no upcoming expeditions scheduled. Create a new trip to launch a workspace!';
          } else if (DashboardPage.currentFilter === 'ongoing') {
            emptyTitle = 'No ongoing expeditions';
            emptyText = 'You currently have no active expeditions in progress.';
          } else if (DashboardPage.currentFilter === 'completed') {
            emptyTitle = 'No completed expeditions';
            emptyText = 'You have not completed any expeditions yet.';
          } else {
            emptyTitle = 'No expeditions found';
            emptyText = 'You have not created or managed any expeditions in this category yet.';
          }
          emptyAction = `<a href="#/trips/create" class="btn btn-teal"><i class="fas fa-plus"></i> Create New Trip</a>`;
        } else {
          if (DashboardPage.currentFilter === 'upcoming') {
            emptyTitle = 'No upcoming trips';
            emptyText = 'You have no upcoming trips scheduled. Discover published expeditions and request to join!';
            emptyAction = `<a href="#/explore-trips" class="btn btn-teal"><i class="fas fa-compass"></i> Explore Published Trips</a>`;
          } else if (DashboardPage.currentFilter === 'ongoing') {
            emptyTitle = 'No ongoing trips';
            emptyText = 'You currently have no active expeditions in progress.';
            emptyAction = `<a href="#/explore-trips" class="btn btn-teal"><i class="fas fa-compass"></i> Explore Published Trips</a>`;
          } else if (DashboardPage.currentFilter === 'completed') {
            emptyTitle = 'No completed trips';
            emptyText = 'You have not completed any expeditions yet. Join a journey to start building your travel diary!';
            emptyAction = `<a href="#/explore-trips" class="btn btn-teal"><i class="fas fa-compass"></i> Explore Published Trips</a>`;
          } else {
            emptyTitle = 'No trips joined yet';
            emptyText = "You haven't joined any trips yet. Discover exciting journeys published by verified organisers and join the adventure!";
            emptyAction = `<a href="#/explore-trips" class="btn btn-teal"><i class="fas fa-compass"></i> Explore Published Trips</a>`;
          }
        }

        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-map-marked-alt"></i></div>
            <h3 class="empty-state-title">${emptyTitle}</h3>
            <p class="empty-state-text">${emptyText}</p>
            ${emptyAction}
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="trips-grid">
          ${trips.map(trip => {
            const start = new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const end = new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const statusClass = trip.status === 'ongoing' ? 'badge-teal' : trip.status === 'completed' ? 'badge-success' : 'badge-navy';
            const price = trip.price || trip.estimatedBudget || 0;
            const currency = trip.currency || 'INR';

            let roleBadgeHtml = '';

            if (isOrganiser) {
              const isOwner = trip.userRole === 'owner';
              roleBadgeHtml = `<span class="badge ${isOwner ? 'badge-orange' : 'badge-navy'}">${isOwner ? 'Creator' : 'Organiser'}</span>`;
            } else {
              // Regular Traveler
              if (trip.isMember) {
                roleBadgeHtml = `<span class="badge badge-success"><i class="fas fa-check-circle"></i> Confirmed Traveler</span>`;
              } else if (trip.joinRequestStatus === 'pending') {
                roleBadgeHtml = `<span class="badge badge-warning"><i class="fas fa-clock"></i> Request Pending</span>`;
              } else if (trip.availableSeats > 0) {
                roleBadgeHtml = `<span class="badge badge-teal">${trip.availableSeats} Seats Left</span>`;
              } else {
                roleBadgeHtml = `<span class="badge badge-danger">Sold Out</span>`;
              }
            }

            const coverImg = window.DestinationImages ? window.DestinationImages.getTripCoverImage(trip) : (trip.coverImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80');
            const safeDest = (trip.destination || '').replace(/'/g, "\\'");
            const safeTitle = (trip.title || '').replace(/'/g, "\\'");

            return `
              <div class="trip-card" role="button" tabindex="0" onclick="DashboardPage.selectAndNavigate('${trip._id}')" style="cursor: pointer;">
                <img src="${coverImg}" class="trip-card-img" alt="${trip.title}" style="object-fit: cover; width: 100%; height: 180px;" onerror="if(window.DestinationImages){window.DestinationImages.handleImageError(this, '${safeDest}', '${safeTitle}');}" loading="lazy" />
                <div class="trip-card-body">
                  <div class="trip-card-badges">
                    <span class="badge ${statusClass}">${trip.status}</span>
                    ${roleBadgeHtml}
                  </div>

                  <h3 class="trip-card-title">${trip.title}</h3>
                  <p class="trip-card-dest"><i class="fas fa-map-marker-alt"></i> ${trip.destination}</p>
                  <p class="trip-card-dates"><i class="far fa-calendar-alt"></i> ${start} – ${end}</p>

                  <div class="trip-card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <div>
                      <div class="trip-budget-label">${isOrganiser ? 'Price / Seat' : 'Trip Cost'}</div>
                      <div class="trip-budget-amount">${window.formatCurrency(price, currency)}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                      <a href="#/trips/${trip._id}" class="btn btn-teal btn-sm" onclick="event.stopPropagation(); DashboardPage.selectAndNavigate('${trip._id}')" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                        <i class="fas fa-door-open"></i> Workspace <i class="fas fa-arrow-right" style="font-size: 0.75rem;"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (err) {
      if (!silent) {
        if (window.API && window.API.renderRetryCard) {
          window.API.renderRetryCard(container, err.message, () => DashboardPage.loadTripsList());
        } else {
          container.innerHTML = `
            <div class="empty-state">
              <p style="color: var(--danger);">Failed to load trips: ${err.message}</p>
              <button class="btn btn-outline btn-sm" onclick="DashboardPage.loadTripsList()" style="margin-top: 0.5rem;"><i class="fas fa-redo"></i> Retry</button>
            </div>
          `;
        }
      }
    }
  },

  selectAndNavigate(tripId) {
    if (!tripId) return;
    try {
      if (window.State && typeof window.State.setCurrentTripId === 'function') {
        window.State.setCurrentTripId(tripId);
      } else if (window.State && typeof window.State.setCurrentTrip === 'function') {
        window.State.setCurrentTrip({ _id: tripId });
      }
    } catch (e) {
      console.warn('Could not update active trip state:', e);
    }
    window.location.hash = `#/trips/${tripId}`;
  }
};

window.DashboardPage = DashboardPage;
