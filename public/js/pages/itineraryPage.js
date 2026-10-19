/**
 * Page 9: Day-Wise Itinerary Planner & Missed-Activity Recovery Engine
 */
const ItineraryPage = {
  tripId: null,
  activeDay: 1,
  itineraryData: null,

  async render(params) {
    ItineraryPage.tripId = params.tripId;

    return `
      <div class="itinerary-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Day-Wise Itinerary Planner</h1>
            <p class="page-subtitle">Chronological timeline, interval overlap detection, and smart missed-activity recovery</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-outline" onclick="ItineraryPage.openWhatIfModal()"><i class="fas fa-magic" style="color: var(--accent-orange);"></i> What-If Simulator</button>
            <button class="btn btn-teal" onclick="ItineraryPage.openAddActivityModal()"><i class="fas fa-plus"></i> Add Activity</button>
          </div>
        </div>

        <!-- Schedule Conflict Banner (if any) -->
        <div id="itinerary-conflicts-banner" style="display: none; margin-bottom: 1.5rem;"></div>

        <!-- Day Tabs Bar -->
        <div class="tabs-header" id="itinerary-day-tabs"></div>

        <!-- Activities Timeline Container -->
        <div id="itinerary-timeline-container">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    ItineraryPage.tripId = params.tripId;
    await ItineraryPage.loadItinerary();
  },

  async loadItinerary() {
    try {
      const res = await window.API.get(`/api/trips/${ItineraryPage.tripId}/itinerary`);
      ItineraryPage.itineraryData = res;
      ItineraryPage.renderDayTabs();
      ItineraryPage.renderConflictsBanner();
      ItineraryPage.renderActivities();
    } catch (err) {
      document.getElementById('itinerary-timeline-container').innerHTML = `
        <div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>
      `;
    }
  },

  renderConflictsBanner() {
    const banner = document.getElementById('itinerary-conflicts-banner');
    if (!banner) return;

    const conflicts = ItineraryPage.itineraryData?.conflicts || [];
    if (conflicts.length > 0) {
      banner.style.display = 'block';
      banner.innerHTML = `
        <div style="background-color: var(--warning-bg); border: 1px solid var(--warning); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
            <i class="fas fa-exclamation-triangle" style="color: var(--warning); font-size: 1.2rem;"></i>
            <h4 style="font-weight: 700; color: #92400e; font-size: 0.95rem;">${conflicts.length} Schedule Conflict${conflicts.length === 1 ? '' : 's'} Detected!</h4>
          </div>
          <ul style="padding-left: 1.75rem; font-size: 0.85rem; color: #78350f;">
            ${conflicts.map(c => `<li><strong>Day ${c.day}:</strong> ${c.message} (${c.overlapMinutes} min overlap)</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      banner.style.display = 'none';
    }
  },

  renderDayTabs() {
    const tabsContainer = document.getElementById('itinerary-day-tabs');
    if (!tabsContainer) return;

    const trip = window.State.currentTrip;
    const totalDays = trip?.durationDays || 5;

    let tabsHtml = '';
    for (let day = 1; day <= totalDays; day++) {
      const isDayActive = ItineraryPage.activeDay === day;
      const dayActs = (ItineraryPage.itineraryData?.groupedDays || {})[day] || [];
      const hasConflict = dayActs.some(a => (ItineraryPage.itineraryData?.conflicts || []).some(c => c.activity1.id === a._id || c.activity2.id === a._id));

      tabsHtml += `
        <button class="tab-btn ${isDayActive ? 'active' : ''}" onclick="ItineraryPage.selectDay(${day}, this)">
          Day ${day} ${dayActs.length > 0 ? `<span style="opacity: 0.7; font-size: 0.75rem;">(${dayActs.length})</span>` : ''}
          ${hasConflict ? `<i class="fas fa-circle" style="color: var(--warning); font-size: 0.5rem; margin-left: 4px;"></i>` : ''}
        </button>
      `;
    }

    tabsHtml += `
      <button class="tab-btn ${ItineraryPage.activeDay === 'all' ? 'active' : ''}" onclick="ItineraryPage.selectDay('all', this)">
        All Days
      </button>
    `;

    tabsContainer.innerHTML = tabsHtml;
  },

  selectDay(day, btn) {
    ItineraryPage.activeDay = day;
    document.querySelectorAll('#itinerary-day-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    ItineraryPage.renderActivities();
  },

  renderActivities() {
    const container = document.getElementById('itinerary-timeline-container');
    if (!container) return;

    const data = ItineraryPage.itineraryData;
    if (!data) return;

    let activitiesToShow = [];
    if (ItineraryPage.activeDay === 'all') {
      activitiesToShow = data.activities || [];
    } else {
      activitiesToShow = (data.groupedDays || {})[ItineraryPage.activeDay] || [];
    }

    if (activitiesToShow.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="far fa-calendar-plus"></i></div>
          <h3 class="empty-state-title">No activities planned for Day ${ItineraryPage.activeDay}</h3>
          <p class="empty-state-text">Add a sightseeing stop, lunch reservation, or transit ticket to build out this day's plan.</p>
          <button class="btn btn-teal" onclick="ItineraryPage.openAddActivityModal()"><i class="fas fa-plus"></i> Add Activity</button>
        </div>
      `;
      return;
    }

    const conflicts = data.conflicts || [];

    container.innerHTML = `
      <div class="itinerary-timeline">
        ${activitiesToShow.map((act, index) => {
          const isConflict = conflicts.some(c => c.activity1.id === act._id || c.activity2.id === act._id);
          const isMissed = act.isMissed;

          return `
            <div class="activity-card ${isConflict ? 'activity-conflict' : ''} ${isMissed ? 'activity-missed' : ''}">
              <div class="activity-time-block">
                <div>${act.startTime}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">to</div>
                <div>${act.endTime}</div>
              </div>

              <div class="activity-main">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="badge badge-teal">${act.category}</span>
                    <span class="badge badge-navy">Day ${act.dayNumber}</span>
                    ${isMissed ? `<span class="badge badge-danger"><i class="fas fa-exclamation-circle"></i> Missed: ${act.missedReason || 'Delayed'}</span>` : ''}
                    ${isConflict ? `<span class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> Schedule Overlap</span>` : ''}
                  </div>

                  <!-- Actions Dropdown / Buttons -->
                  <div style="display: flex; gap: 0.4rem;">
                    ${isMissed ? `
                      <button class="btn btn-teal btn-sm" onclick="ItineraryPage.openRecoveryModal('${act._id}')" title="Smart Recovery Gap Slot Engine">
                        <i class="fas fa-history"></i> Recover & Reschedule
                      </button>
                    ` : `
                      <button class="btn btn-outline btn-sm" onclick="ItineraryPage.markMissedPrompt('${act._id}', '${act.title.replace(/'/g, "\\'")}')" title="Mark Missed">
                        <i class="fas fa-calendar-times" style="color: var(--danger);"></i> Mark Missed
                      </button>
                    `}
                    <button class="btn btn-outline btn-sm" onclick="ItineraryPage.openEditActivityModal('${act._id}')" title="Edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="ItineraryPage.deleteActivity('${act._id}')" title="Delete">
                      <i class="fas fa-trash-alt" style="color: var(--danger);"></i>
                    </button>
                  </div>
                </div>

                <h3 class="activity-title">${act.title}</h3>

                <div class="activity-meta">
                  ${act.location ? `<span><i class="fas fa-map-marker-alt" style="color: var(--accent-orange);"></i> ${act.location}</span>` : ''}
                  <span><i class="fas fa-wallet" style="color: var(--primary-teal);"></i> Est. ${window.formatCurrency(act.estimatedCost || 0, window.State.currentTrip?.currency)}</span>
                  ${act.bookingReference ? `<span><i class="fas fa-ticket-alt" style="color: var(--info);"></i> Ref: ${act.bookingReference}</span>` : ''}
                  ${act.assignedTo && act.assignedTo.length > 0 ? `<span><i class="fas fa-user-friends"></i> ${act.assignedTo.map(u => u.name).join(', ')}</span>` : ''}
                </div>

                ${act.description ? `<p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5;">${act.description}</p>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openAddActivityModal() {
    const trip = window.State.currentTrip;
    const currentDay = typeof ItineraryPage.activeDay === 'number' ? ItineraryPage.activeDay : 1;

    window.Modal.open({
      title: 'Schedule New Activity',
      body: `
        <form id="add-act-form">
          <div class="form-group">
            <label class="form-label">Activity Title <span style="color: var(--danger);">*</span></label>
            <input type="text" id="act-title" class="form-control" placeholder="e.g. Fushimi Inari Torii Gate Hike" required />
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Day Number</label>
              <input type="number" id="act-day" class="form-control" value="${currentDay}" min="1" max="${trip?.durationDays || 30}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="act-cat" class="form-control">
                <option value="Sightseeing">Sightseeing</option>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Adventure">Adventure</option>
                <option value="Travel & Transit">Travel & Transit</option>
                <option value="Culture">Culture</option>
                <option value="Leisure">Leisure</option>
                <option value="Shopping">Shopping</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Start Time (24h) <span style="color: var(--danger);">*</span></label>
              <input type="time" id="act-start" class="form-control" value="10:00" required />
            </div>
            <div class="form-group">
              <label class="form-label">End Time (24h) <span style="color: var(--danger);">*</span></label>
              <input type="time" id="act-end" class="form-control" value="12:00" required />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Location / Address</label>
              <input type="text" id="act-loc" class="form-control" placeholder="e.g. Fushimi Inari Shrine" />
            </div>
            <div class="form-group">
              <label class="form-label">Estimated Cost (${window.getCurrencySymbol(trip?.currency)})</label>
              <input type="number" id="act-cost" class="form-control" value="0" min="0" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description / Notes</label>
            <textarea id="act-desc" class="form-control" rows="2" placeholder="Important tips, meetup points, or booking vouchers..."></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="ItineraryPage.submitAddActivity()">Save Activity</button>
      `
    });
  },

  async submitAddActivity() {
    const title = document.getElementById('act-title').value.trim();
    const dayNumber = document.getElementById('act-day').value;
    const category = document.getElementById('act-cat').value;
    const startTime = document.getElementById('act-start').value;
    const endTime = document.getElementById('act-end').value;
    const location = document.getElementById('act-loc').value.trim();
    const estimatedCost = document.getElementById('act-cost').value;
    const description = document.getElementById('act-desc').value.trim();

    if (!title || !startTime || !endTime) {
      window.showToast('Please provide title, start time, and end time.', 'warning');
      return;
    }

    try {
      const res = await window.API.post(`/api/trips/${ItineraryPage.tripId}/itinerary`, {
        title,
        dayNumber: Number(dayNumber),
        category,
        startTime,
        endTime,
        location,
        estimatedCost: Number(estimatedCost),
        description
      });

      window.Modal.close();
      window.showToast(res.message, res.hasConflicts ? 'warning' : 'success');
      await ItineraryPage.loadItinerary();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  openEditActivityModal(activityId) {
    const act = (ItineraryPage.itineraryData?.activities || []).find(a => a._id === activityId);
    if (!act) return;

    window.Modal.open({
      title: 'Edit Scheduled Activity',
      body: `
        <form id="edit-act-form">
          <div class="form-group">
            <label class="form-label">Activity Title</label>
            <input type="text" id="edit-act-title" class="form-control" value="${act.title}" required />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Day Number</label>
              <input type="number" id="edit-act-day" class="form-control" value="${act.dayNumber}" min="1" required />
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="edit-act-cat" class="form-control">
                ${['Sightseeing', 'Food & Dining', 'Adventure', 'Travel & Transit', 'Culture', 'Leisure', 'Shopping', 'Other'].map(c => `
                  <option value="${c}" ${act.category === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Start Time</label>
              <input type="time" id="edit-act-start" class="form-control" value="${act.startTime}" required />
            </div>
            <div class="form-group">
              <label class="form-label">End Time</label>
              <input type="time" id="edit-act-end" class="form-control" value="${act.endTime}" required />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Location</label>
              <input type="text" id="edit-act-loc" class="form-control" value="${act.location || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Estimated Cost (${window.getCurrencySymbol(window.State.currentTrip?.currency)})</label>
              <input type="number" id="edit-act-cost" class="form-control" value="${act.estimatedCost || 0}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="edit-act-desc" class="form-control" rows="2">${act.description || ''}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="ItineraryPage.submitEditActivity('${act._id}')">Update Activity</button>
      `
    });
  },

  async submitEditActivity(activityId) {
    const title = document.getElementById('edit-act-title').value.trim();
    const dayNumber = document.getElementById('edit-act-day').value;
    const category = document.getElementById('edit-act-cat').value;
    const startTime = document.getElementById('edit-act-start').value;
    const endTime = document.getElementById('edit-act-end').value;
    const location = document.getElementById('edit-act-loc').value.trim();
    const estimatedCost = document.getElementById('edit-act-cost').value;
    const description = document.getElementById('edit-act-desc').value.trim();

    try {
      const res = await window.API.put(`/api/trips/${ItineraryPage.tripId}/itinerary/${activityId}`, {
        title,
        dayNumber: Number(dayNumber),
        category,
        startTime,
        endTime,
        location,
        estimatedCost: Number(estimatedCost),
        description
      });

      window.Modal.close();
      window.showToast(res.message, res.hasConflicts ? 'warning' : 'success');
      await ItineraryPage.loadItinerary();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  deleteActivity(activityId) {
    window.Modal.confirm({
      title: 'Remove Activity?',
      message: 'Are you sure you want to remove this activity from your itinerary?',
      confirmText: 'Remove',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await window.API.delete(`/api/trips/${ItineraryPage.tripId}/itinerary/${activityId}`);
          window.showToast('Activity removed.', 'info');
          await ItineraryPage.loadItinerary();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  },

  /* Distinctive Feature 2: Missed-Activity Recovery Prompt & Engine */
  markMissedPrompt(activityId, title) {
    window.Modal.open({
      title: 'Mark Activity as Missed',
      body: `
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
          Missed "<strong>${title}</strong>" due to flight delays, bad weather, or resting?
          Marking it will initiate the <strong>Smart Recovery Engine</strong> to scan remaining days for open reschedule gap slots.
        </p>
        <div class="form-group">
          <label class="form-label" for="missed-reason">Reason for missing (optional)</label>
          <input type="text" id="missed-reason" class="form-control" placeholder="e.g. Heavy afternoon rain / Flight delayed" />
        </div>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-danger" onclick="ItineraryPage.submitMarkMissed('${activityId}')">Mark Missed & Find Gap Slots</button>
      `
    });
  },

  async submitMarkMissed(activityId) {
    const reason = document.getElementById('missed-reason')?.value.trim() || 'Delayed schedule';
    try {
      const res = await window.API.post(`/api/trips/${ItineraryPage.tripId}/itinerary/${activityId}/missed`, { reason });
      window.Modal.close();
      window.showToast('Activity marked as missed. Opening recovery gap suggestions...', 'warning');
      await ItineraryPage.loadItinerary();
      ItineraryPage.renderRecoveryModal(res.activity, res.recoverySuggestions);
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async openRecoveryModal(activityId) {
    try {
      // Re-trigger missed recovery endpoint to fetch fresh gap slots
      const res = await window.API.post(`/api/trips/${ItineraryPage.tripId}/itinerary/${activityId}/missed`, {});
      ItineraryPage.renderRecoveryModal(res.activity, res.recoverySuggestions);
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  renderRecoveryModal(activity, suggestions = []) {
    let slotsHtml = '';

    if (suggestions.length === 0) {
      slotsHtml = `
        <div class="empty-state" style="padding: 2rem 1rem;">
          <p style="color: var(--warning); font-size: 0.9rem;">No open gap slots found on remaining days that fit this ${activity.durationMinutes || 60}-minute activity. Consider extending trip or swapping an existing item.</p>
        </div>
      `;
    } else {
      slotsHtml = suggestions.map(sug => `
        <div style="background-color: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              <i class="fas fa-calendar-day" style="color: var(--primary-teal);"></i> Day ${sug.dayNumber} (${sug.date})
            </h4>
            <span class="badge badge-teal">${sug.availableSlotsCount} Open Slot${sug.availableSlotsCount === 1 ? '' : 's'}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${sug.slots.map(slot => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                <div>
                  <span style="font-weight: 700; color: var(--text-main); font-size: 0.85rem;">${slot.suggestedStartTime} - ${slot.suggestedEndTime}</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">(Gap window: ${slot.windowStart} to ${slot.windowEnd}, ${slot.gapDurationMinutes} mins free)</span>
                </div>
                <button class="btn btn-teal btn-sm" onclick="ItineraryPage.confirmReschedule('${activity._id}', ${sug.dayNumber}, '${slot.suggestedStartTime}', '${slot.suggestedEndTime}')">
                  <i class="fas fa-check"></i> Choose Slot
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    }

    window.Modal.open({
      title: 'Missed-Activity Recovery Engine',
      isLarge: true,
      body: `
        <div style="margin-bottom: 1.25rem;">
          <div style="background: var(--teal-50); border-left: 4px solid var(--primary-teal); padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1.25rem;">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--teal-600);"><i class="fas fa-magic"></i> Gap Analysis for "${activity.title}"</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Duration: <strong>${activity.durationMinutes || 60} minutes</strong>. The recovery algorithm scanned subsequent days to find open schedule intervals with zero overlapping conflicts:
            </p>
          </div>
          ${slotsHtml}
        </div>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Close</button>
      `
    });
  },

  async confirmReschedule(activityId, targetDayNumber, newStartTime, newEndTime) {
    try {
      const res = await window.API.post(`/api/trips/${ItineraryPage.tripId}/itinerary/${activityId}/reschedule`, {
        targetDayNumber,
        newStartTime,
        newEndTime
      });

      window.Modal.close();
      window.showToast(res.message, 'success');
      ItineraryPage.activeDay = targetDayNumber;
      await ItineraryPage.loadItinerary();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  /* Distinctive Feature 1: What-If Trip Simulator */
  async openWhatIfModal() {
    try {
      const res = await window.API.get(`/api/trips/${ItineraryPage.tripId}/scenarios`);
      const scenarios = res.scenarios || [];
      const simCurr = window.getCurrencySymbol(window.State.currentTrip?.currency);

      window.Modal.open({
        title: 'What-If Trip Simulator',
        isLarge: true,
        body: `
          <div style="margin-bottom: 1.5rem;">
            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">
              Test hypothetical additions, luxury upgrades, or schedule density adjustments in a sandbox.
              Compare <strong>Cost Difference (±${simCurr})</strong>, <strong>Time Impact</strong>, and <strong>Schedule Conflicts</strong> without touching the real plan until you choose to merge.
            </p>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-size: 1rem; font-weight: 700;">Simulated Scenarios</h4>
            <button class="btn btn-orange btn-sm" onclick="ItineraryPage.createNewScenarioPrompt()"><i class="fas fa-plus"></i> New Scenario</button>
          </div>

          <div id="scenarios-list-box">
            ${scenarios.length === 0 ? `
              <div class="empty-state" style="padding: 2rem 1rem;">
                <p style="color: var(--text-muted); font-size: 0.85rem;">No simulation scenarios created yet. Click "New Scenario" to test changes!</p>
              </div>
            ` : scenarios.map(sc => `
              <div class="jh-card" style="padding: 1.25rem; margin-bottom: 1rem; border: 1px solid ${sc.status === 'applied' ? 'var(--success)' : 'var(--border-color)'};">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <h4 style="font-size: 1.05rem; font-weight: 700;">${sc.name}</h4>
                  <span class="badge ${sc.status === 'applied' ? 'badge-success' : 'badge-navy'}">${sc.status}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">${sc.description || 'No description'}</p>

                <div class="simulator-metric-grid" style="margin: 0.75rem 0;">
                  <div class="sim-metric-card">
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Delta Cost</div>
                    <div class="sim-metric-value ${sc.deltaCost > 0 ? 'sim-metric-delta-pos' : 'sim-metric-delta-neg'}">
                      ${sc.deltaCost > 0 ? `+${simCurr}${sc.deltaCost}` : sc.deltaCost < 0 ? `-${simCurr}${Math.abs(sc.deltaCost)}` : `${simCurr}0`}
                    </div>
                  </div>
                  <div class="sim-metric-card">
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Duration Delta</div>
                    <div class="sim-metric-value" style="color: var(--info);">
                      ${sc.deltaDurationMinutes > 0 ? `+${sc.deltaDurationMinutes}m` : `${sc.deltaDurationMinutes}m`}
                    </div>
                  </div>
                  <div class="sim-metric-card">
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Conflicts</div>
                    <div class="sim-metric-value" style="color: ${sc.conflictCount > 0 ? 'var(--warning)' : 'var(--success)'};">
                      ${sc.conflictCount}
                    </div>
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  ${sc.status !== 'applied' ? `
                    <button class="btn btn-teal btn-sm" onclick="ItineraryPage.applyScenario('${sc._id}')">
                      <i class="fas fa-check-double"></i> Apply Scenario to Live Trip
                    </button>
                  ` : `<span style="font-size: 0.8rem; color: var(--success); font-weight: 600;"><i class="fas fa-check"></i> Applied to Live Itinerary</span>`}
                </div>
              </div>
            `).join('')}
          </div>
        `,
        footer: `
          <button class="btn btn-outline" onclick="Modal.close()">Close</button>
        `
      });
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  createNewScenarioPrompt() {
    window.Modal.open({
      title: 'Initialize What-If Scenario',
      body: `
        <form id="new-scenario-form">
          <div class="form-group">
            <label class="form-label">Scenario Name <span style="color: var(--danger);">*</span></label>
            <input type="text" id="scenario-name" class="form-control" placeholder="e.g. VIP Helicopter Tour & Private Chef Option" required />
          </div>
          <div class="form-group">
            <label class="form-label">Hypothesis / Description</label>
            <textarea id="scenario-desc" class="form-control" rows="3" placeholder="What changes are you evaluating in this scenario?"></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="ItineraryPage.openWhatIfModal()">Back</button>
        <button class="btn btn-orange" onclick="ItineraryPage.submitCreateScenario()">Create Scenario</button>
      `
    });
  },

  async submitCreateScenario() {
    const name = document.getElementById('scenario-name')?.value.trim();
    const description = document.getElementById('scenario-desc')?.value.trim();

    if (!name) {
      window.showToast('Please enter a scenario name.', 'warning');
      return;
    }

    try {
      const res = await window.API.post(`/api/trips/${ItineraryPage.tripId}/scenarios`, { name, description });
      window.showToast('Scenario initialized with current itinerary snapshot!', 'success');
      // Run initial simulation test adding a sample upgraded excursion
      const sampleSimActivities = [
        ...res.scenario.simulatedActivities,
        {
          dayNumber: 2,
          title: 'Private Sunset Helicopter Excursion',
          startTime: '16:00',
          endTime: '17:30',
          estimatedCost: 350,
          category: 'Adventure',
          isCustomNew: true
        }
      ];
      await window.API.post(`/api/trips/${ItineraryPage.tripId}/scenarios/${res.scenario._id}/simulate`, {
        updatedActivities: sampleSimActivities
      });
      await ItineraryPage.openWhatIfModal();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async applyScenario(scenarioId) {
    window.Modal.confirm({
      title: 'Apply Scenario to Live Trip?',
      message: 'This will replace your current live itinerary with the simulated activities from this scenario. Are you sure you wish to apply these changes?',
      confirmText: 'Apply to Live Trip',
      confirmClass: 'btn-teal',
      onConfirm: async () => {
        try {
          const res = await window.API.post(`/api/trips/${ItineraryPage.tripId}/scenarios/${scenarioId}/apply`, {});
          window.showToast(res.message, 'success');
          await ItineraryPage.loadItinerary();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  }
};

window.ItineraryPage = ItineraryPage;
