/**
 * Page: Organiser Trips Management
 * Professional workspace for tour organisers to manage trips, seat quotas, and itineraries.
 */
const OrganiserTripsPage = {
  trips: [],

  render() {
    return `
      <div class="page-container">
        <!-- Header -->
        <div class="jh-card" style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-left: 4px solid var(--primary-teal);">
          <div>
            <span class="badge badge-teal" style="margin-bottom: 0.35rem;">Organiser Control Panel</span>
            <h1 style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 800; color: var(--text-main);">
              Manage Organised Expeditions
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 0.25rem;">
              Track reservations, seat capacities, daily itineraries, and traveler enrollments across your trips.
            </p>
          </div>
          <div>
            <a href="#/trips/create" class="btn btn-teal btn-lg" style="box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
              <i class="fas fa-plus-circle"></i> Create New Trip
            </a>
          </div>
        </div>

        <!-- Quick Metrics -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
          <div class="jh-card" style="padding: 1.25rem;">
            <div style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Total Expeditions</div>
            <div id="stat-total-trips" style="font-size: 2rem; font-weight: 800; color: var(--text-main); margin-top: 0.25rem;">0</div>
          </div>

          <div class="jh-card" style="padding: 1.25rem;">
            <div style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Total Seats Offered</div>
            <div id="stat-total-seats" style="font-size: 2rem; font-weight: 800; color: var(--primary-teal); margin-top: 0.25rem;">0</div>
          </div>

          <div class="jh-card" style="padding: 1.25rem;">
            <div style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Available Remaining</div>
            <div id="stat-remaining-seats" style="font-size: 2rem; font-weight: 800; color: var(--accent-orange, #f59e0b); margin-top: 0.25rem;">0</div>
          </div>

          <div class="jh-card" style="padding: 1.25rem;">
            <div style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Active Travelers</div>
            <div id="stat-confirmed-travelers" style="font-size: 2rem; font-weight: 800; color: #10b981; margin-top: 0.25rem;">0</div>
          </div>
        </div>

        <!-- Trips List -->
        <div id="organiser-trips-list" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="text-align: center; padding: 3rem;" class="jh-card">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Loading your expeditions...</p>
          </div>
        </div>
      </div>
    `;
  },

  pollInterval: null,
  socketAttached: false,

  async mount() {
    if (!window.State.currentUser || !window.State.isOrganiser()) {
      window.Toast?.show('Organiser role required.', 'warning');
      window.location.hash = '#/dashboard';
      return;
    }
    await this.fetchTrips();
    this.updateStats();
    this.renderTrips();
    this.attachSocket();

    this.clearIntervals();
    this.pollInterval = setInterval(async () => {
      await this.fetchTrips(true);
      this.updateStats();
      this.renderTrips();
    }, 6000);
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

  attachSocket() {
    if (window.socket && !this.socketAttached) {
      this.socketAttached = true;
      window.socket.on('trip_published', async () => {
        await this.fetchTrips(true);
        this.updateStats();
        this.renderTrips();
      });
      window.socket.on('trip_unpublished', async () => {
        await this.fetchTrips(true);
        this.updateStats();
        this.renderTrips();
      });
    }
  },

  async fetchTrips(silent = false) {
    try {
      const res = await window.API.get('/api/trips?myTrips=true');
      this.trips = res?.trips || [];
    } catch (err) {
      if (!silent) {
        window.Toast?.show('Failed to fetch trips: ' + err.message, 'error');
      }
    }
  },

  updateStats() {
    const total = this.trips.length;
    let totalCap = 0;
    let totalAvail = 0;
    let totalConfirmed = 0;

    this.trips.forEach(t => {
      const cap = t.capacity || 10;
      const avail = t.availableSeats !== undefined ? t.availableSeats : Math.max(0, cap - (t.members?.length || 1));
      totalCap += cap;
      totalAvail += avail;
      totalConfirmed += Math.max(0, cap - avail);
    });

    const elTotal = document.getElementById('stat-total-trips');
    const elSeats = document.getElementById('stat-total-seats');
    const elRem = document.getElementById('stat-remaining-seats');
    const elConf = document.getElementById('stat-confirmed-travelers');

    if (elTotal) elTotal.textContent = total;
    if (elSeats) elSeats.textContent = totalCap;
    if (elRem) elRem.textContent = totalAvail;
    if (elConf) elConf.textContent = totalConfirmed;
  },

  renderTrips() {
    const container = document.getElementById('organiser-trips-list');
    if (!container) return;

    if (this.trips.length === 0) {
      container.innerHTML = `
        <div class="jh-card" style="text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-map-marked-alt" style="font-size: 3.5rem; color: var(--primary-teal); margin-bottom: 1rem;"></i>
          <h2 style="font-weight: 800; color: var(--text-main);">No Trips Created Yet</h2>
          <p style="color: var(--text-secondary); max-width: 480px; margin: 0.5rem auto 1.5rem auto;">
            Launch your first group expedition! Define destinations, set capacity and price, and start accepting traveler join requests.
          </p>
          <a href="#/trips/create" class="btn btn-teal btn-lg">
            <i class="fas fa-plus-circle"></i> Create Your First Trip
          </a>
        </div>
      `;
      return;
    }

    const currentUserId = window.State.currentUser?._id?.toString() || '';

    container.innerHTML = this.trips.map(trip => {
      const cap = trip.capacity || 10;
      const avail = trip.availableSeats !== undefined ? trip.availableSeats : Math.max(0, cap - (trip.members?.length || 1));
      const confirmed = Math.max(0, cap - avail);
      const price = trip.price || trip.estimatedBudget || 0;
      const currency = trip.currency || 'INR';
      const creatorId = (trip.createdBy?._id || trip.createdBy)?.toString() || '';
      const organiserId = (trip.organiserId?._id || trip.organiserId)?.toString() || '';
      const isOwner = trip.userRole === 'owner' || (currentUserId && (creatorId === currentUserId || organiserId === currentUserId));

      return `
        <div class="jh-card" role="button" tabindex="0" onclick="OrganiserTripsPage.navigateToTrip('${trip._id}')" style="padding: 1.25rem; cursor: pointer;">
          <div style="display: flex; gap: 1.25rem; flex-wrap: wrap; justify-content: space-between; align-items: center;">
            <!-- Trip Header & Image -->
            <div style="display: flex; gap: 1rem; align-items: center; flex: 2; min-width: 300px;">
              <img src="${trip.coverImage || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=300&q=80'}" 
                   style="width: 100px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem;">
                  <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin: 0;">
                    ${trip.title}
                  </h3>
                  <span class="badge ${trip.status === 'upcoming' ? 'badge-teal' : trip.status === 'ongoing' ? 'badge-warning' : 'badge-navy'}">
                    ${trip.status}
                  </span>
                  ${trip.isPublished ? `<span class="badge badge-success"><i class="fas fa-globe"></i> Published</span>` : `<span class="badge badge-navy">Draft</span>`}
                  ${isOwner ? `<span class="badge badge-orange">Owner</span>` : `<span class="badge badge-navy">Manager</span>`}
                </div>

                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
                  <i class="fas fa-map-marker-alt" style="color: var(--accent-orange, #f59e0b);"></i> ${trip.destination} • 
                  ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}
                </p>

                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.8rem; color: var(--text-muted);">
                  <span><strong>Capacity:</strong> ${cap} seats</span>
                  <span><strong>Available:</strong> <span style="color: var(--primary-teal); font-weight: 700;">${avail}</span> seats left</span>
                  <span><strong>Price:</strong> ${window.formatCurrency(price, currency)}</span>
                </div>
              </div>
            </div>

            <!-- Organiser Control Actions -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              ${isOwner ? (trip.isPublished ? `
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); OrganiserTripsPage.togglePublish('${trip._id}', false)" title="Unpublish / Move to Drafts">
                  <i class="fas fa-eye-slash"></i> Unpublish
                </button>
              ` : `
                <button class="btn btn-teal btn-sm" onclick="event.stopPropagation(); OrganiserTripsPage.togglePublish('${trip._id}', true)" title="Publish to Explore Directory">
                  <i class="fas fa-globe"></i> Publish
                </button>
              `) : ''}
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); OrganiserTripsPage.navigateToTrip('${trip._id}')" title="View Full Trip Dashboard">
                <i class="fas fa-door-open"></i> Workspace
              </button>
              <a href="#/trips/${trip._id}/itinerary" onclick="event.stopPropagation();" class="btn btn-outline btn-sm" title="Manage Itinerary Activities">
                <i class="fas fa-calendar-alt"></i> Itinerary
              </a>
              <a href="#/organiser-requests" onclick="event.stopPropagation();" class="btn btn-teal btn-sm" title="Review Traveler Join Requests">
                <i class="fas fa-user-check"></i> Requests
              </a>
              ${isOwner ? `
                <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" onclick="event.stopPropagation(); OrganiserTripsPage.deleteTrip('${trip._id}', '${trip.title.replace(/'/g, "\\'")}')" title="Delete Trip">
                  <i class="fas fa-trash-alt"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  navigateToTrip(tripId) {
    if (!tripId) return;
    if (window.State && typeof window.State.setCurrentTripId === 'function') {
      window.State.setCurrentTripId(tripId);
    }
    window.location.hash = `#/trips/${tripId}`;
  },

  async togglePublish(tripId, shouldPublish) {
    try {
      const endpoint = `/api/trips/${tripId}/${shouldPublish ? 'publish' : 'unpublish'}`;
      const res = await window.API.post(endpoint);
      window.Toast?.show(res.message || `Expedition ${shouldPublish ? 'published' : 'moved to drafts'} successfully!`, 'success');
      await this.fetchTrips();
      this.updateStats();
      this.renderTrips();
    } catch (err) {
      window.Toast?.show('Could not update publication status: ' + err.message, 'error');
    }
  },

  async deleteTrip(tripId, tripTitle) {
    if (!confirm(`Are you sure you want to cancel and delete "${tripTitle}"? This will remove all associated itinerary and request records.`)) {
      return;
    }

    try {
      await window.API.delete(`/api/trips/${tripId}`);
      window.Toast?.show('Trip deleted successfully.', 'info');
      await this.fetchTrips();
      this.updateStats();
      this.renderTrips();
    } catch (err) {
      window.Toast?.show('Could not delete trip: ' + err.message, 'error');
    }
  }
};

window.OrganiserTripsPage = OrganiserTripsPage;
