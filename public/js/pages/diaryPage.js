/**
 * Page 15: Personal Travel Diary & Memories Page
 */
const DiaryPage = {
  tripId: null,
  diaryData: null,
  activeSubView: 'entries', // 'entries' | 'gallery'

  async render(params) {
    DiaryPage.tripId = params.tripId;

    return `
      <div class="diary-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Personal Travel Diary & Memories</h1>
            <p class="page-subtitle">Preserve daily reflections, highlights, memorable locations, and high-resolution photo archives</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-teal" onclick="DiaryPage.openAddEntryModal()"><i class="fas fa-pen-nib"></i> Write Memory</button>
          </div>
        </div>

        <!-- View Switcher Tabs -->
        <div class="tabs-header">
          <button class="tab-btn active" data-view="entries" onclick="DiaryPage.switchView('entries', this)"><i class="fas fa-book-open"></i> Journal Entries</button>
          <button class="tab-btn" data-view="gallery" onclick="DiaryPage.switchView('gallery', this)"><i class="fas fa-images" style="color: var(--teal-400);"></i> Photo Gallery</button>
        </div>

        <!-- Main Diary Content Container -->
        <div id="diary-content-container">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    DiaryPage.tripId = params.tripId;
    await DiaryPage.loadDiary();
  },

  switchView(view, btn) {
    DiaryPage.activeSubView = view;
    document.querySelectorAll('.diary-page .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    DiaryPage.renderView();
  },

  async loadDiary() {
    try {
      const res = await window.API.get(`/api/trips/${DiaryPage.tripId}/diary`);
      DiaryPage.diaryData = res;
      DiaryPage.renderView();
    } catch (err) {
      document.getElementById('diary-content-container').innerHTML = `
        <div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>
      `;
    }
  },

  renderView() {
    const container = document.getElementById('diary-content-container');
    if (!container) return;

    if (DiaryPage.activeSubView === 'gallery') {
      DiaryPage.renderGalleryView(container);
    } else {
      DiaryPage.renderEntriesView(container);
    }
  },

  renderEntriesView(container) {
    const entries = DiaryPage.diaryData?.entries || [];

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-feather-alt"></i></div>
          <h3 class="empty-state-title">No diary entries written yet</h3>
          <p class="empty-state-text">Capture your personal thoughts, memorable places, weather notes, and photos from this journey.</p>
          <button class="btn btn-teal" onclick="DiaryPage.openAddEntryModal()"><i class="fas fa-pen-nib"></i> Write First Entry</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="diary-grid">
        ${entries.map(entry => {
          const firstPhoto = entry.photos && entry.photos.length > 0 ? entry.photos[0].url : 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
          const stars = Array(entry.rating || 5).fill('<i class="fas fa-star" style="color: #f59e0b;"></i>').join('');

          return `
            <div class="diary-card">
              <img src="${firstPhoto}" class="diary-card-photos" alt="${entry.title}" />
              <div class="diary-card-body">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span class="badge badge-teal">Day ${entry.dayNumber || 1} • ${entry.mood || 'Amazing'}</span>
                  <div style="font-size: 0.8rem;">${stars}</div>
                </div>

                <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">${entry.title}</h3>

                <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                  <span><i class="far fa-calendar-alt"></i> ${new Date(entry.date).toLocaleDateString()}</span>
                  ${entry.weather ? `<span><i class="fas fa-cloud-sun" style="color: var(--accent-orange);"></i> ${entry.weather}</span>` : ''}
                  ${entry.actualExpenses > 0 ? `<span><i class="fas fa-wallet" style="color: var(--primary-teal);"></i> Spent ${window.formatCurrency(entry.actualExpenses, window.State.currentTrip?.currency)}</span>` : ''}
                </div>

                <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">
                  ${entry.notes}
                </p>

                ${entry.memorablePlaces && entry.memorablePlaces.length > 0 ? `
                  <div style="margin-bottom: 0.75rem;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Memorable Places</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                      ${entry.memorablePlaces.map(p => `<span class="badge badge-navy" style="font-size: 0.7rem;"><i class="fas fa-map-pin" style="color: var(--accent-orange);"></i> ${p}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}

                <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <img src="${entry.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                    <span style="font-size: 0.8rem; font-weight: 600;">${entry.author?.name || 'Traveler'}</span>
                  </div>
                  <button class="btn btn-outline btn-sm" onclick="DiaryPage.deleteEntry('${entry._id}')" title="Delete Entry">
                    <i class="fas fa-trash-alt" style="color: var(--danger); font-size: 0.75rem;"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderGalleryView(container) {
    const gallery = DiaryPage.diaryData?.photoGallery || [];

    if (gallery.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="far fa-images"></i></div>
          <h3 class="empty-state-title">Photo gallery is empty</h3>
          <p class="empty-state-text">Attach photo image URLs when writing your diary entries to automatically populate this visual album.</p>
          <button class="btn btn-teal" onclick="DiaryPage.openAddEntryModal()"><i class="fas fa-pen-nib"></i> Write Memory with Photos</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
        ${gallery.map(p => `
          <div class="jh-card" style="overflow: hidden; position: relative;">
            <img src="${p.url}" style="width: 100%; height: 220px; object-fit: cover; display: block;" alt="${p.caption || 'Photo memory'}" />
            <div style="padding: 0.75rem 1rem;">
              <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.2rem;">${p.entryTitle}</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">${p.caption || `Day ${p.dayNumber} Memory`}</p>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">Captured by ${p.authorName}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  openAddEntryModal() {
    const trip = window.State.currentTrip;
    const today = new Date().toISOString().split('T')[0];

    window.Modal.open({
      title: 'Write Travel Diary Memory',
      body: `
        <form id="add-diary-form">
          <div class="form-group">
            <label class="form-label">Memory Title <span style="color: var(--danger);">*</span></label>
            <input type="text" id="diary-title" class="form-control" placeholder="e.g. Sunset Over the Bamboo Groves" required />
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Day Number</label>
              <input type="number" id="diary-day" class="form-control" value="1" min="1" max="${trip?.durationDays || 30}" />
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" id="diary-date" class="form-control" value="${today}" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Overall Mood</label>
              <select id="diary-mood" class="form-control">
                <option value="Amazing">Amazing 🌟</option>
                <option value="Exciting">Exciting 🚀</option>
                <option value="Relaxing">Relaxing ☕</option>
                <option value="Adventurous">Adventurous 🏔️</option>
                <option value="Tiring">Tiring 😴</option>
                <option value="Chaotic">Chaotic 🌪️</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Weather</label>
              <input type="text" id="diary-weather" class="form-control" placeholder="e.g. Sunny with light breeze (21°C)" value="Sunny" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Reflections & Notes <span style="color: var(--danger);">*</span></label>
            <textarea id="diary-notes" class="form-control" rows="4" placeholder="Describe the sounds, flavors, surprises, and highlights of this day..." required></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Memorable Places Visited (comma-separated)</label>
            <input type="text" id="diary-places" class="form-control" placeholder="e.g. Bamboo Grove, Tenryu-ji Zen Garden, Riverbank Cafe" />
          </div>

          <div class="form-group">
            <label class="form-label">Photo Image URL</label>
            <input type="url" id="diary-photo" class="form-control" placeholder="https://images.unsplash.com/photo-..." value="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80" />
            <div class="form-hint">Tip: Paste any high-res travel photograph link from Unsplash.</div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Personal Day Rating (1 - 5 Stars)</label>
              <select id="diary-rating" class="form-control">
                <option value="5" selected>5 Stars (Spectacular)</option>
                <option value="4">4 Stars (Great)</option>
                <option value="3">3 Stars (Good)</option>
                <option value="2">2 Stars (Average)</option>
                <option value="1">1 Star (Tough day)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Actual Day Out-of-Pocket Expense (${window.getCurrencySymbol(trip?.currency)})</label>
              <input type="number" id="diary-expense" class="form-control" value="0" min="0" />
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="DiaryPage.submitAddEntry()">Save to Diary</button>
      `
    });
  },

  async submitAddEntry() {
    const title = document.getElementById('diary-title')?.value.trim();
    const notes = document.getElementById('diary-notes')?.value.trim();
    const dayNumber = document.getElementById('diary-day')?.value;
    const date = document.getElementById('diary-date')?.value;
    const mood = document.getElementById('diary-mood')?.value;
    const weather = document.getElementById('diary-weather')?.value.trim();
    const rawPlaces = document.getElementById('diary-places')?.value || '';
    const photoUrl = document.getElementById('diary-photo')?.value.trim();
    const rating = document.getElementById('diary-rating')?.value;
    const actualExpenses = document.getElementById('diary-expense')?.value;

    if (!title || !notes) {
      window.showToast('Please provide a title and your diary reflection notes.', 'warning');
      return;
    }

    const memorablePlaces = rawPlaces.split(',').map(p => p.trim()).filter(Boolean);
    const photos = photoUrl ? [{ url: photoUrl, caption: title }] : [];

    try {
      const res = await window.API.post(`/api/trips/${DiaryPage.tripId}/diary`, {
        title,
        notes,
        dayNumber: Number(dayNumber) || 1,
        date: date || new Date(),
        mood,
        weather,
        memorablePlaces,
        photos,
        rating: Number(rating) || 5,
        actualExpenses: Number(actualExpenses) || 0
      });

      window.Modal.close();
      window.showToast(res.message, 'success');
      await DiaryPage.loadDiary();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  deleteEntry(entryId) {
    window.Modal.confirm({
      title: 'Delete Diary Entry?',
      message: 'Are you sure you want to remove this journal entry from your memories?',
      confirmText: 'Delete',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await window.API.delete(`/api/trips/${DiaryPage.tripId}/diary/${entryId}`);
          window.showToast('Diary entry deleted.', 'info');
          await DiaryPage.loadDiary();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  }
};

window.DiaryPage = DiaryPage;
