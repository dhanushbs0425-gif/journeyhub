/**
 * Top Navbar Component
 * Enforces role badge & strictly prevents non-organisers from seeing trip creation
 */
const Navbar = {
  render() {
    const topbar = document.getElementById('app-topbar');
    if (!topbar) return;

    const user = window.State.currentUser;
    const isOrganiser = window.State.isOrganiser();
    const currentTrip = window.State.currentTrip;
    const trips = window.State.trips || [];
    const unreadCount = window.State.unreadNotificationsCount || 0;

    let tripDropdownHtml = '';
    if (user && trips.length > 0) {
      tripDropdownHtml = `
        <div class="topbar-trip-dropdown" id="topbar-trip-select-trigger" title="Switch active trip">
          <i class="fas fa-plane-departure" style="color: var(--primary-teal);"></i>
          <span style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${currentTrip ? currentTrip.title : 'Select Trip'}</span>
          <i class="fas fa-chevron-down" style="font-size: 0.75rem; color: var(--text-muted);"></i>
        </div>
      `;
    }

    let authSectionHtml = '';
    if (user) {
      authSectionHtml = `
        <button class="icon-btn" id="notif-btn" title="Notifications" style="position: relative;">
          <i class="far fa-bell"></i>
          ${unreadCount > 0 ? `<span class="badge-count" style="position: absolute; top: -4px; right: -4px; background: #ef4444; color: #ffffff; font-size: 0.65rem; font-weight: 800; border-radius: 10px; padding: 1px 5px; min-width: 17px; text-align: center; border: 2px solid var(--bg-card); line-height: 1.2;">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
        </button>

        <div class="user-menu-pill" id="user-menu-trigger">
          <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}" alt="${user.name}" class="user-avatar" />
          <div style="display: flex; flex-direction: column; align-items: flex-start; line-height: 1.1;">
            <span class="user-name-label">${user.name.split(' ')[0]}</span>
            <span style="font-size: 0.65rem; font-weight: 700; color: ${isOrganiser ? 'var(--primary-teal)' : 'var(--accent-orange, #f59e0b)'}; text-transform: uppercase;">
              ${isOrganiser ? 'Organiser' : 'Traveler'}
            </span>
          </div>
          <i class="fas fa-chevron-down" style="font-size: 0.7rem; color: var(--text-muted); margin-left: 0.25rem;"></i>
        </div>
      `;
    } else {
      authSectionHtml = `
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <a href="#/login" class="btn btn-outline btn-sm">Log In</a>
          <a href="#/register" class="btn btn-teal btn-sm">Get Started</a>
        </div>
      `;
    }

    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" title="Toggle Sidebar">
          <i class="fas fa-bars"></i>
        </button>
        ${tripDropdownHtml}
      </div>

      <div class="topbar-right">
        ${authSectionHtml}
      </div>
    `;

    // Attach Event Listeners
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('app-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('active');
      });
    }

    const tripTrigger = document.getElementById('topbar-trip-select-trigger');
    if (tripTrigger) {
      tripTrigger.addEventListener('click', () => {
        this.openTripSelectorModal();
      });
    }

    const notifBtn = document.getElementById('notif-btn');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        window.location.hash = '#/notifications';
      });
    }

    const userTrigger = document.getElementById('user-menu-trigger');
    if (userTrigger) {
      userTrigger.addEventListener('click', () => {
        this.openUserMenuModal();
      });
    }
  },

  openTripSelectorModal() {
    const trips = window.State.trips || [];
    const currentId = window.State.currentTrip?._id;
    const isOrganiser = window.State.isOrganiser();

    let tripsListHtml = trips.length > 0 ? trips.map(t => `
      <div class="jh-card" style="padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; border-color: ${t._id === currentId ? 'var(--primary-teal)' : 'var(--border-color)'}; background: ${t._id === currentId ? 'rgba(13, 148, 136, 0.08)' : 'var(--bg-card)'};" onclick="Navbar.selectTrip('${t._id}')">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">${t.title}</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
              <i class="fas fa-map-marker-alt" style="color: var(--accent-orange, #f59e0b);"></i> ${t.destination} • ${new Date(t.startDate).toLocaleDateString()} - ${new Date(t.endDate).toLocaleDateString()}
            </p>
          </div>
          <span class="badge ${t.status === 'ongoing' ? 'badge-teal' : t.status === 'completed' ? 'badge-success' : 'badge-navy'}">${t.status}</span>
        </div>
      </div>
    `).join('') : `<p style="text-align: center; color: var(--text-muted); padding: 1rem;">No trips available.</p>`;

    // STRICT BUSINESS RULE: Only show Create New Trip button for Organisers
    let createTripBtn = '';
    if (isOrganiser) {
      createTripBtn = `<a href="#/trips/create" class="btn btn-teal btn-sm" onclick="Modal.close()"><i class="fas fa-plus"></i> Create New Trip</a>`;
    }

    window.Modal.open({
      title: 'Switch Active Trip',
      body: `
        <div style="margin-bottom: 1rem;">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Choose an enrolled trip to access its itinerary, budget, packing, and collaboration workspace:</p>
          ${tripsListHtml}
        </div>
      `,
      footer: `
        ${createTripBtn}
        <button class="btn btn-outline btn-sm" onclick="Modal.close()">Close</button>
      `
    });
  },

  selectTrip(tripId) {
    const match = (window.State.trips || []).find(t => t._id === tripId);
    if (match) {
      window.State.setCurrentTrip(match);
      window.Modal.close();
      window.Toast?.show(`Switched active trip to "${match.title}"`, 'success');
      // If currently on a trip sub-page, reload view
      if (window.location.hash.startsWith('#/trips/')) {
        const parts = window.location.hash.split('/');
        const subAction = parts[3] ? `/${parts[3]}` : '';
        window.location.hash = `#/trips/${match._id}${subAction}`;
      } else {
        window.location.hash = `#/trips/${match._id}`;
      }
    }
  },

  openUserMenuModal() {
    const user = window.State.currentUser;
    if (!user) return;
    const isOrganiser = window.State.isOrganiser();

    window.Modal.open({
      title: 'Account & Profile',
      body: `
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color);">
          <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover;" />
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h4 style="font-size: 1.1rem; font-weight: 700;">${user.name}</h4>
              <span class="badge ${isOrganiser ? 'badge-teal' : 'badge-navy'}">${isOrganiser ? 'Organiser' : 'Traveler'}</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">${user.email}</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${isOrganiser ? `
            <a href="#/organiser-trips" class="btn btn-outline btn-block" style="justify-content: flex-start;" onclick="Modal.close()"><i class="fas fa-tasks"></i> Organiser Trips & Seats</a>
            <a href="#/organiser-requests" class="btn btn-outline btn-block" style="justify-content: flex-start;" onclick="Modal.close()"><i class="fas fa-user-check"></i> Review Join Requests</a>
          ` : `
            <a href="#/explore-trips" class="btn btn-outline btn-block" style="justify-content: flex-start;" onclick="Modal.close()"><i class="fas fa-compass"></i> Explore Published Trips</a>
            <a href="#/my-requests" class="btn btn-outline btn-block" style="justify-content: flex-start;" onclick="Modal.close()"><i class="fas fa-paper-plane"></i> My Join Requests</a>
            <a href="#/wishlist" class="btn btn-outline btn-block" style="justify-content: flex-start;" onclick="Modal.close()"><i class="fas fa-heart" style="color: #ef4444;"></i> My Wishlist</a>
          `}
          <a href="#/profile" class="btn btn-outline btn-block" style="justify-content: flex-start;" onclick="Modal.close()"><i class="fas fa-user-circle"></i> View & Edit Profile</a>
          <a href="#/settings" class="btn btn-outline btn-block" style="justify-content: flex-start;" onclick="Modal.close()"><i class="fas fa-cog"></i> Preferences & Settings</a>
          <a href="#/notifications" class="btn btn-outline btn-block" style="justify-content: flex-start;" onclick="Modal.close()"><i class="fas fa-bell"></i> Notifications Center</a>
          <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 0.5rem 0;" />
          <button class="btn btn-danger btn-block" style="justify-content: flex-start;" onclick="Navbar.logout()"><i class="fas fa-sign-out-alt"></i> Log Out</button>
        </div>
      `
    });
  },

  logout() {
    window.API.clearToken();
    window.State.setUser(null);
    window.State.setCurrentTrip(null);
    window.State.setTrips([]);
    window.Modal.close();
    window.Toast?.show('You have been logged out successfully.', 'info');
    window.location.hash = '#/login';
  }
};

window.Navbar = Navbar;
