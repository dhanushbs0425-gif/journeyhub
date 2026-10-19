/**
 * Page 13: Packing Checklist Page
 */
const PackingPage = {
  tripId: null,
  packingData: null,

  async render(params) {
    PackingPage.tripId = params.tripId;

    return `
      <div class="packing-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Packing Checklist & Essentials</h1>
            <p class="page-subtitle">Coordinate luggage items, assign shared gear, and track packing readiness</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-outline" onclick="PackingPage.addPresets()"><i class="fas fa-magic" style="color: var(--accent-orange);"></i> Add Essential Presets</button>
            <button class="btn btn-teal" onclick="PackingPage.openAddItemModal()"><i class="fas fa-plus"></i> Add Item</button>
          </div>
        </div>

        <!-- Packing Progress Bar Card -->
        <div class="jh-card" style="padding: 1.5rem; margin-bottom: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Packing Completion</span>
              <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: var(--text-main);" id="packing-progress-label">0% Packed</h3>
            </div>
            <div style="font-size: 0.9rem; font-weight: 600; color: var(--primary-teal);" id="packing-count-label">0 of 0 Items</div>
          </div>
          <div class="progress-bar-container" style="height: 12px;">
            <div class="progress-bar-fill progress-teal" id="packing-progress-bar" style="width: 0%;"></div>
          </div>
        </div>

        <!-- Category Accordions Container -->
        <div id="packing-categories-container">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    PackingPage.tripId = params.tripId;
    await PackingPage.loadItems();
  },

  async loadItems() {
    try {
      const res = await window.API.get(`/api/trips/${PackingPage.tripId}/packing`);
      PackingPage.packingData = res;
      PackingPage.updateStats();
      PackingPage.renderCategories();
    } catch (err) {
      document.getElementById('packing-categories-container').innerHTML = `
        <div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>
      `;
    }
  },

  updateStats() {
    const stats = PackingPage.packingData?.stats || { totalCount: 0, packedCount: 0, percentage: 0 };
    const label = document.getElementById('packing-progress-label');
    const countLabel = document.getElementById('packing-count-label');
    const bar = document.getElementById('packing-progress-bar');

    if (label) label.textContent = `${stats.percentage}% Packed`;
    if (countLabel) countLabel.textContent = `${stats.packedCount} of ${stats.totalCount} Items`;
    if (bar) bar.style.width = `${stats.percentage}%`;
  },

  renderCategories() {
    const container = document.getElementById('packing-categories-container');
    if (!container) return;

    const categories = PackingPage.packingData?.categories || {};
    const catKeys = Object.keys(categories);

    if (catKeys.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-suitcase"></i></div>
          <h3 class="empty-state-title">Packing list is empty</h3>
          <p class="empty-state-text">Start by adding your essentials or click below to populate standard travel templates.</p>
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button class="btn btn-outline" onclick="PackingPage.addPresets()"><i class="fas fa-magic"></i> Add Essential Presets</button>
            <button class="btn btn-teal" onclick="PackingPage.openAddItemModal()"><i class="fas fa-plus"></i> Add Item</button>
          </div>
        </div>
      `;
      return;
    }

    const iconMap = {
      'Clothing': 'fa-tshirt',
      'Toiletries': 'fa-pump-soap',
      'Electronics': 'fa-laptop',
      'Documents & Money': 'fa-passport',
      'Health & Medical': 'fa-medkit',
      'Footwear': 'fa-shoe-prints',
      'Gear & Accessories': 'fa-hiking',
      'Misc': 'fa-box'
    };

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${catKeys.map(cat => {
          const items = categories[cat] || [];
          const icon = iconMap[cat] || 'fa-box';

          return `
            <div class="jh-card">
              <div class="jh-card-header" style="background-color: var(--bg-surface);">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <i class="fas ${icon}" style="color: var(--primary-teal);"></i>
                  <h3 class="jh-card-title">${cat}</h3>
                  <span class="badge badge-navy" style="font-size: 0.7rem;">${items.filter(i => i.isPacked).length}/${items.length}</span>
                </div>
                <button class="btn btn-outline btn-sm" onclick="PackingPage.openAddItemModal('${cat}')"><i class="fas fa-plus"></i> Add to ${cat}</button>
              </div>

              <div class="jh-card-body" style="padding: 0;">
                <div style="display: flex; flex-direction: column;">
                  ${items.map(item => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--border-color); ${item.isPacked ? 'background-color: rgba(13, 148, 136, 0.03);' : ''}">
                      <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <input type="checkbox" ${item.isPacked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-teal);" onchange="PackingPage.togglePacked('${item._id}')" />
                        <div>
                          <span style="font-size: 0.95rem; font-weight: 600; color: ${item.isPacked ? 'var(--text-muted)' : 'var(--text-main)'}; ${item.isPacked ? 'text-decoration: line-through;' : ''}">
                            ${item.title}
                          </span>
                          ${item.quantity > 1 ? `<span class="badge badge-navy" style="font-size: 0.7rem; margin-left: 0.4rem;">Qty: ${item.quantity}</span>` : ''}
                          ${item.isShared ? `<span class="badge badge-teal" style="font-size: 0.7rem; margin-left: 0.4rem;"><i class="fas fa-share-alt"></i> Shared Gear</span>` : ''}
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        ${item.assignedTo ? `
                          <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary);">
                            <img src="${item.assignedTo.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" />
                            <span>${item.assignedTo.name?.split(' ')[0]}</span>
                          </div>
                        ` : ''}
                        <button class="btn btn-outline btn-sm" onclick="PackingPage.deleteItem('${item._id}')" title="Delete Item">
                          <i class="fas fa-trash-alt" style="color: var(--danger); font-size: 0.75rem;"></i>
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openAddItemModal(defaultCat = 'Clothing') {
    const trip = window.State.currentTrip;
    const members = trip?.members || [];

    window.Modal.open({
      title: 'Add Item to Packing List',
      body: `
        <form id="add-packing-form">
          <div class="form-group">
            <label class="form-label">Item Title <span style="color: var(--danger);">*</span></label>
            <input type="text" id="pack-title" class="form-control" placeholder="e.g. Travel Universal Power Adapter" required />
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="pack-cat" class="form-control">
                ${['Clothing', 'Toiletries', 'Electronics', 'Documents & Money', 'Health & Medical', 'Footwear', 'Gear & Accessories', 'Misc'].map(c => `
                  <option value="${c}" ${c === defaultCat ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Quantity</label>
              <input type="number" id="pack-qty" class="form-control" value="1" min="1" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Assignee</label>
              <select id="pack-assigned" class="form-control">
                <option value="">-- Unassigned --</option>
                ${members.map(m => `
                  <option value="${m.user?._id}">${m.user?.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1.75rem;">
              <input type="checkbox" id="pack-shared" style="width: 18px; height: 18px; accent-color: var(--primary-teal);" />
              <label for="pack-shared" style="font-size: 0.85rem; font-weight: 600; cursor: pointer;">Shared Group Item</label>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="PackingPage.submitAddItem()">Add Item</button>
      `
    });
  },

  async submitAddItem() {
    const title = document.getElementById('pack-title')?.value.trim();
    const category = document.getElementById('pack-cat')?.value;
    const quantity = document.getElementById('pack-qty')?.value;
    const assignedTo = document.getElementById('pack-assigned')?.value;
    const isShared = document.getElementById('pack-shared')?.checked;

    if (!title) {
      window.showToast('Please provide an item title.', 'warning');
      return;
    }

    try {
      const res = await window.API.post(`/api/trips/${PackingPage.tripId}/packing`, {
        title,
        category,
        quantity: Number(quantity) || 1,
        assignedTo: assignedTo || null,
        isShared: Boolean(isShared)
      });

      window.Modal.close();
      window.showToast(res.message, 'success');
      await PackingPage.loadItems();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async togglePacked(itemId) {
    try {
      await window.API.put(`/api/trips/${PackingPage.tripId}/packing/${itemId}/toggle`, {});
      await PackingPage.loadItems();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async deleteItem(itemId) {
    try {
      await window.API.delete(`/api/trips/${PackingPage.tripId}/packing/${itemId}`);
      await PackingPage.loadItems();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async addPresets() {
    try {
      const res = await window.API.post(`/api/trips/${PackingPage.tripId}/packing/presets`, {});
      window.showToast(res.message, 'success');
      await PackingPage.loadItems();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  }
};

window.PackingPage = PackingPage;
