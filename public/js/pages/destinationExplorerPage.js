/**
 * Page: Explore Incredible India — 72 Handpicked Destinations Catalog
 * Features: 6 categories, state filter, INR budget slider, Surprise Me generator,
 * interactive Leaflet map, persistent Wishlist heart toggle, and comprehensive guide modal.
 */
const DestinationExplorerPage = {
  currentCategory: 'All',
  currentState: 'All',
  searchQuery: '',
  maxBudget: 35000,
  destinations: [],
  states: [],
  mapInstance: null,

  async render() {
    return `
      <div class="page-container">
        <!-- Hero Header -->
        <div class="jh-card" style="margin-bottom: 2rem; background: linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%), var(--bg-card); border-left: 4px solid var(--primary-teal);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <span class="badge badge-teal" style="margin-bottom: 0.35rem; font-weight: 700; text-transform: uppercase;">
                <i class="fas fa-om"></i> Incredible India Discovery
              </span>
              <h1 style="font-family: var(--font-display); font-size: 1.85rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">
                Explore Indian Destinations
              </h1>
              <p style="color: var(--text-secondary); max-width: 650px; font-size: 0.95rem; margin: 0;">
                72 handpicked wonders across 6 distinct categories: Himalayan peaks, coastal paradises, royal heritage fortresses, tiger sanctuaries, holy shrines, and thrilling gorges.
              </p>
            </div>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button class="btn btn-outline btn-md" onclick="DestinationExplorerPage.surpriseMe()" style="box-shadow: 0 4px 10px rgba(245, 158, 11, 0.15); border-color: var(--accent-orange, #f59e0b); color: var(--accent-orange, #f59e0b);">
                <i class="fas fa-dice"></i> Surprise Me!
              </button>
              <a href="#/wishlist" class="btn btn-teal btn-md">
                <i class="fas fa-heart" style="color: #ef4444;"></i> My Wishlist
              </a>
            </div>
          </div>
        </div>

        <!-- Interactive Map Container -->
        <div class="map-container" id="destination-leaflet-map" style="height: 320px; border-radius: var(--radius-lg, 12px); margin-bottom: 1.75rem; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.05);"></div>

        <!-- Filter & Search Controls -->
        <div class="jh-card" style="margin-bottom: 1.5rem; padding: 1.25rem;">
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: flex-end;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="dest-search-input"><i class="fas fa-search"></i> Search Destination, City, or State</label>
              <input type="text" id="dest-search-input" class="form-control" placeholder="e.g. Manali, Munnar, Jaipur, Kerala..." />
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="dest-state-filter"><i class="fas fa-map"></i> Filter by State</label>
              <select id="dest-state-filter" class="form-control">
                <option value="All">All States (India)</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="dest-budget-slider">
                Max Daily Cost: <span id="dest-budget-val" style="color: var(--primary-teal); font-weight: 700;">₹4,500</span>
              </label>
              <input type="range" id="dest-budget-slider" min="1500" max="6000" step="250" value="4500" style="width: 100%; accent-color: var(--primary-teal);" />
            </div>

            <div>
              <button class="btn btn-outline btn-md" id="dest-reset-filters-btn" title="Reset Filters">
                <i class="fas fa-redo"></i> Reset
              </button>
            </div>
          </div>
        </div>

        <!-- 6 Category Filter Pills -->
        <div style="display: flex; gap: 0.5rem; overflow-x: auto; margin-bottom: 1.5rem; padding-bottom: 0.5rem; scrollbar-width: none;">
          ${[
            { id: 'All', label: 'All (72)', icon: 'fa-globe-asia' },
            { id: 'Mountains & Hill Stations', label: 'Mountains & Hills (12)', icon: 'fa-mountain' },
            { id: 'Beaches & Coastal', label: 'Beaches & Coastal (12)', icon: 'fa-umbrella-beach' },
            { id: 'Heritage & Historical', label: 'Heritage & Historical (12)', icon: 'fa-monument' },
            { id: 'Nature & Wildlife', label: 'Nature & Wildlife (12)', icon: 'fa-paw' },
            { id: 'Spiritual & Cultural', label: 'Spiritual & Cultural (12)', icon: 'fa-place-of-worship' },
            { id: 'Adventure', label: 'Adventure Sports (12)', icon: 'fa-hiking' }
          ].map(cat => `
            <button class="btn ${cat.id === 'All' ? 'btn-teal' : 'btn-outline'} btn-sm dest-cat-btn" data-cat="${cat.id}" onclick="DestinationExplorerPage.filterCategory('${cat.id}', this)" style="white-space: nowrap;">
              <i class="fas ${cat.icon}"></i> ${cat.label}
            </button>
          `).join('')}
        </div>

        <!-- Destinations Catalog Grid -->
        <div id="destinations-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Loading Indian destinations...</p>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    this.attachEventListeners();
    await this.loadDestinations();
  },

  attachEventListeners() {
    const searchInput = document.getElementById('dest-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderDestinationsGrid();
      });
    }

    const stateSelect = document.getElementById('dest-state-filter');
    if (stateSelect) {
      stateSelect.addEventListener('change', (e) => {
        this.currentState = e.target.value;
        this.renderDestinationsGrid();
      });
    }

    const budgetSlider = document.getElementById('dest-budget-slider');
    const budgetVal = document.getElementById('dest-budget-val');
    if (budgetSlider && budgetVal) {
      budgetSlider.addEventListener('input', (e) => {
        this.maxBudget = Number(e.target.value);
        budgetVal.textContent = window.formatCurrency(this.maxBudget, 'INR');
        this.renderDestinationsGrid();
      });
    }

    const resetBtn = document.getElementById('dest-reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.currentState = 'All';
        this.currentCategory = 'All';
        this.maxBudget = 6000;
        if (searchInput) searchInput.value = '';
        if (stateSelect) stateSelect.value = 'All';
        if (budgetSlider) budgetSlider.value = 6000;
        if (budgetVal) budgetVal.textContent = window.formatCurrency(6000, 'INR');

        document.querySelectorAll('.dest-cat-btn').forEach((b, idx) => {
          b.className = idx === 0 ? 'btn btn-teal btn-sm dest-cat-btn' : 'btn btn-outline btn-sm dest-cat-btn';
        });

        this.renderDestinationsGrid();
      });
    }
  },

  async loadDestinations() {
    // 1. Immediately hydrate from local cache if available for instant display
    try {
      const cached = localStorage.getItem('jh_dest_cache');
      if (cached && this.destinations.length === 0) {
        this.destinations = JSON.parse(cached);
        this.populateStatesAndRender();
      }
    } catch (e) {}

    // 2. Fetch fresh list from server
    try {
      const res = await window.API.get('/api/destinations?limit=100');
      if (res && res.destinations) {
        this.destinations = res.destinations;
        try {
          localStorage.setItem('jh_dest_cache', JSON.stringify(this.destinations));
        } catch (e) {}
        this.populateStatesAndRender();
      }
    } catch (err) {
      console.warn('Failed to fetch fresh destinations from server:', err.message);
      if (this.destinations.length === 0) {
        const grid = document.getElementById('destinations-grid');
        if (grid && window.API && window.API.renderRetryCard) {
          window.API.renderRetryCard(grid, err.message, () => this.loadDestinations());
        }
      }
    }
  },

  populateStatesAndRender() {
    const stateSet = new Set();
    this.destinations.forEach(d => {
      if (d.state && d.state !== 'India') stateSet.add(d.state);
    });
    this.states = Array.from(stateSet).sort();

    const stateSelect = document.getElementById('dest-state-filter');
    if (stateSelect) {
      stateSelect.innerHTML = `<option value="All">All States (India)</option>` + 
        this.states.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    this.initLeafletMap();
    this.renderDestinationsGrid();
  },

  initLeafletMap() {
    const mapDiv = document.getElementById('destination-leaflet-map');
    if (!mapDiv || typeof L === 'undefined') return;

    if (this.mapInstance) {
      this.mapInstance.remove();
    }

    // Centered over geographical India
    const map = L.map('destination-leaflet-map').setView([22.5, 79.5], 5);
    this.mapInstance = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    this.destinations.forEach(dest => {
      if (dest.coordinates && dest.coordinates.lat && dest.coordinates.lng) {
        const marker = L.marker([dest.coordinates.lat, dest.coordinates.lng]).addTo(map);
        marker.bindPopup(`
          <div style="font-family: var(--font-sans); min-width: 200px;">
            <img src="${dest.imageUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;" />
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;">${dest.name}</h4>
            <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px;">
              <i class="fas fa-map-marker-alt" style="color: #f59e0b;"></i> ${dest.state || dest.city}, ${dest.country}
            </p>
            <div style="font-size: 0.8rem; font-weight: 700; color: #0d9488; margin-bottom: 6px;">
              Avg. ${window.formatCurrency(dest.averageDailyCost || 2500, 'INR')} / day
            </div>
            <button class="btn btn-teal btn-sm" style="width: 100%; padding: 4px;" onclick="DestinationExplorerPage.openDetailsModal('${dest._id}')">
              Explore Guide
            </button>
          </div>
        `);
      }
    });
  },

  filterCategory(cat, btn) {
    this.currentCategory = cat;
    document.querySelectorAll('.dest-cat-btn').forEach(b => {
      b.className = 'btn btn-outline btn-sm dest-cat-btn';
    });
    if (btn) btn.className = 'btn btn-teal btn-sm dest-cat-btn';
    this.renderDestinationsGrid();
  },

  renderDestinationsGrid() {
    const container = document.getElementById('destinations-grid-container');
    if (!container) return;

    let filtered = this.destinations;

    if (this.currentCategory !== 'All') {
      filtered = filtered.filter(d => d.category === this.currentCategory);
    }

    if (this.currentState !== 'All') {
      filtered = filtered.filter(d => d.state === this.currentState);
    }

    if (this.maxBudget) {
      filtered = filtered.filter(d => (d.averageDailyCost || 2000) <= this.maxBudget);
    }

    if (this.searchQuery) {
      const q = this.searchQuery;
      filtered = filtered.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.state?.toLowerCase().includes(q) ||
        d.city?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        (d.highlights && d.highlights.some(h => h.toLowerCase().includes(q)))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;" class="jh-card">
          <i class="fas fa-compass" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3 style="font-weight: 700; color: var(--text-main);">No Indian Destinations Found</h3>
          <p style="color: var(--text-secondary); max-width: 420px; margin: 0.5rem auto 1.5rem auto;">
            Try clearing active state filters or relaxing your budget limit to see more of Incredible India.
          </p>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('dest-reset-filters-btn').click()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(dest => {
      const isSaved = window.State.isWishlisted(dest._id);
      const estBudget = dest.averageDailyCost || 2500;

      return `
        <div class="jh-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease;">
          <!-- Destination Card Image -->
          <div style="position: relative; height: 200px; overflow: hidden; background: #0f172a;">
            <img src="${dest.imageUrl}" alt="${dest.name}" style="width: 100%; height: 100%; object-fit: cover;" />
            
            <!-- Category Badge -->
            <div style="position: absolute; top: 0.75rem; left: 0.75rem;">
              <span class="badge badge-teal" style="backdrop-filter: blur(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${dest.category}
              </span>
            </div>

            <!-- Wishlist Heart Button -->
            <button class="icon-btn" onclick="DestinationExplorerPage.toggleWishlist('${dest._id}', this)" 
                    title="${isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}" 
                    style="position: absolute; top: 0.75rem; right: 0.75rem; background: rgba(255, 255, 255, 0.9); width: 34px; height: 34px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
              <i class="fas fa-heart" style="color: ${isSaved ? '#ef4444' : '#94a3b8'}; font-size: 1rem;"></i>
            </button>

            <!-- Location Overlay -->
            <div style="position: absolute; bottom: 0.75rem; left: 0.75rem;">
              <span class="badge badge-navy" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);">
                <i class="fas fa-map-marker-alt" style="color: var(--accent-orange, #f59e0b); margin-right: 0.25rem;"></i> ${dest.city ? `${dest.city}, ` : ''}${dest.state || 'India'}
              </span>
            </div>
          </div>

          <!-- Card Body -->
          <div style="padding: 1.25rem; display: flex; flex-direction: column; flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
              <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin: 0;">
                ${dest.name}
              </h3>
              <span style="font-size: 0.8rem; font-weight: 700; color: #f59e0b; display: flex; align-items: center; gap: 0.2rem;">
                <i class="fas fa-star"></i> ${dest.rating || 4.8}
              </span>
            </div>

            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${dest.description}
            </p>

            <!-- Highlights tags -->
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem;">
              ${(dest.highlights || dest.attractions || []).slice(0, 3).map(h => `
                <span class="badge badge-navy" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${h}</span>
              `).join('')}
            </div>

            <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Avg Daily Cost</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary-teal);">
                  ${window.formatCurrency(estBudget, 'INR')}
                </div>
              </div>

              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-outline btn-sm" onclick="DestinationExplorerPage.openDetailsModal('${dest._id}')">
                  <i class="fas fa-info-circle"></i> View Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async toggleWishlist(destId, btnElement) {
    const isNowSaved = await window.State.toggleWishlist(destId);
    if (btnElement) {
      const heartIcon = btnElement.querySelector('i');
      if (heartIcon) {
        heartIcon.style.color = isNowSaved ? '#ef4444' : '#94a3b8';
      }
    }
  },

  openDetailsModal(destId) {
    const dest = this.destinations.find(d => d._id === destId);
    if (!dest) return;

    const isOrganiser = window.State.isOrganiser();
    const gallery = dest.gallery && dest.gallery.length > 0 ? dest.gallery : [dest.imageUrl];

    window.Modal.open({
      title: `${dest.name} — Destination Guide`,
      body: `
        <div style="max-height: 70vh; overflow-y: auto; padding-right: 0.5rem;">
          <!-- Image Gallery Grid -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.5rem; margin-bottom: 1.25rem; border-radius: 8px; overflow: hidden; height: 220px;">
            <img src="${gallery[0] || dest.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <img src="${gallery[1] || dest.imageUrl}" style="width: 100%; height: calc(50% - 0.25rem); object-fit: cover;" />
              <img src="${gallery[2] || dest.imageUrl}" style="width: 100%; height: calc(50% - 0.25rem); object-fit: cover;" />
            </div>
          </div>

          <!-- Quick Badges -->
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
            <span class="badge badge-teal">${dest.category}</span>
            <span class="badge badge-navy"><i class="fas fa-map-marker-alt" style="color: #f59e0b;"></i> ${dest.state || 'India'}</span>
            <span class="badge badge-navy"><i class="fas fa-clock"></i> Recommended: ${dest.recommendedDuration || '3-4 Days'}</span>
            <span class="badge badge-navy"><i class="fas fa-sun"></i> Best Season: ${dest.bestSeason || dest.bestTimeToVisit || 'October to March'}</span>
          </div>

          <!-- Description -->
          <p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.5; margin-bottom: 1.25rem;">
            ${dest.description}
          </p>

          <!-- Day-Wise Sample Itinerary -->
          ${dest.itinerary && dest.itinerary.length > 0 ? `
            <div style="margin-bottom: 1.25rem;">
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">
                <i class="fas fa-route" style="color: var(--primary-teal);"></i> Recommended Day-wise Plan
              </h4>
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${dest.itinerary.map(item => `
                  <div style="background: var(--bg-surface, #f8fafc); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.85rem;">
                    <div style="font-weight: 700; font-size: 0.85rem; color: var(--primary-teal); margin-bottom: 0.2rem;">
                      Day ${item.dayNumber}: ${item.title}
                    </div>
                    <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary);">
                      ${(item.activities || []).map(act => `<li>${act}</li>`).join('')}
                    </ul>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Famous Local Foods & Specialties -->
          ${dest.foodRecommendations && dest.foodRecommendations.length > 0 ? `
            <div style="margin-bottom: 1.25rem;">
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">
                <i class="fas fa-utensils" style="color: var(--accent-orange, #f59e0b);"></i> Local Culinary Specialties
              </h4>
              <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                ${dest.foodRecommendations.map(food => `
                  <span class="badge badge-navy" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">${food}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Travel Tips -->
          ${dest.travelTips && dest.travelTips.length > 0 ? `
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">
                <i class="fas fa-lightbulb" style="color: #eab308;"></i> Local Travel Tips
              </h4>
              <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
                ${dest.travelTips.map(tip => `<li>${tip}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `,
      footer: `
        <button class="btn btn-outline btn-sm" onclick="DestinationExplorerPage.toggleWishlist('${dest._id}')">
          <i class="fas fa-heart" style="color: #ef4444;"></i> Save to Wishlist
        </button>
        ${isOrganiser ? `
          <button class="btn btn-teal btn-sm" onclick="Modal.close(); DestinationExplorerPage.quickCreateTripFromDest('${dest.name}')">
            <i class="fas fa-plus"></i> Organise a Trip Here
          </button>
        ` : `
          <a href="#/explore-trips" class="btn btn-teal btn-sm" onclick="Modal.close()">
            <i class="fas fa-compass"></i> Find Published Trips Here
          </a>
        `}
      `
    });
  },

  quickCreateTripFromDest(destinationName) {
    window.location.hash = '#/trips/create';
    setTimeout(() => {
      const destInput = document.getElementById('trip-destination');
      const titleInput = document.getElementById('trip-title');
      if (destInput) destInput.value = destinationName;
      if (titleInput) titleInput.value = `Expedition to ${destinationName}`;
    }, 150);
  },

  surpriseMe() {
    if (this.destinations.length === 0) return;
    const randomIdx = Math.floor(Math.random() * this.destinations.length);
    const chosen = this.destinations[randomIdx];

    // Open detailed guide for the surprise pick
    this.openDetailsModal(chosen._id);
    window.Toast?.show(`✨ Surprise Destination Selected: ${chosen.name}!`, 'info');
  }
};

window.DestinationExplorerPage = DestinationExplorerPage;
