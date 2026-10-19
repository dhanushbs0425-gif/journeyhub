/**
 * Page: My Travel Wishlist
 * Displays traveler saved destinations with direct access to guides and remove options.
 */
const WishlistPage = {
  wishlistItems: [],

  render() {
    return `
      <div class="page-container">
        <!-- Header -->
        <div class="jh-card" style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-left: 4px solid #ef4444;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-navy"><i class="fas fa-heart" style="color: #ef4444;"></i> Saved Bucket List</span>
            </div>
            <h1 style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.35rem 0;">
              My Dream Destinations
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">
              Keep track of Indian and global getaways you'd love to explore next.
            </p>
          </div>

          <div>
            <a href="#/destinations" class="btn btn-teal btn-md">
              <i class="fas fa-search-plus"></i> Explore More Indian Destinations
            </a>
          </div>
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

  async fetchWishlist() {
    try {
      const res = await window.API.get('/api/wishlist');
      this.wishlistItems = res?.wishlist || [];
    } catch (err) {
      window.Toast?.show('Failed to fetch wishlist: ' + err.message, 'error');
    }
  },

  renderGrid() {
    const container = document.getElementById('wishlist-grid');
    if (!container) return;

    if (this.wishlistItems.length === 0) {
      container.innerHTML = `
        <div class="jh-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-heart-broken" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
          <h2 style="font-weight: 800; color: var(--text-main);">Your Wishlist is Empty</h2>
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

    container.innerHTML = this.wishlistItems.map(item => {
      const dest = item.destinationId || {};
      const savedDate = new Date(item.addedAt || item.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return `
        <div class="jh-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
          <div style="position: relative; height: 180px; overflow: hidden;">
            <img src="${dest.imageUrl || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=500&q=80'}" 
                 style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; top: 0.75rem; left: 0.75rem;">
              <span class="badge badge-teal">${dest.category || 'Travel'}</span>
            </div>
            <button class="icon-btn" onclick="WishlistPage.removeItem('${dest._id}')" 
                    title="Remove from wishlist"
                    style="position: absolute; top: 0.75rem; right: 0.75rem; background: rgba(255, 255, 255, 0.9); width: 34px; height: 34px;">
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

  async removeItem(destId) {
    try {
      await window.API.delete(`/api/wishlist/${destId}`);
      window.State.wishlistIds.delete(destId.toString());
      window.Toast?.show('Destination removed from your wishlist.', 'info');
      await this.fetchWishlist();
      this.renderGrid();
    } catch (err) {
      window.Toast?.show('Could not remove destination: ' + err.message, 'error');
    }
  }
};

window.WishlistPage = WishlistPage;
