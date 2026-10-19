/**
 * Page 14: Booking and Document Organizer
 */
const BookingPage = {
  tripId: null,
  bookingData: null,

  async render(params) {
    BookingPage.tripId = params.tripId;

    return `
      <div class="booking-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Booking & Document Organizer</h1>
            <p class="page-subtitle">Centralize flight tickets, hotel vouchers, booking reference codes, and reservation notes</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-teal" onclick="BookingPage.openAddBookingModal()"><i class="fas fa-plus"></i> Add Reservation</button>
          </div>
        </div>

        <!-- Total Booked Cost Metric Card -->
        <div class="jh-card" style="padding: 1.25rem 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Committed Reservations</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary-teal); margin-top: 0.2rem;" id="total-booking-cost-val">$0.00</div>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <span class="badge badge-teal"><i class="fas fa-plane"></i> Flights</span>
            <span class="badge badge-orange"><i class="fas fa-hotel"></i> Hotels</span>
            <span class="badge badge-navy"><i class="fas fa-train"></i> Transit</span>
            <span class="badge badge-success"><i class="fas fa-ticket-alt"></i> Excursions</span>
          </div>
        </div>

        <!-- Bookings Container -->
        <div id="bookings-list-container">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    BookingPage.tripId = params.tripId;
    await BookingPage.loadBookings();
  },

  async loadBookings() {
    try {
      const res = await window.API.get(`/api/trips/${BookingPage.tripId}/bookings`);
      BookingPage.bookingData = res;

      const totalVal = document.getElementById('total-booking-cost-val');
      const trip = window.State.currentTrip;
      if (totalVal) {
        totalVal.textContent = window.formatCurrency(res.totalBookingCost || 0, trip?.currency);
      }

      BookingPage.renderBookingsList();
    } catch (err) {
      document.getElementById('bookings-list-container').innerHTML = `
        <div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>
      `;
    }
  },

  renderBookingsList() {
    const container = document.getElementById('bookings-list-container');
    if (!container) return;

    const bookings = BookingPage.bookingData?.bookings || [];
    const trip = window.State.currentTrip;
    const curr = window.getCurrencySymbol(trip?.currency);

    if (bookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-ticket-alt"></i></div>
          <h3 class="empty-state-title">No bookings registered yet</h3>
          <p class="empty-state-text">Store your airline confirmation codes, hotel room bookings, and train passes in one accessible place.</p>
          <button class="btn btn-teal" onclick="BookingPage.openAddBookingModal()"><i class="fas fa-plus"></i> Add Reservation</button>
        </div>
      `;
      return;
    }

    const typeIconMap = {
      'Flight': 'fa-plane',
      'Hotel': 'fa-hotel',
      'Train/Bus': 'fa-subway',
      'Rental Car': 'fa-car',
      'Activity Ticket': 'fa-ticket-alt',
      'Insurance': 'fa-shield-alt',
      'Visa/Passport': 'fa-passport',
      'Other': 'fa-file-alt'
    };

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
        ${bookings.map(b => {
          const icon = typeIconMap[b.type] || 'fa-file-alt';
          const startStr = b.startDate ? new Date(b.startDate).toLocaleDateString() : '';
          const endStr = b.endDate ? new Date(b.endDate).toLocaleDateString() : '';

          return `
            <div class="jh-card">
              <div class="jh-card-header" style="background-color: var(--bg-surface);">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="brand-icon" style="width: 32px; height: 32px; font-size: 1rem;"><i class="fas ${icon}"></i></span>
                  <div>
                    <span class="badge badge-teal" style="font-size: 0.7rem;">${b.type}</span>
                    <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-top: 0.15rem;">${b.provider || b.title}</h4>
                  </div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="BookingPage.deleteBooking('${b._id}')" title="Delete">
                  <i class="fas fa-trash-alt" style="color: var(--danger); font-size: 0.75rem;"></i>
                </button>
              </div>

              <div class="jh-card-body">
                <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">${b.title}</h3>

                <!-- Confirmation Code Highlight Box -->
                <div style="background-color: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Reference Code</div>
                    <div style="font-family: monospace; font-size: 1.1rem; font-weight: 800; color: var(--primary-teal); letter-spacing: 0.05em;">${b.confirmationCode}</div>
                  </div>
                  <button class="btn btn-outline btn-sm" onclick="BookingPage.copyToClipboard('${b.confirmationCode}')" title="Copy code">
                    <i class="far fa-copy"></i>
                  </button>
                </div>

                <div style="font-size: 0.825rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem;">
                  ${startStr ? `<div><i class="far fa-calendar-alt" style="color: var(--accent-orange); width: 16px;"></i> ${startStr}${endStr ? ` to ${endStr}` : ''}</div>` : ''}
                  ${b.cost > 0 ? `<div><i class="fas fa-wallet" style="color: var(--primary-teal); width: 16px;"></i> Cost: <strong>${curr}${b.cost.toFixed(2)}</strong></div>` : ''}
                  ${b.bookedBy ? `<div><i class="fas fa-user-check" style="width: 16px;"></i> Booked by: ${b.bookedBy.name}</div>` : ''}
                </div>

                ${b.notes ? `
                  <div style="font-size: 0.8rem; color: var(--text-muted); padding-top: 0.5rem; border-top: 1px solid var(--border-color); line-height: 1.5;">
                    <i class="fas fa-info-circle"></i> ${b.notes}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openAddBookingModal() {
    const trip = window.State.currentTrip;
    const startStr = trip?.startDate ? new Date(trip.startDate).toISOString().split('T')[0] : '';

    window.Modal.open({
      title: 'Store Booking Voucher / Ticket',
      body: `
        <form id="add-booking-form">
          <div class="form-group">
            <label class="form-label">Booking Title <span style="color: var(--danger);">*</span></label>
            <input type="text" id="book-title" class="form-control" placeholder="e.g. ANA Flight NH 848 / Tokyo Gracery Hotel" required />
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="book-type" class="form-control">
                <option value="Flight">Flight</option>
                <option value="Hotel" selected>Hotel / Accommodation</option>
                <option value="Train/Bus">Train / Transit Pass</option>
                <option value="Rental Car">Rental Car</option>
                <option value="Activity Ticket">Activity Ticket</option>
                <option value="Insurance">Travel Insurance</option>
                <option value="Visa/Passport">Visa / Passport Ref</option>
                <option value="Other">Other Voucher</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Provider / Airline</label>
              <input type="text" id="book-provider" class="form-control" placeholder="e.g. All Nippon Airways / Hilton" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Confirmation / PNR Code <span style="color: var(--danger);">*</span></label>
              <input type="text" id="book-code" class="form-control" placeholder="e.g. ANA-98210" required />
            </div>
            <div class="form-group">
              <label class="form-label">Cost (${window.getCurrencySymbol(trip?.currency)})</label>
              <input type="number" id="book-cost" class="form-control" placeholder="0" min="0" step="0.01" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Reservation Date</label>
              <input type="date" id="book-start" class="form-control" value="${startStr}" />
            </div>
            <div class="form-group">
              <label class="form-label">End / Check-out Date</label>
              <input type="date" id="book-end" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes & Instructions</label>
            <textarea id="book-notes" class="form-control" rows="2" placeholder="Terminal 3, check-in reference, seat number, gate instructions..."></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="BookingPage.submitAddBooking()">Save Reservation</button>
      `
    });
  },

  async submitAddBooking() {
    const title = document.getElementById('book-title')?.value.trim();
    const type = document.getElementById('book-type')?.value;
    const provider = document.getElementById('book-provider')?.value.trim();
    const confirmationCode = document.getElementById('book-code')?.value.trim();
    const cost = document.getElementById('book-cost')?.value;
    const startDate = document.getElementById('book-start')?.value;
    const endDate = document.getElementById('book-end')?.value;
    const notes = document.getElementById('book-notes')?.value.trim();

    if (!title || !confirmationCode) {
      window.showToast('Please provide a booking title and confirmation reference code.', 'warning');
      return;
    }

    try {
      const res = await window.API.post(`/api/trips/${BookingPage.tripId}/bookings`, {
        title,
        type,
        provider,
        confirmationCode,
        cost: Number(cost) || 0,
        startDate: startDate || null,
        endDate: endDate || null,
        notes
      });

      window.Modal.close();
      window.showToast(res.message, 'success');
      await BookingPage.loadBookings();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  deleteBooking(bookingId) {
    window.Modal.confirm({
      title: 'Remove Booking Reference?',
      message: 'Are you sure you want to delete this booking reference?',
      confirmText: 'Delete',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await window.API.delete(`/api/trips/${BookingPage.tripId}/bookings/${bookingId}`);
          window.showToast('Booking deleted.', 'info');
          await BookingPage.loadBookings();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  },

  copyToClipboard(code) {
    navigator.clipboard.writeText(code).then(() => {
      window.showToast(`Copied code "${code}" to clipboard!`, 'info');
    });
  }
};

window.BookingPage = BookingPage;
