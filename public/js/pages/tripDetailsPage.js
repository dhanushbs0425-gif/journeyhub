/**
 * Page 7: Trip Details Page & Trip Readiness Checklist Hub
 */
const TripDetailsPage = {
  tripData: null,

  async render(params) {
    const tripId = params.tripId;

    return `
      <div class="trip-details-page">
        <div id="trip-details-content">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    const tripId = params.tripId;
    const container = document.getElementById('trip-details-content');
    if (!container) return;

    try {
      const res = await window.API.get(`/api/trips/${tripId}`);
      const trip = res.trip;
      TripDetailsPage.tripData = trip;
      window.State.setCurrentTrip(trip);
      window.Sidebar.render();
      window.Navbar.render();

      const start = new Date(trip.startDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const end = new Date(trip.endDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const readiness = trip.readiness || { score: 0, breakdown: {} };
      const isOrganiser = window.State.isOrganiser();
      const currentUserId = window.State.currentUser?._id?.toString() || '';
      const creatorId = (trip.createdBy?._id || trip.createdBy)?.toString() || '';
      const organiserId = (trip.organiserId?._id || trip.organiserId)?.toString() || '';
      const isOwner = isOrganiser && (
        trip.isOwner === true ||
        trip.userRole === 'owner' ||
        (currentUserId && (creatorId === currentUserId || organiserId === currentUserId))
      );
      const isMember = ['owner', 'editor', 'viewer'].includes(trip.userRole) || trip.isMember;
      const availableSeats = trip.availableSeats !== undefined ? trip.availableSeats : Math.max(0, (trip.capacity || 10) - (trip.members?.length || 1));
      const hasPendingReq = trip.joinRequestStatus === 'pending' || trip.myJoinRequestStatus === 'pending';

      let actionButtonsHtml = '';
      if (isOwner) {
        actionButtonsHtml = `
          ${trip.isPublished !== false ? `
            <button class="btn btn-outline" style="background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.3);" onclick="TripDetailsPage.togglePublish('${trip._id}', false)" title="Unpublish / Move to Drafts">
              <i class="fas fa-eye-slash"></i> Unpublish
            </button>
          ` : `
            <button class="btn btn-success" style="box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);" onclick="TripDetailsPage.togglePublish('${trip._id}', true)" title="Publish Expedition to Explore Directory">
              <i class="fas fa-globe"></i> Publish Trip
            </button>
          `}
          <button class="btn btn-outline" style="background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.3);" onclick="TripDetailsPage.openEditTripModal()">
            <i class="fas fa-edit"></i> Edit Trip
          </button>
          <button class="btn btn-danger btn-sm" onclick="TripDetailsPage.confirmDeleteTrip()" title="Delete Trip">
            <i class="fas fa-trash-alt"></i>
          </button>
        `;
      } else if (!isMember) {
        if (hasPendingReq) {
          actionButtonsHtml = `
            <a href="#/my-requests" class="btn btn-warning" style="box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
              <i class="fas fa-clock"></i> Join Request Pending
            </a>
          `;
        } else if (availableSeats > 0) {
          actionButtonsHtml = `
            <button class="btn btn-teal btn-lg" onclick="ExploreTripsPage.openJoinModal('${trip._id}', '${trip.title.replace(/'/g, "\\'")}', ${availableSeats})" style="box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
              <i class="fas fa-paper-plane"></i> Request to Join (${availableSeats} seats left)
            </button>
          `;
        } else {
          actionButtonsHtml = `
            <span class="badge badge-danger" style="font-size: 0.9rem; padding: 0.5rem 1rem;">Fully Booked</span>
          `;
        }
      }

      // Format Itinerary Activities HTML
      const activities = trip.activities || [];
      let activitiesHtml = '';
      if (activities.length > 0) {
        activitiesHtml = `
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${activities.map(act => `
              <div class="jh-card" style="padding: 1rem 1.25rem; background: var(--bg-surface, #f8fafc); border-left: 4px solid var(--primary-teal); margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                      <span class="badge badge-teal">Day ${act.dayNumber || 1}</span>
                      ${act.category ? `<span class="badge badge-navy">${act.category}</span>` : ''}
                      ${act.startTime ? `<span style="font-size: 0.8rem; color: var(--text-muted);"><i class="far fa-clock"></i> ${act.startTime}${act.endTime ? ` - ${act.endTime}` : ''}</span>` : ''}
                    </div>
                    <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0.2rem 0;">
                      ${act.title}
                    </h4>
                    ${act.location ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.15rem 0;"><i class="fas fa-map-pin" style="color: var(--primary-teal);"></i> ${act.location}</p>` : ''}
                    ${act.description ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.35rem; line-height: 1.4;">${act.description}</p>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        activitiesHtml = `
          <div style="text-align: center; padding: 2rem 1rem; color: var(--text-secondary);">
            <i class="far fa-calendar-times" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem;"></i>
            <p style="margin: 0;">No itinerary activities scheduled yet.</p>
            ${isOwner ? `
              <a href="#/trips/${trip._id}/itinerary" class="btn btn-teal btn-sm" style="margin-top: 0.75rem;">
                <i class="fas fa-plus"></i> Add Itinerary Activities
              </a>
            ` : ''}
          </div>
        `;
      }

      container.innerHTML = `
        <!-- Top Navigation Bar: Back to Trips button -->
        <div style="margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <a href="#/dashboard" class="btn btn-outline btn-sm" id="btn-back-to-trips" onclick="if (window.history.length > 1) { window.history.back(); return false; }">
            <i class="fas fa-arrow-left"></i> Back to Trips
          </a>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="badge ${trip.status === 'ongoing' ? 'badge-teal' : trip.status === 'completed' ? 'badge-success' : 'badge-navy'}" style="text-transform: uppercase;">
              ${trip.status}
            </span>
            ${isOwner ? '<span class="badge badge-orange"><i class="fas fa-user-shield"></i> Organiser Control</span>' : ''}
          </div>
        </div>

        <!-- Trip Hero Banner -->
        <div class="trip-hero">
          <img src="${trip.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'}" alt="${trip.title}" />
          <div class="trip-hero-overlay">
            <div style="flex: 1;">
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                <span class="badge ${trip.status === 'ongoing' ? 'badge-teal' : trip.status === 'completed' ? 'badge-success' : 'badge-navy'}">${trip.status}</span>
                <span class="badge badge-orange"><i class="fas fa-shield-alt"></i> ${(trip.userRole || (isOwner ? 'ORGANISER' : 'TRAVELER')).toUpperCase()}</span>
                ${trip.availableSeats !== undefined ? `<span class="badge badge-teal"><i class="fas fa-chair"></i> ${trip.availableSeats} of ${trip.capacity || 10} Seats</span>` : ''}
              </div>
              <h1 class="trip-hero-title">${trip.title}</h1>
              <div class="trip-hero-meta">
                <span><i class="fas fa-map-marker-alt" style="color: var(--teal-400);"></i> ${trip.destination}</span>
                <span><i class="far fa-calendar-alt"></i> ${start} - ${end}</span>
                <span><i class="fas fa-hourglass-half"></i> ${trip.durationDays} Days</span>
                <span><i class="fas fa-wallet"></i> Price: ${window.formatCurrency(trip.price || trip.estimatedBudget, trip.currency)}</span>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              ${actionButtonsHtml}
            </div>
          </div>
        </div>

        <!-- Distinctive Feature 5: Trip Readiness Checklist Gauge -->
        <div class="readiness-card">
          <div class="readiness-header">
            <div>
              <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--teal-400); font-weight: 700;">
                <i class="fas fa-tasks"></i> Distinctive Feature
              </div>
              <h2 style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-display);">Trip Readiness Checklist</h2>
              <p style="font-size: 0.85rem; color: #cbd5e1;">Evaluates itinerary schedule completeness, packing status, vouchers, and safety preparations</p>
            </div>
            <div style="text-align: right;">
              <div class="readiness-score-text">${readiness.score}%</div>
              <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">Overall Preparedness</div>
            </div>
          </div>

          <div class="progress-bar-container" style="height: 10px; background: rgba(255,255,255,0.15);">
            <div class="progress-bar-fill progress-teal" style="width: ${readiness.score}%;"></div>
          </div>

          <div class="readiness-pillars">
            <div class="pillar-item">
              <div class="pillar-label"><i class="fas fa-calendar-check" style="color: var(--teal-400);"></i> Itinerary (${readiness.breakdown?.itinerary?.score || 0}%)</div>
              <div class="pillar-val">${readiness.breakdown?.itinerary?.detail || 'No activities'}</div>
            </div>
            <div class="pillar-item">
              <div class="pillar-label"><i class="fas fa-suitcase" style="color: var(--accent-orange);"></i> Packing (${readiness.breakdown?.packing?.score || 0}%)</div>
              <div class="pillar-val">${readiness.breakdown?.packing?.detail || 'No items'}</div>
            </div>
            <div class="pillar-item">
              <div class="pillar-label"><i class="fas fa-ticket-alt" style="color: #38bdf8;"></i> Bookings (${readiness.breakdown?.bookings?.score || 0}%)</div>
              <div class="pillar-val">${readiness.breakdown?.bookings?.detail || 'No vouchers'}</div>
            </div>
            <div class="pillar-item">
              <div class="pillar-label"><i class="fas fa-first-aid" style="color: #f87171;"></i> Emergency (${readiness.breakdown?.emergency?.score || 0}%)</div>
              <div class="pillar-val">${readiness.breakdown?.emergency?.detail || 'None configured'}</div>
            </div>
            <div class="pillar-item">
              <div class="pillar-label"><i class="fas fa-user-friends" style="color: #a78bfa;"></i> Team (${readiness.breakdown?.team?.score || 0}%)</div>
              <div class="pillar-val">${readiness.breakdown?.team?.detail || '1 Member'}</div>
            </div>
          </div>
        </div>

        <!-- Itinerary & Included Activities -->
        <div class="jh-card" style="margin-bottom: 2rem;">
          <div class="jh-card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <h3 class="jh-card-title"><i class="fas fa-calendar-alt" style="color: var(--primary-teal);"></i> Trip Itinerary & Included Activities</h3>
            <a href="#/trips/${trip._id}/itinerary" class="btn btn-outline btn-sm"><i class="fas fa-tasks"></i> Full Itinerary Workspace</a>
          </div>
          <div class="jh-card-body">
            ${activitiesHtml}
          </div>
        </div>

        <!-- Quick Access Feature Navigation Grid -->
        <h3 style="font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem;">Trip Planning Modules</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
          <a href="#/trips/${trip._id}/itinerary" class="jh-card" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div class="brand-icon" style="background: var(--teal-50); color: var(--primary-teal); font-size: 1.25rem;"><i class="fas fa-calendar-alt"></i></div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700;">Day-Wise Itinerary</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Timeline, conflicts & missed recovery</p>
            </div>
          </a>

          <a href="#/trips/${trip._id}/collaboration" class="jh-card" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div class="brand-icon" style="background: #eef2ff; color: #6366f1; font-size: 1.25rem;"><i class="fas fa-users"></i></div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700;">Group Collaboration</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Invites, polls & availability matcher</p>
            </div>
          </a>

          <a href="#/trips/${trip._id}/expenses" class="jh-card" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div class="brand-icon" style="background: var(--orange-50); color: var(--accent-orange); font-size: 1.25rem;"><i class="fas fa-wallet"></i></div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700;">Expense Tracker</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Track spending & threshold alerts</p>
            </div>
          </a>

          <a href="#/trips/${trip._id}/settlements" class="jh-card" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div class="brand-icon" style="background: #fdf2f8; color: #ec4899; font-size: 1.25rem;"><i class="fas fa-hand-holding-usd"></i></div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700;">Debt Settlement</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Minimized who-owes-whom matrix</p>
            </div>
          </a>

          <a href="#/trips/${trip._id}/packing" class="jh-card" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div class="brand-icon" style="background: #ecfdf5; color: var(--success); font-size: 1.25rem;"><i class="fas fa-suitcase"></i></div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700;">Packing Checklist</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Items by category & team assignments</p>
            </div>
          </a>

          <a href="#/trips/${trip._id}/bookings" class="jh-card" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div class="brand-icon" style="background: #f0f9ff; color: var(--info); font-size: 1.25rem;"><i class="fas fa-ticket-alt"></i></div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700;">Bookings & Docs</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Flights, hotels & vouchers</p>
            </div>
          </a>

          <a href="#/trips/${trip._id}/diary" class="jh-card" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div class="brand-icon" style="background: #fff7ed; color: #ea580c; font-size: 1.25rem;"><i class="fas fa-book-open"></i></div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700;">Travel Diary</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Photos, daily notes & memories</p>
            </div>
          </a>

          <a href="#/trips/${trip._id}/reports" class="jh-card" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div class="brand-icon" style="background: #faf5ff; color: #9333ea; font-size: 1.25rem;"><i class="fas fa-chart-pie"></i></div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700;">Reports & Analytics</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Budget graphs & CSV export</p>
            </div>
          </a>
        </div>

        <!-- Trip Overview Description & Companions -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
          <div class="jh-card">
            <div class="jh-card-header">
              <h3 class="jh-card-title"><i class="fas fa-info-circle" style="color: var(--primary-teal);"></i> Trip Narrative & Overview</h3>
            </div>
            <div class="jh-card-body">
              <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 1rem;">
                ${trip.description || 'No description provided yet. Click "Edit Trip" to add trip details and milestones.'}
              </p>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${(trip.tags || []).map(t => `<span class="badge badge-teal">${t}</span>`).join('')}
              </div>
            </div>
          </div>

          <!-- Companions Card -->
          <div class="jh-card">
            <div class="jh-card-header">
              <h3 class="jh-card-title"><i class="fas fa-user-friends" style="color: var(--accent-orange);"></i> Travel Circle</h3>
              ${isOwner ? `<a href="#/trips/${trip._id}/collaboration" class="btn btn-outline btn-sm"><i class="fas fa-plus"></i> Invite</a>` : ''}
            </div>
            <div class="jh-card-body" style="padding: 1rem 1.25rem;">
              ${(trip.members || []).map(mem => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid var(--border-color);">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${mem.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;" />
                    <div>
                      <div style="font-size: 0.85rem; font-weight: 600;">${mem.user?.name || 'Member'}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${mem.user?.email || ''}</div>
                    </div>
                  </div>
                  <span class="badge ${mem.role === 'owner' ? 'badge-orange' : 'badge-navy'}">${mem.role}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <h3 class="empty-state-title">Trip Not Found</h3>
          <p class="empty-state-text" style="color: var(--danger);">${err.message || 'Unable to load trip details.'}</p>
          <a href="#/dashboard" class="btn btn-teal"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
        </div>
      `;
    }
  },

  openEditTripModal() {
    const trip = TripDetailsPage.tripData;
    if (!trip) return;

    const startStr = new Date(trip.startDate).toISOString().split('T')[0];
    const endStr = new Date(trip.endDate).toISOString().split('T')[0];

    window.Modal.open({
      title: 'Edit Trip Details',
      body: `
        <form id="edit-trip-modal-form">
          <div class="form-group">
            <label class="form-label" for="edit-title">Trip Title</label>
            <input type="text" id="edit-title" class="form-control" value="${trip.title}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-dest">Destination</label>
            <input type="text" id="edit-dest" class="form-control" value="${trip.destination}" required />
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="edit-budget">Estimated Total Budget <span id="edit-budget-currency-label">(${window.getCurrencySymbol(trip.currency)})</span> <span style="color: var(--danger);">*</span></label>
              <div style="position: relative;">
                <span id="edit-budget-currency-symbol" style="position: absolute; left: 12px; top: 10px; font-weight: 700; color: var(--primary-teal);">${window.getCurrencySymbol(trip.currency)}</span>
                <input type="number" id="edit-budget" class="form-control" value="${trip.estimatedBudget}" min="0" step="50" style="padding-left: 1.8rem;" required />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-currency">Currency</label>
              <select id="edit-currency" class="form-control">
                <option value="USD" ${(trip.currency || 'USD') === 'USD' ? 'selected' : ''}>USD ($ - US Dollar)</option>
                <option value="EUR" ${trip.currency === 'EUR' ? 'selected' : ''}>EUR (€ - Euro)</option>
                <option value="INR" ${trip.currency === 'INR' ? 'selected' : ''}>INR (₹ - Indian Rupee)</option>
                <option value="GBP" ${trip.currency === 'GBP' ? 'selected' : ''}>GBP (£ - British Pound)</option>
                <option value="JPY" ${trip.currency === 'JPY' ? 'selected' : ''}>JPY (¥ - Japanese Yen)</option>
                <option value="CAD" ${trip.currency === 'CAD' ? 'selected' : ''}>CAD (CA$ - Canadian Dollar)</option>
                <option value="AUD" ${trip.currency === 'AUD' ? 'selected' : ''}>AUD (AU$ - Australian Dollar)</option>
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="edit-start">Start Date</label>
              <input type="date" id="edit-start" class="form-control" value="${startStr}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-end">End Date</label>
              <input type="date" id="edit-end" class="form-control" value="${endStr}" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-cover">Cover Image URL</label>
            <input type="url" id="edit-cover" class="form-control" value="${trip.coverImage || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-desc">Description</label>
            <textarea id="edit-desc" class="form-control" rows="3">${trip.description || ''}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="TripDetailsPage.submitEditTrip()">Save Changes</button>
      `
    });

    // Attach real-time currency symbol update listeners to Edit modal
    setTimeout(() => {
      const editCurrency = document.getElementById('edit-currency');
      const editSymbol = document.getElementById('edit-budget-currency-symbol');
      const editLabel = document.getElementById('edit-budget-currency-label');
      if (editCurrency) {
        const updateEditSymbol = () => {
          const sym = window.getCurrencySymbol(editCurrency.value);
          if (editSymbol) editSymbol.textContent = sym;
          if (editLabel) editLabel.textContent = `(${sym})`;
        };
        editCurrency.addEventListener('change', updateEditSymbol);
        editCurrency.addEventListener('input', updateEditSymbol);
      }
    }, 50);
  },

  async submitEditTrip() {
    const tripId = TripDetailsPage.tripData?._id;
    if (!tripId) return;

    const title = document.getElementById('edit-title').value.trim();
    const destination = document.getElementById('edit-dest').value.trim();
    const estimatedBudget = document.getElementById('edit-budget').value;
    const currency = document.getElementById('edit-currency')?.value || TripDetailsPage.tripData?.currency || 'USD';
    const startDate = document.getElementById('edit-start').value;
    const endDate = document.getElementById('edit-end').value;
    const coverImage = document.getElementById('edit-cover').value.trim();
    const description = document.getElementById('edit-desc').value.trim();

    try {
      const res = await window.API.put(`/api/trips/${tripId}`, {
        title,
        destination,
        estimatedBudget: Number(estimatedBudget),
        currency,
        startDate,
        endDate,
        coverImage,
        description
      });

      window.Modal.close();
      window.showToast('Trip updated successfully!', 'success');
      window.State.setCurrentTrip(res.trip);
      await window.State.loadTrips();
      window.Sidebar.render();
      window.Navbar.render();
      TripDetailsPage.mount({ tripId });
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async togglePublish(tripId, shouldPublish) {
    try {
      const endpoint = `/api/trips/${tripId}/${shouldPublish ? 'publish' : 'unpublish'}`;
      const res = await window.API.post(endpoint);
      window.Toast?.show(res.message || `Expedition ${shouldPublish ? 'published' : 'moved to drafts'} successfully!`, 'success');
      await TripDetailsPage.mount({ tripId });
    } catch (err) {
      window.Toast?.show('Could not update publication status: ' + err.message, 'error');
    }
  },

  confirmDeleteTrip() {
    const trip = TripDetailsPage.tripData;
    if (!trip) return;

    window.Modal.confirm({
      title: 'Delete Entire Trip?',
      message: `Are you sure you want to delete "${trip.title}"? This will permanently erase all itineraries, expense records, bookings, and checklists associated with this trip.`,
      confirmText: 'Delete Permanently',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await window.API.delete(`/api/trips/${trip._id}`);
          window.showToast('Trip deleted successfully.', 'info');
          await window.State.loadTrips();
          window.location.hash = '#/dashboard';
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  }
};

window.TripDetailsPage = TripDetailsPage;
