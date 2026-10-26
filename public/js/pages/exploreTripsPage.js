/**
 * Page: Explore Trips (For Travelers & Visitors)
 * Allows users to discover published organiser trips, receive rule-based Smart Trip Suggestions,
 * and submit Join Requests.
 */
const ExploreTripsPage = {
  trips: [],
  userRequests: [],
  recommendations: [],
  isRecommending: false,
  smartPreferences: {
    destination: '',
    budget: 30000,
    duration: 4,
    interests: []
  },
  filters: {
    search: '',
    maxPrice: 50000,
    hasSeatsOnly: false
  },

  render() {
    return `
      <div class="page-container">
        <!-- Hero Header -->
        <div class="jh-card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, var(--bg-card) 0%, rgba(13, 148, 136, 0.08) 100%); border-left: 4px solid var(--primary-teal);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <span class="badge badge-teal" style="margin-bottom: 0.5rem; text-transform: uppercase;">Organised Group Journeys</span>
              <h1 style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 800; color: var(--text-main);">
                Explore Published Trips
              </h1>
              <p style="color: var(--text-secondary); max-width: 600px; margin-top: 0.35rem; font-size: 0.95rem;">
                Browse curated expeditions published by verified tour organisers. Check itineraries, available seat limits, and request to join the journey.
              </p>
            </div>
            <div>
              ${window.State.currentUser ? `
                <a href="#/my-requests" class="btn btn-outline btn-md">
                  <i class="fas fa-paper-plane" style="color: var(--primary-teal);"></i> View My Requests
                </a>
              ` : `
                <a href="#/login" class="btn btn-teal btn-md">Log in to Request Joining</a>
              `}
            </div>
          </div>
        </div>

        <!-- Feature 1: Smart Trip Suggestions & Recommendation Engine -->
        <div class="jh-card" style="margin-bottom: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(30, 41, 59, 0.4) 100%); border: 1px solid rgba(13, 148, 136, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="badge badge-teal" style="font-weight: 700; text-transform: uppercase;">
                  <i class="fas fa-magic" style="margin-right: 0.35rem;"></i> Smart Trip Suggestions
                </span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">(Rule-Based Recommendation Engine)</span>
              </div>
              <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Get personalized trip recommendations tailored to your destination, budget, trip duration, and interests.
              </p>
            </div>
            <div id="smart-recommendation-status" style="font-size: 0.85rem; font-weight: 600; color: var(--primary-teal);"></div>
          </div>

          <!-- Controls Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; align-items: flex-end;">
            <!-- Destination Preference -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="smart-dest-input" style="font-size: 0.8rem;">
                <i class="fas fa-map-pin" style="color: var(--accent-orange, #f59e0b);"></i> Preferred Destination
              </label>
              <input type="text" id="smart-dest-input" class="form-control" placeholder="e.g. Goa, Manali, Kerala, Jaipur..." />
              <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.35rem;">
                <span class="smart-dest-chip" data-dest="Goa" style="cursor: pointer; font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--border-color);">Goa</span>
                <span class="smart-dest-chip" data-dest="Manali" style="cursor: pointer; font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--border-color);">Manali</span>
                <span class="smart-dest-chip" data-dest="Kerala" style="cursor: pointer; font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--border-color);">Kerala</span>
                <span class="smart-dest-chip" data-dest="Jaipur" style="cursor: pointer; font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--border-color);">Jaipur</span>
                <span class="smart-dest-chip" data-dest="Ladakh" style="cursor: pointer; font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--border-color);">Ladakh</span>
              </div>
            </div>

            <!-- Max Budget -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="smart-budget-slider" style="font-size: 0.8rem;">
                <i class="fas fa-wallet" style="color: var(--primary-teal);"></i> Max Budget: <span id="smart-budget-val" style="color: var(--primary-teal); font-weight: 700;">₹30,000</span>
              </label>
              <input type="range" id="smart-budget-slider" min="5000" max="60000" step="2500" value="30000" style="width: 100%; accent-color: var(--primary-teal);" />
              <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem;">
                <span>₹5K</span><span>₹30K</span><span>₹60K</span>
              </div>
            </div>

            <!-- Preferred Duration -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="smart-duration-select" style="font-size: 0.8rem;">
                <i class="fas fa-calendar-alt" style="color: #38bdf8;"></i> Trip Duration
              </label>
              <select id="smart-duration-select" class="form-control" style="font-size: 0.85rem;">
                <option value="">Any Duration</option>
                <option value="2">Weekend Trip (2-3 Days)</option>
                <option value="4" selected>Short Expedition (4-5 Days)</option>
                <option value="7">Week-long Tour (6-7 Days)</option>
                <option value="10">Extended Expedition (8-10 Days)</option>
                <option value="14">Grand Journey (10+ Days)</option>
              </select>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button class="btn btn-teal btn-md" id="smart-find-btn" style="flex: 1; white-space: nowrap;">
                <i class="fas fa-wand-magic-sparkles"></i> Get Suggestions
              </button>
              <button class="btn btn-outline btn-md" id="smart-clear-btn" style="white-space: nowrap;" title="Clear Recommendations & Show All Trips">
                <i class="fas fa-undo"></i> Show All
              </button>
            </div>
          </div>

          <!-- Travel Interest Tags -->
          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed rgba(255,255,255,0.1);">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.5px;">
              Select Travel Interests:
            </div>
            <div id="smart-interests-container" style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              <button type="button" class="interest-chip" data-interest="Beaches" style="padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease;">🏖️ Beaches</button>
              <button type="button" class="interest-chip" data-interest="Mountains" style="padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease;">🏔️ Mountains</button>
              <button type="button" class="interest-chip" data-interest="Adventure" style="padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease;">🏕️ Adventure</button>
              <button type="button" class="interest-chip" data-interest="Heritage" style="padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease;">🏛️ Heritage</button>
              <button type="button" class="interest-chip" data-interest="Cultural" style="padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease;">🎭 Cultural</button>
              <button type="button" class="interest-chip" data-interest="Wildlife" style="padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease;">🐅 Wildlife</button>
              <button type="button" class="interest-chip" data-interest="Spiritual" style="padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease;">🕉️ Spiritual</button>
            </div>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="jh-card" style="margin-bottom: 1.5rem; padding: 1.25rem;">
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: flex-end;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="explore-search"><i class="fas fa-search"></i> Search Destination or Title</label>
              <input type="text" id="explore-search" class="form-control" placeholder="e.g. Rajasthan, Kerala, Manali..." />
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="explore-price-filter">Max Budget: <span id="explore-price-val" style="color: var(--primary-teal); font-weight: 700;">₹50,000</span></label>
              <input type="range" id="explore-price-filter" min="5000" max="60000" step="2500" value="50000" style="width: 100%; accent-color: var(--primary-teal);" />
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Availability</label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem 0; font-size: 0.875rem;">
                <input type="checkbox" id="explore-seats-filter" />
                <span>Available Seats Only</span>
              </label>
            </div>

            <div>
              <button class="btn btn-outline btn-md" id="explore-reset-btn" title="Reset Filters">
                <i class="fas fa-redo"></i> Reset
              </button>
            </div>
          </div>
        </div>

        <!-- Status / Mode Banner -->
        <div id="explore-mode-banner" style="display: none; margin-bottom: 1rem; padding: 0.75rem 1rem; border-radius: 8px; background: rgba(13, 148, 136, 0.12); border: 1px solid var(--primary-teal); color: var(--text-main); font-size: 0.9rem;"></div>

        <!-- Trips Catalog Grid -->
        <div id="explore-trips-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Loading published trips...</p>
          </div>
        </div>
      </div>
    `;
  },

  pollInterval: null,
  socketAttached: false,
  fetchError: null,
  _awakeHandler: null,

  async mount() {
    if (this._awakeHandler) {
      window.removeEventListener('backend_awake', this._awakeHandler);
    }
    this._awakeHandler = async () => {
      await this.fetchData(true);
      this.renderTrips();
    };
    window.addEventListener('backend_awake', this._awakeHandler);

    await this.fetchData();
    this.attachEventListeners();
    this.renderTrips();
    this.attachSocket();

    this.clearIntervals();
    this.pollInterval = setInterval(async () => {
      if (!this.isRecommending) {
        await this.fetchData(true);
        this.renderTrips();
      }
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
      window.socket.on('trip_published', async (data) => {
        console.log('[ExploreTrips] Real-time event: trip_published', data.trip?.title);
        await this.fetchData(true);
        if (!this.isRecommending) this.renderTrips();
        if (data.trip?.title) {
          window.Toast?.show(`New expedition published: "${data.trip.title}"!`, 'info');
        }
      });
      window.socket.on('trip_unpublished', async (data) => {
        console.log('[ExploreTrips] Real-time event: trip_unpublished', data.tripId);
        await this.fetchData(true);
        if (!this.isRecommending) this.renderTrips();
      });
      window.socket.on('join_request_updated', async () => {
        await this.fetchData(true);
        this.renderTrips();
      });
    }
  },

  async fetchData(silent = false) {
    try {
      this.fetchError = null;
      // Fetch public/published trips (visible to all users across all 3 organisers)
      const tripsRes = await window.API.get('/api/trips?explore=true');
      this.trips = tripsRes?.trips || [];

      // If user is logged in, fetch their existing join requests to show accurate status pills
      if (window.State.currentUser) {
        try {
          const reqRes = await window.API.get('/api/join-requests/my-requests');
          this.userRequests = reqRes?.requests || [];
        } catch (e) {
          this.userRequests = [];
        }
      }
    } catch (err) {
      this.fetchError = err;
      if (!silent) {
        console.warn('[ExploreTrips] Load trips warning:', err.message);
      }
    }
  },

  attachEventListeners() {
    // 1. Standard search and filter handlers
    const searchInput = document.getElementById('explore-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase().trim();
        this.renderTrips();
      });
    }

    const priceSlider = document.getElementById('explore-price-filter');
    const priceVal = document.getElementById('explore-price-val');
    if (priceSlider && priceVal) {
      priceSlider.addEventListener('input', (e) => {
        this.filters.maxPrice = Number(e.target.value);
        priceVal.textContent = window.formatCurrency(this.filters.maxPrice, 'INR');
        this.renderTrips();
      });
    }

    const seatsFilter = document.getElementById('explore-seats-filter');
    if (seatsFilter) {
      seatsFilter.addEventListener('change', (e) => {
        this.filters.hasSeatsOnly = e.target.checked;
        this.renderTrips();
      });
    }

    const resetBtn = document.getElementById('explore-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.filters.search = '';
        this.filters.maxPrice = 50000;
        this.filters.hasSeatsOnly = false;
        if (searchInput) searchInput.value = '';
        if (priceSlider) priceSlider.value = 50000;
        if (priceVal) priceVal.textContent = window.formatCurrency(50000, 'INR');
        if (seatsFilter) seatsFilter.checked = false;
        this.renderTrips();
      });
    }

    // 2. Smart Recommendations handlers
    const smartBudgetSlider = document.getElementById('smart-budget-slider');
    const smartBudgetVal = document.getElementById('smart-budget-val');
    if (smartBudgetSlider && smartBudgetVal) {
      smartBudgetSlider.addEventListener('input', (e) => {
        this.smartPreferences.budget = Number(e.target.value);
        smartBudgetVal.textContent = window.formatCurrency(this.smartPreferences.budget, 'INR');
      });
    }

    const smartDestInput = document.getElementById('smart-dest-input');
    if (smartDestInput) {
      smartDestInput.addEventListener('input', (e) => {
        this.smartPreferences.destination = e.target.value.trim();
      });
    }

    // Quick destination chips
    document.querySelectorAll('.smart-dest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const dest = chip.getAttribute('data-dest');
        if (smartDestInput) smartDestInput.value = dest;
        this.smartPreferences.destination = dest;
        this.fetchSmartRecommendations();
      });
    });

    // Duration selector
    const smartDurationSelect = document.getElementById('smart-duration-select');
    if (smartDurationSelect) {
      smartDurationSelect.addEventListener('change', (e) => {
        this.smartPreferences.duration = Number(e.target.value) || 0;
      });
    }

    // Interests chips
    document.querySelectorAll('.interest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const interest = chip.getAttribute('data-interest');
        const idx = this.smartPreferences.interests.indexOf(interest);
        if (idx > -1) {
          this.smartPreferences.interests.splice(idx, 1);
          chip.style.background = 'rgba(255,255,255,0.05)';
          chip.style.color = 'var(--text-secondary)';
          chip.style.borderColor = 'var(--border-color)';
        } else {
          this.smartPreferences.interests.push(interest);
          chip.style.background = 'var(--primary-teal)';
          chip.style.color = '#ffffff';
          chip.style.borderColor = 'var(--primary-teal)';
        }
      });
    });

    // Find Recommendations button
    const findBtn = document.getElementById('smart-find-btn');
    if (findBtn) {
      findBtn.addEventListener('click', () => {
        this.fetchSmartRecommendations();
      });
    }

    // Clear Recommendations button
    const clearBtn = document.getElementById('smart-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.isRecommending = false;
        this.recommendations = [];
        this.smartPreferences.destination = '';
        this.smartPreferences.interests = [];
        if (smartDestInput) smartDestInput.value = '';
        document.querySelectorAll('.interest-chip').forEach(c => {
          c.style.background = 'rgba(255,255,255,0.05)';
          c.style.color = 'var(--text-secondary)';
          c.style.borderColor = 'var(--border-color)';
        });
        const banner = document.getElementById('explore-mode-banner');
        if (banner) banner.style.display = 'none';
        const statusEl = document.getElementById('smart-recommendation-status');
        if (statusEl) statusEl.textContent = '';
        this.renderTrips();
      });
    }
  },

  async fetchSmartRecommendations() {
    const statusEl = document.getElementById('smart-recommendation-status');
    const findBtn = document.getElementById('smart-find-btn');
    if (statusEl) statusEl.innerHTML = `<span class="spinner" style="width: 14px; height: 14px; margin: 0 0.3rem 0 0; display: inline-block;"></span> Matching trips...`;
    if (findBtn) findBtn.disabled = true;

    try {
      const params = new URLSearchParams();
      if (this.smartPreferences.destination) params.set('destination', this.smartPreferences.destination);
      if (this.smartPreferences.budget) params.set('budget', this.smartPreferences.budget);
      if (this.smartPreferences.duration) params.set('duration', this.smartPreferences.duration);
      if (this.smartPreferences.interests.length > 0) params.set('interests', this.smartPreferences.interests.join(','));

      const res = await window.API.get(`/api/trips/recommendations?${params.toString()}`);
      this.recommendations = res?.recommendations || [];
      this.isRecommending = true;

      if (statusEl) {
        statusEl.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> Found ${this.recommendations.length} recommended trip${this.recommendations.length === 1 ? '' : 's'}`;
      }
      this.renderTrips();
    } catch (err) {
      console.error('[ExploreTrips] Recommendation error:', err);
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Recommendation failed</span>`;
      window.Toast?.show('Could not fetch recommendations: ' + err.message, 'error');
    } finally {
      if (findBtn) findBtn.disabled = false;
    }
  },

  renderTrips() {
    const container = document.getElementById('explore-trips-grid');
    if (!container) return;

    const banner = document.getElementById('explore-mode-banner');
    let displayList = [];

    if (this.isRecommending) {
      displayList = this.recommendations;
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <i class="fas fa-wand-magic-sparkles" style="color: var(--primary-teal); margin-right: 0.4rem;"></i>
              <strong>Smart Suggestions Active:</strong> Showing ${displayList.length} top expeditions matched by destination, budget, duration & interests.
            </div>
            <button class="btn btn-outline btn-sm" onclick="ExploreTripsPage.isRecommending = false; ExploreTripsPage.renderTrips();" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;">
              Exit Recommendations & View All
            </button>
          </div>
        `;
      }
    } else {
      if (banner) banner.style.display = 'none';
      displayList = this.trips.filter(t => {
        const matchSearch = !this.filters.search || 
          t.title?.toLowerCase().includes(this.filters.search) || 
          t.destination?.toLowerCase().includes(this.filters.search) ||
          t.description?.toLowerCase().includes(this.filters.search);

        const price = t.price || t.estimatedBudget || 0;
        const matchPrice = price <= this.filters.maxPrice;

        const avail = t.availableSeats !== undefined ? t.availableSeats : 5;
        const matchSeats = !this.filters.hasSeatsOnly || avail > 0;

        return matchSearch && matchPrice && matchSeats;
      });
    }

    if (displayList.length === 0) {
      if (this.fetchError) {
        if (window.API && window.API.renderRetryCard) {
          window.API.renderRetryCard(container, this.fetchError.message, async () => {
            await ExploreTripsPage.fetchData();
            ExploreTripsPage.renderTrips();
          });
        } else {
          container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;" class="jh-card">
              <p style="color: var(--danger);">${this.fetchError.message}</p>
              <button class="btn btn-teal btn-sm" onclick="ExploreTripsPage.fetchData().then(() => ExploreTripsPage.renderTrips())"><i class="fas fa-redo"></i> Retry</button>
            </div>
          `;
        }
        return;
      }

      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;" class="jh-card">
          <i class="fas fa-search-location" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3 style="font-weight: 700; color: var(--text-main);">${this.isRecommending ? 'No Exact Recommendations Found' : 'No Published Trips Found'}</h3>
          <p style="color: var(--text-secondary); max-width: 460px; margin: 0.5rem auto 1.5rem auto;">
            ${this.isRecommending ? 'Try widening your budget, selecting a different destination, or clicking Show All to explore all active tours.' : 'Try adjusting your search query, increasing your budget limit, or clearing active filters.'}
          </p>
          <button class="btn btn-outline btn-sm" onclick="ExploreTripsPage.isRecommending=false; ExploreTripsPage.filters.search=''; ExploreTripsPage.renderTrips();">View All Available Trips</button>
        </div>
      `;
      return;
    }

    container.innerHTML = displayList.map(trip => {
      const capacity = trip.capacity || 10;
      const availableSeats = trip.availableSeats !== undefined ? trip.availableSeats : Math.max(0, capacity - (trip.members?.length || 1));
      const price = trip.price || trip.estimatedBudget || 15000;
      const currency = trip.currency || 'INR';
      const organiserName = trip.organiserId?.name || trip.createdBy?.name || 'Verified Organiser';
      const organiserAvatar = trip.organiserId?.avatar || trip.createdBy?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80';
      const cover = window.DestinationImages ? window.DestinationImages.getTripCoverImage(trip) : (trip.coverImage || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80');
      const safeDest = (trip.destination || '').replace(/'/g, "\\'");
      const safeTitle = (trip.title || '').replace(/'/g, "\\'");

      // Check user request status
      const existingReq = this.userRequests.find(r => (r.trip?._id || r.trip) === trip._id && r.status !== 'cancelled');

      let actionBtnHtml = '';
      if (!window.State.currentUser) {
        actionBtnHtml = `<a href="#/login" class="btn btn-teal btn-block btn-sm">Log in to Join</a>`;
      } else if (window.State.isOrganiser() && (trip.organiserId?._id === window.State.currentUser._id || trip.createdBy?._id === window.State.currentUser._id)) {
        actionBtnHtml = `<a href="#/trips/${trip._id}" class="btn btn-outline btn-block btn-sm"><i class="fas fa-cog"></i> Manage Your Trip</a>`;
      } else if (existingReq) {
        if (existingReq.status === 'approved') {
          actionBtnHtml = `
            <a href="#/trips/${trip._id}" class="btn btn-success btn-block btn-sm">
              <i class="fas fa-check-circle"></i> Enrolled Member
            </a>
          `;
        } else if (existingReq.status === 'pending') {
          actionBtnHtml = `
            <button class="btn btn-outline btn-block btn-sm" style="color: var(--accent-orange, #f59e0b); border-color: var(--accent-orange, #f59e0b);" onclick="window.location.hash = '#/my-requests'">
              <i class="fas fa-clock"></i> Request Pending
            </button>
          `;
        } else {
          actionBtnHtml = `
            <button class="btn btn-teal btn-block btn-sm" onclick="ExploreTripsPage.openJoinModal('${trip._id}', '${trip.title.replace(/'/g, "\\'")}', ${availableSeats})">
              Request Again
            </button>
          `;
        }
      } else if (availableSeats <= 0) {
        actionBtnHtml = `<button class="btn btn-outline btn-block btn-sm" disabled style="opacity: 0.6;"><i class="fas fa-ban"></i> Fully Booked</button>`;
      } else {
        actionBtnHtml = `
          <button class="btn btn-teal btn-block btn-sm" onclick="ExploreTripsPage.openJoinModal('${trip._id}', '${trip.title.replace(/'/g, "\\'")}', ${availableSeats})">
            <i class="fas fa-paper-plane"></i> Request to Join
          </button>
        `;
      }

      // Feature 1: Render Match Badge & Match Reasons if present
      const matchScoreHtml = (trip.matchScore !== undefined) ? `
        <div style="position: absolute; top: 0.75rem; left: 0.75rem;">
          <span class="badge" style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.3); padding: 0.35rem 0.6rem; border-radius: 6px;">
            <i class="fas fa-star" style="margin-right: 0.25rem; color: #fef08a;"></i> ${trip.matchScore}% Match
          </span>
        </div>
      ` : '';

      const matchReasonsHtml = (trip.matchReasons && trip.matchReasons.length > 0) ? `
        <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.6rem;">
          ${trip.matchReasons.slice(0, 3).map(r => `
            <span style="font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 999px; background: rgba(13, 148, 136, 0.15); color: var(--primary-teal); border: 1px solid rgba(13, 148, 136, 0.25);">
              <i class="fas fa-check" style="font-size: 0.65rem; margin-right: 0.2rem;"></i> ${r}
            </span>
          `).join('')}
        </div>
      ` : '';

      return `
        <div class="jh-card" style="display: flex; flex-direction: column; overflow: hidden; padding: 0; transition: transform 0.2s ease, box-shadow 0.2s ease; border: ${trip.matchScore && trip.matchScore >= 80 ? '1px solid rgba(13, 148, 136, 0.4)' : '1px solid var(--border-color)'};">
          <!-- Card Image & Seats Badge -->
          <div style="position: relative; height: 180px; overflow: hidden; background: #1e293b;">
            <img src="${cover}" alt="${trip.title}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="if(window.DestinationImages){window.DestinationImages.handleImageError(this, '${safeDest}', '${safeTitle}');}" loading="lazy" />
            
            ${matchScoreHtml}

            <div style="position: absolute; top: 0.75rem; right: 0.75rem;">
              <span class="badge ${availableSeats > 3 ? 'badge-teal' : availableSeats > 0 ? 'badge-warning' : 'badge-danger'}" style="backdrop-filter: blur(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                <i class="fas fa-chair" style="margin-right: 0.3rem;"></i> ${availableSeats > 0 ? `${availableSeats} Seats Left` : 'Sold Out'}
              </span>
            </div>
            <div style="position: absolute; bottom: 0.75rem; left: 0.75rem;">
              <span class="badge badge-navy" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);">
                <i class="fas fa-map-marker-alt" style="color: var(--accent-orange, #f59e0b); margin-right: 0.3rem;"></i> ${trip.destination}
              </span>
            </div>
          </div>

          <!-- Body -->
          <div style="padding: 1.25rem; display: flex; flex-direction: column; flex-grow: 1;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem; line-height: 1.3;">
              <a href="#/trips/${trip._id}" style="color: inherit; text-decoration: none;">${trip.title}</a>
            </h3>

            ${matchReasonsHtml}
            
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${trip.description || 'Join this exciting expedition organized by a passionate traveler.'}
            </p>

            <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <img src="${organiserAvatar}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" />
                <span style="font-size: 0.8rem; color: var(--text-muted);">${organiserName}</span>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary-teal);">
                  ${window.formatCurrency(price, currency)}
                </div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">per traveler</div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.5rem;">
              <a href="#/trips/${trip._id}" class="btn btn-outline btn-sm" style="flex: 1;" title="View Daily Itinerary & Details">
                <i class="fas fa-eye"></i> Details
              </a>
              <div style="flex: 2;">
                ${actionBtnHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openJoinModal(tripId, tripTitle, availableSeats) {
    if (!window.State.currentUser) {
      window.Toast?.show('Please log in to submit a join request', 'warning');
      window.location.hash = '#/login';
      return;
    }

    const maxSeats = Math.min(4, Math.max(1, availableSeats));

    window.Modal.open({
      title: `Request to Join: ${tripTitle}`,
      body: `
        <div style="margin-bottom: 1.25rem;">
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Submit your request directly to the tour organiser. Once approved, you will get access to full itinerary details, member chats, and coordination boards.
          </p>

          <div class="form-group">
            <label class="form-label" for="join-seats-count">Number of Seats Requested <span style="color: var(--danger, #ef4444);">*</span></label>
            <input type="number" id="join-seats-count" class="form-control" min="1" max="${maxSeats}" value="1" required />
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Available remaining seats: ${availableSeats}</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="join-message">Message to Organiser</label>
            <textarea id="join-message" class="form-control" rows="3" placeholder="Tell the organiser a little about yourself and why you'd like to join..."></textarea>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-outline btn-sm" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal btn-sm" id="confirm-join-req-btn" onclick="ExploreTripsPage.submitJoinRequest('${tripId}')">
          <i class="fas fa-paper-plane"></i> Send Request
        </button>
      `
    });
  },

  async submitJoinRequest(tripId) {
    const seatsInput = document.getElementById('join-seats-count');
    const msgInput = document.getElementById('join-message');
    const seatsRequested = Number(seatsInput?.value) || 1;
    const message = msgInput?.value.trim() || 'Hello! I would love to join your journey.';

    const btn = document.getElementById('confirm-join-req-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width: 14px; height: 14px; margin: 0; display: inline-block;"></span> Sending...`;
    }

    try {
      await window.API.post(`/api/trips/${tripId}/join-requests`, {
        seatsRequested,
        message
      });

      window.Modal.close();
      window.Toast?.show('Join request submitted successfully! The organiser will review it.', 'success');
      await this.fetchData();
      this.renderTrips();
    } catch (err) {
      window.Toast?.show(err.message || 'Could not submit join request', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-paper-plane"></i> Send Request`;
      }
    }
  }
};

window.ExploreTripsPage = ExploreTripsPage;
