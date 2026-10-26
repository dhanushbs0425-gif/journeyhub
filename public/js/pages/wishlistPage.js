/**
 * Page: My Travel Wishlist
 * Displays traveler saved trips and destinations with direct booking, guide access, and remove options.
 */
const WishlistPage = {
  activeTab: 'trips',
  savedTrips: [],
  savedDestinations: [],

  render() {
    return `
      <div class="page-container">
        <!-- Header -->
        <div class="jh-card" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-left: 4px solid #ef4444;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-navy"><i class="fas fa-heart" style="color: #ef4444;"></i> Saved Bucket List</span>
            </div>
            <h1 style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.35rem 0;">
              My Travel Wishlist
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">
              Keep track of expeditions and incredible Indian destinations you want to experience next.
            </p>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <a href="#/explore" class="btn btn-teal btn-md">
              <i class="fas fa-compass"></i> Discover Trips
            </a>
            <a href="#/destinations" class="btn btn-outline btn-md">
              <i class="fas fa-map-marked-alt"></i> Indian Catalog
            </a>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          <button class="btn btn-md ${this.activeTab === 'trips' ? 'btn-teal' : 'btn-outline'}" id="wishlist-tab-trips" onclick="WishlistPage.switchTab('trips')">
            <i class="fas fa-route"></i> Saved Expeditions (<span id="wishlist-trips-count">0</span>)
          </button>
          <button class="btn btn-md ${this.activeTab === 'destinations' ? 'btn-teal' : 'btn-outline'}" id="wishlist-tab-destinations" onclick="WishlistPage.switchTab('destinations')">
            <i class="fas fa-map-pin"></i> Saved Destinations (<span id="wishlist-dests-count">0</span>)
          </button>
        </div>

        <!-- Wishlist Grid -->
        <div id="wishlist-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;" class="jh-card">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Loading your saved wishlist...</p>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    if (!window.State.currentUser) {
      window.Toast?.show('Please log in to view your wishlist.', 'warning');
      window.location.hash = '#/login';
      return;
    }
    await this.fetchWishlist();
    this.renderGrid();
  },

  switchTab(tab) {
    this.activeTab = tab;
    const tripsBtn = document.getElementById('wishlist-tab-trips');
    const destsBtn = document.getElementById('wishlist-tab-destinations');
    if (tripsBtn && destsBtn) {
      if (tab === 'trips') {
        tripsBtn.className = 'btn btn-md btn-teal';
        destsBtn.className = 'btn btn-md btn-outline';
      } else {
        tripsBtn.className = 'btn btn-md btn-outline';
        destsBtn.className = 'btn btn-md btn-teal';
      }
    }
    this.renderGrid();
  },

  async fetchWishlist() {
    try {
      const res = await window.API.get('/api/wishlist');
      this.savedTrips = res?.trips || [];
      this.savedDestinations = res?.destinations || [];

      // Update counters
      const tripsCount = document.getElementById('wishlist-trips-count');
      const destsCount = document.getElementById('wishlist-dests-count');
      if (tripsCount) tripsCount.textContent = this.savedTrips.length;
      if (destsCount) destsCount.textContent = this.savedDestinations.length;
    } catch (err) {
      window.Toast?.show('Failed to fetch wishlist: ' + err.message, 'error');
    }
  },

  renderGrid() {
    const container = document.getElementById('wishlist-grid');
    if (!container) return;

    if (this.activeTab === 'trips') {
      this.renderTripsGrid(container);
    } else {
      this.renderDestinationsGrid(container);
    }
  },

  renderTripsGrid(container) {
    if (this.savedTrips.length === 0) {
      container.innerHTML = `
        <div class="jh-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-heart-broken" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
          <h2 style="font-weight: 800; color: var(--text-main);">No Saved Expeditions Yet</h2>
          <p style="color: var(--text-secondary); max-width: 440px; margin: 0.5rem auto 1.5rem auto;">
            Browse published journeys and tap the heart icon on any trip card to save it to your bucket list!
          </p>
          <a href="#/explore" class="btn btn-teal btn-lg">
            <i class="fas fa-compass"></i> Discover Published Trips
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = this.savedTrips.map(trip => {
      const cover = window.DestinationImages ? window.DestinationImages.getTripCoverImage(trip) : (trip.coverImage || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80');
      const price = trip.price || trip.estimatedBudget || 15000;
      const currency = trip.currency || 'INR';
      const availableSeats = trip.availableSeats !== undefined ? trip.availableSeats : 5;

      return `
        <div class="jh-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
          <div style="position: relative; height: 180px; overflow: hidden; background: #1e293b;">
            <img src="${cover}" alt="${trip.title}" style="width: 100%; height: 100%; object-fit: cover;" 
                 onerror="if(window.DestinationImages){window.DestinationImages.handleImageError(this, '${(trip.destination || '').replace(/'/g, "\\'")}', '${(trip.title || '').replace(/'/g, "\\'")}');}" />
            
            <div style="position: absolute; top: 0.75rem; left: 0.75rem;">
              <span class="badge ${availableSeats > 0 ? 'badge-teal' : 'badge-danger'}">
                <i class="fas fa-chair" style="margin-right: 0.3rem;"></i> ${availableSeats > 0 ? `${availableSeats} Seats Left` : 'Sold Out'}
              </span>
            </div>

            <button class="icon-btn" onclick="WishlistPage.removeTrip('${trip._id}')" 
                    title="Remove from wishlist"
                    style="position: absolute; top: 0.75rem; right: 0.75rem; background: rgba(255, 255, 255, 0.95); width: 34px; height: 34px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
              <i class="fas fa-heart" style="color: #ef4444; font-size: 0.95rem;"></i>
            </button>

            <div style="position: absolute; bottom: 0.75rem; left: 0.75rem;">
              <span class="badge badge-navy" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);">
                <i class="fas fa-map-marker-alt" style="color: var(--accent-orange, #f59e0b); margin-right: 0.3rem;"></i> ${trip.destination}
              </span>
            </div>
          </div>

          <div style="padding: 1.25rem; display: flex; flex-direction: column; flex-grow: 1;">
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">
              <a href="#/trips/${trip._id}" style="color: inherit; text-decoration: none;">${trip.title}</a>
            </h3>

            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${trip.description || 'Explore scenic wonders, local heritage, and cultural feasts.'}
            </p>

            <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Trip Price</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary-teal);">
                  ${window.formatCurrency(price, currency)}
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem;">
                <a href="#/trips/${trip._id}" class="btn btn-teal btn-sm">
                  <i class="fas fa-eye"></i> View Itinerary
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderDestinationsGrid(container) {
    if (this.savedDestinations.length === 0) {
      container.innerHTML = `
        <div class="jh-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-heart-broken" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
          <h2 style="font-weight: 800; color: var(--text-main);">No Saved Destinations Yet</h2>
          <p style="color: var(--text-secondary); max-width: 440px; margin: 0.5rem auto 1.5rem auto;">
            Browse our 72 Incredible Indian destinations and tap the heart icon on any destination to save it here!
          </p>
          <a href="#/destinations" class="btn btn-teal btn-lg">
            <i class="fas fa-compass"></i> Discover Indian Destinations
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = this.savedDestinations.map(dest => {
      return `
        <div class="jh-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
          <div style="position: relative; height: 180px; overflow: hidden;">
            <img src="${dest.imageUrl || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=500&q=80'}" 
                 style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; top: 0.75rem; left: 0.75rem;">
              <span class="badge badge-teal">${dest.category || 'Travel'}</span>
            </div>
            <button class="icon-btn" onclick="WishlistPage.removeDestination('${dest._id}')" 
                    title="Remove from wishlist"
                    style="position: absolute; top: 0.75rem; right: 0.75rem; background: rgba(255, 255, 255, 0.95); width: 34px; height: 34px; border-radius: 50%;">
              <i class="fas fa-trash-alt" style="color: #ef4444; font-size: 0.85rem;"></i>
            </button>
            <div style="position: absolute; bottom: 0.75rem; left: 0.75rem;">
              <span class="badge badge-navy" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);">
                <i class="fas fa-map-marker-alt" style="color: var(--accent-orange, #f59e0b);"></i> ${dest.state || dest.city || 'India'}
              </span>
            </div>
          </div>

          <div style="padding: 1.25rem; display: flex; flex-direction: column; flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
              <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin: 0;">${dest.name}</h3>
              <span style="font-size: 0.8rem; font-weight: 700; color: #f59e0b;"><i class="fas fa-star"></i> ${dest.rating || 4.8}</span>
            </div>

            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${dest.description || 'Explore scenic wonders, local heritage, and cultural feasts.'}
            </p>

            <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Est. Daily Cost</div>
                <div style="font-size: 1rem; font-weight: 800; color: var(--primary-teal);">
                  ${window.formatCurrency(dest.averageDailyCost || 2500, 'INR')}
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-teal btn-sm" onclick="DestinationExplorerPage.openDetailsModal('${dest._id}')">
                  <i class="fas fa-info-circle"></i> View Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async removeTrip(tripId) {
    try {
      await window.API.delete(`/api/wishlist/trips/${tripId}`);
      window.Toast?.show('Trip removed from your wishlist.', 'info');
      await this.fetchWishlist();
      this.renderGrid();
    } catch (err) {
      window.Toast?.show('Could not remove trip: ' + err.message, 'error');
    }
  },

  async removeDestination(destId) {
    try {
      await window.API.delete(`/api/wishlist/${destId}`);
      if (window.State.wishlistIds) window.State.wishlistIds.delete(destId.toString());
      window.Toast?.show('Destination removed from your wishlist.', 'info');
      await this.fetchWishlist();
      this.renderGrid();
    } catch (err) {
      window.Toast?.show('Could not remove destination: ' + err.message, 'error');
    }
  }
};

window.WishlistPage = WishlistPage;
