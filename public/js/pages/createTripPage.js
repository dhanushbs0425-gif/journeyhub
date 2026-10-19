/**
 * Page 6: Create Trip Page
 * STRICT ENFORCEMENT: Only users with the Organiser role can access or create trips.
 */
const CreateTripPage = {
  render() {
    const user = window.State.currentUser;
    const isOrganiser = window.State.isOrganiser();

    if (!user || !isOrganiser) {
      return `
        <div class="page-container" style="max-width: 600px; margin: 4rem auto; text-align: center;">
          <div class="jh-card" style="padding: 3rem 2rem; border-top: 4px solid #ef4444;">
            <i class="fas fa-user-shield" style="font-size: 3.5rem; color: #ef4444; margin-bottom: 1rem;"></i>
            <h2 style="font-weight: 800; color: var(--text-main);">Organiser Access Required</h2>
            <p style="color: var(--text-secondary); margin: 0.75rem 0 1.5rem 0; line-height: 1.5;">
              Only users with the verified <strong>Organiser</strong> role can create and publish trips. Regular users can browse published journeys and request to join.
            </p>
            <div style="display: flex; gap: 0.75rem; justify-content: center;">
              <a href="#/explore-trips" class="btn btn-teal">Explore Trips</a>
              <a href="#/dashboard" class="btn btn-outline">My Dashboard</a>
            </div>
          </div>
        </div>
      `;
    }

    const defaultCurrency = user?.preferences?.currency || 'INR';

    // Default dates: +14 days to +19 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 14);
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 5);

    const deadline = new Date(tomorrow);
    deadline.setDate(deadline.getDate() - 3);

    const startStr = tomorrow.toISOString().split('T')[0];
    const endStr = nextWeek.toISOString().split('T')[0];
    const deadlineStr = deadline.toISOString().split('T')[0];

    return `
      <div class="create-trip-page" style="max-width: 820px; margin: 0 auto; padding-bottom: 3rem;">
        <div class="page-header" style="margin-bottom: 1.5rem; border-left: 4px solid var(--primary-teal); padding-left: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-teal">Organiser Portal</span>
            </div>
            <h1 class="page-title">Create & Publish a New Expedition</h1>
            <p class="page-subtitle">Configure destination, seat capacity limits, pricing, and itinerary milestones</p>
          </div>
          <a href="#/organiser-trips" class="btn btn-outline btn-sm"><i class="fas fa-arrow-left"></i> Manage Trips</a>
        </div>

        <div class="jh-card">
          <div class="jh-card-body" style="padding: 2rem;">
            <form id="create-trip-form" novalidate>
              <!-- Destination & Title -->
              <div class="form-group">
                <label class="form-label" for="trip-title">Expedition Title <span style="color: var(--danger, #ef4444);">*</span></label>
                <input type="text" id="trip-title" class="form-control" placeholder="e.g. Royal Rajasthan Heritage Odyssey" required />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="trip-destination">Primary Destination <span style="color: var(--danger, #ef4444);">*</span></label>
                  <input type="text" id="trip-destination" class="form-control" placeholder="e.g. Jaipur & Udaipur, Rajasthan" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="trip-tags">Travel Tags (comma-separated)</label>
                  <input type="text" id="trip-tags" class="form-control" placeholder="e.g. Heritage, Forts, Palaces" value="Heritage & Historical, Group Tour" />
                </div>
              </div>

              <!-- Dates & Joining Deadline -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label" for="trip-start-date">Start Date <span style="color: var(--danger, #ef4444);">*</span></label>
                  <input type="date" id="trip-start-date" class="form-control" value="${startStr}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="trip-end-date">End Date <span style="color: var(--danger, #ef4444);">*</span></label>
                  <input type="date" id="trip-end-date" class="form-control" value="${endStr}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="trip-joining-deadline">Joining Deadline</label>
                  <input type="date" id="trip-joining-deadline" class="form-control" value="${deadlineStr}" />
                </div>
              </div>

              <!-- Capacity Quota & Pricing -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label" for="trip-capacity">Total Seat Capacity <span style="color: var(--danger, #ef4444);">*</span></label>
                  <input type="number" id="trip-capacity" class="form-control" value="10" min="1" max="100" required />
                  <div class="form-hint">Maximum confirmed travelers</div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="trip-price">Seat Price / Cost <span id="trip-budget-currency-label">(₹)</span> <span style="color: var(--danger, #ef4444);">*</span></label>
                  <div style="position: relative;">
                    <span id="trip-budget-currency-symbol" style="position: absolute; left: 12px; top: 10px; font-weight: 700; color: var(--primary-teal);">₹</span>
                    <input type="number" id="trip-price" class="form-control" placeholder="15000" value="18500" min="0" step="100" style="padding-left: 1.8rem;" required />
                  </div>
                  <div class="form-hint">Cost per traveler</div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="trip-currency">Currency</label>
                  <select id="trip-currency" class="form-control">
                    <option value="INR" ${defaultCurrency === 'INR' ? 'selected' : ''}>INR (₹ - Indian Rupee)</option>
                    <option value="USD" ${defaultCurrency === 'USD' ? 'selected' : ''}>USD ($ - US Dollar)</option>
                    <option value="EUR" ${defaultCurrency === 'EUR' ? 'selected' : ''}>EUR (€ - Euro)</option>
                    <option value="GBP" ${defaultCurrency === 'GBP' ? 'selected' : ''}>GBP (£ - British Pound)</option>
                  </select>
                </div>
              </div>

              <!-- Cover Image & Description -->
              <div class="form-group">
                <label class="form-label" for="trip-cover">Cover Image URL</label>
                <input type="url" id="trip-cover" class="form-control" value="https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80" placeholder="https://..." />
                <div class="form-hint">High resolution travel photo for public card display</div>
              </div>

              <div class="form-group">
                <label class="form-label" for="trip-desc">Trip Description & Overview</label>
                <textarea id="trip-desc" class="form-control" rows="3" placeholder="Outline the expedition theme, highlights, inclusions, and traveler expectations..."></textarea>
              </div>

              <!-- Publish status -->
              <div class="form-group" style="background: rgba(13, 148, 136, 0.08); padding: 1rem; border-radius: 8px; border: 1px solid rgba(13, 148, 136, 0.2);">
                <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-weight: 600; color: var(--text-main); margin-bottom: 0;">
                  <input type="checkbox" id="trip-publish" checked style="width: 18px; height: 18px; accent-color: var(--primary-teal);" />
                  <span>Publish to Explore Trips Directory immediately</span>
                </label>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; margin-left: 1.8rem;">
                  Published trips appear on the public Explore Trips page for travelers to discover and request to join.
                </div>
              </div>

              <!-- Emergency Contact -->
              <div style="background-color: var(--bg-surface); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; border: 1px solid var(--border-color);">
                <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-main);"><i class="fas fa-shield-alt" style="color: var(--primary-teal);"></i> Organiser Emergency Contact</h4>
                <div class="form-grid-2">
                  <input type="text" id="trip-emg-name" class="form-control" placeholder="Contact Name" value="${user?.name || ''}" />
                  <input type="tel" id="trip-emg-phone" class="form-control" placeholder="Contact Phone Number" value="${user?.phone || '+91 98765 43210'}" />
                </div>
              </div>

              <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <a href="#/organiser-trips" class="btn btn-outline">Cancel</a>
                <button type="submit" class="btn btn-teal btn-lg" id="create-trip-btn">
                  <i class="fas fa-check-circle"></i> Create Trip & Launch Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  mount() {
    const isOrganiser = window.State.isOrganiser();
    if (!window.State.currentUser || !isOrganiser) {
      return;
    }

    const form = document.getElementById('create-trip-form');
    if (!form) return;

    const currencySelect = document.getElementById('trip-currency');
    const symbolSpan = document.getElementById('trip-budget-currency-symbol');
    const labelSpan = document.getElementById('trip-budget-currency-label');
    if (currencySelect) {
      const updateCurrencyDisplay = () => {
        const sym = window.getCurrencySymbol(currencySelect.value);
        if (symbolSpan) symbolSpan.textContent = sym;
        if (labelSpan) labelSpan.textContent = `(${sym})`;
      };
      currencySelect.addEventListener('change', updateCurrencyDisplay);
      currencySelect.addEventListener('input', updateCurrencyDisplay);
      updateCurrencyDisplay();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('trip-title')?.value.trim();
      const destination = document.getElementById('trip-destination')?.value.trim();
      const startDate = document.getElementById('trip-start-date')?.value;
      const endDate = document.getElementById('trip-end-date')?.value;
      const joiningDeadline = document.getElementById('trip-joining-deadline')?.value;
      const capacity = Number(document.getElementById('trip-capacity')?.value) || 10;
      const price = Number(document.getElementById('trip-price')?.value) || 15000;
      const currency = document.getElementById('trip-currency')?.value || 'INR';
      const coverImage = document.getElementById('trip-cover')?.value.trim();
      const description = document.getElementById('trip-desc')?.value.trim();
      const isPublished = document.getElementById('trip-publish')?.checked !== false;

      const emgName = document.getElementById('trip-emg-name')?.value.trim();
      const emgPhone = document.getElementById('trip-emg-phone')?.value.trim();

      const tagsInput = document.getElementById('trip-tags')?.value;
      const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];

      if (!title || !destination || !startDate || !endDate) {
        window.Toast?.show('Please fill in all required fields.', 'warning');
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        window.Toast?.show('End date cannot precede the start date.', 'warning');
        return;
      }

      const submitBtn = document.getElementById('create-trip-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; margin: 0; display: inline-block;"></span> Creating...`;

      try {
        const payload = {
          title,
          destination,
          startDate,
          endDate,
          joiningDeadline,
          capacity,
          availableSeats: capacity,
          price,
          estimatedBudget: price,
          currency,
          coverImage: coverImage || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
          description,
          tags,
          isPublished,
          status: 'upcoming'
        };

        if (emgName && emgPhone) {
          payload.emergencyContacts = [{ name: emgName, relation: 'Organiser Direct Line', phone: emgPhone }];
        }

        const res = await window.API.post('/api/trips', payload);

        window.Toast?.show(`Expedition "${title}" created successfully!`, 'success');

        // Refresh state
        await window.State.loadTrips();
        if (res.trip) {
          window.State.setCurrentTrip(res.trip);
          window.location.hash = `#/trips/${res.trip._id}`;
        } else {
          window.location.hash = '#/organiser-trips';
        }
      } catch (err) {
        window.Toast?.show(err.message || 'Failed to create trip', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> Create Trip & Launch Workspace`;
      }
    });
  }
};

window.CreateTripPage = CreateTripPage;
