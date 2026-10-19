/**
 * Collapsible Sidebar Navigation Component
 * Fully distinct interfaces for Organiser vs Regular User
 */
const Sidebar = {
  render() {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;

    const user = window.State.currentUser;
    const isOrganiser = window.State.isOrganiser();
    const currentTrip = window.State.currentTrip;
    const unreadCount = window.State.unreadNotificationsCount || 0;
    const currentHash = window.location.hash || '#/';

    let tripSectionHtml = '';
    if (user && currentTrip) {
      const tripId = currentTrip._id;
      tripSectionHtml = `
        <a href="#/trips/${tripId}" class="trip-context-pill" style="display: block; text-decoration: none;" onclick="if(window.State&&window.State.setCurrentTripId)window.State.setCurrentTripId('${tripId}')">
          <div class="trip-context-label"><i class="fas fa-compass"></i> Active Trip</div>
          <div class="trip-context-title">${currentTrip.title}</div>
        </a>

        <div class="sidebar-section-title" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="window.location.hash = '#/trips/${tripId}'" title="Open Trip Workspace">
          <span>Trip Workspace</span>
          <i class="fas fa-chevron-right" style="font-size: 0.65rem; opacity: 0.7;"></i>
        </div>
        <ul class="sidebar-nav">
          <li>
            <a href="#/trips/${tripId}" class="nav-link ${currentHash === `#/trips/${tripId}` ? 'active' : ''}">
              <span class="icon"><i class="fas fa-home"></i></span>
              <span>Overview & Readiness</span>
            </a>
          </li>
          <li>
            <a href="#/trips/${tripId}/itinerary" class="nav-link ${currentHash.includes('/itinerary') ? 'active' : ''}">
              <span class="icon"><i class="fas fa-calendar-alt"></i></span>
              <span>Day-Wise Itinerary</span>
            </a>
          </li>
          <li>
            <a href="#/trips/${tripId}/collaboration" class="nav-link ${currentHash.includes('/collaboration') ? 'active' : ''}">
              <span class="icon"><i class="fas fa-users"></i></span>
              <span>Collaboration & Votes</span>
            </a>
          </li>
          <li>
            <a href="#/trips/${tripId}/expenses" class="nav-link ${currentHash.includes('/expenses') ? 'active' : ''}">
              <span class="icon"><i class="fas fa-wallet"></i></span>
              <span>Expense Tracker</span>
            </a>
          </li>
          <li>
            <a href="#/trips/${tripId}/settlements" class="nav-link ${currentHash.includes('/settlements') ? 'active' : ''}">
              <span class="icon"><i class="fas fa-hand-holding-usd"></i></span>
              <span>Expense Settlement</span>
            </a>
          </li>
          <li>
            <a href="#/trips/${tripId}/packing" class="nav-link ${currentHash.includes('/packing') ? 'active' : ''}">
              <span class="icon"><i class="fas fa-suitcase"></i></span>
              <span>Packing Checklist</span>
            </a>
          </li>
          <li>
            <a href="#/trips/${tripId}/bookings" class="nav-link ${currentHash.includes('/bookings') ? 'active' : ''}">
              <span class="icon"><i class="fas fa-ticket-alt"></i></span>
              <span>Bookings & Docs</span>
            </a>
          </li>
          <li>
            <a href="#/trips/${tripId}/diary" class="nav-link ${currentHash.includes('/diary') ? 'active' : ''}">
              <span class="icon"><i class="fas fa-book-open"></i></span>
              <span>Travel Diary</span>
            </a>
          </li>
          <li>
            <a href="#/trips/${tripId}/reports" class="nav-link ${currentHash.includes('/reports') ? 'active' : ''}">
              <span class="icon"><i class="fas fa-chart-pie"></i></span>
              <span>Reports & Analytics</span>
            </a>
          </li>
        </ul>
      `;
    }

    let mainMenuHtml = '';
    if (!user) {
      // Public / Guest Navigation
      mainMenuHtml = `
        <div class="sidebar-section-title">Discover</div>
        <ul class="sidebar-nav">
          <li>
            <a href="#/" class="nav-link ${currentHash === '#/' || currentHash === '' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-globe-americas"></i></span>
              <span>Home</span>
            </a>
          </li>
          <li>
            <a href="#/destinations" class="nav-link ${currentHash === '#/destinations' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-map-marked-alt"></i></span>
              <span>Incredible India</span>
            </a>
          </li>
          <li>
            <a href="#/explore-trips" class="nav-link ${currentHash === '#/explore-trips' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-compass"></i></span>
              <span>Explore Trips</span>
            </a>
          </li>
          <li>
            <a href="#/mystery-trips" class="nav-link ${currentHash === '#/mystery-trips' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-mask"></i></span>
              <span>Mystery Miles ✨</span>
            </a>
          </li>
        </ul>
      `;
    } else if (isOrganiser) {
      // Organiser Interface Navigation
      mainMenuHtml = `
        <div style="padding: 0.5rem 1rem 0.75rem;">
          <span class="badge badge-teal" style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 100%; justify-content: center;">
            <i class="fas fa-user-shield" style="margin-right: 0.35rem;"></i> Organiser Workspace
          </span>
        </div>

        <div class="sidebar-section-title">Organiser Tools</div>
        <ul class="sidebar-nav">
          <li>
            <a href="#/dashboard" class="nav-link ${currentHash === '#/dashboard' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-th-large"></i></span>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="#/trips/create" class="nav-link ${currentHash === '#/trips/create' ? 'active' : ''}" style="background: rgba(13, 148, 136, 0.12); font-weight: 700; color: var(--primary-teal);">
              <span class="icon" style="color: var(--primary-teal);"><i class="fas fa-plus-circle"></i></span>
              <span>Create Trip</span>
            </a>
          </li>
          <li>
            <a href="#/organiser-trips" class="nav-link ${currentHash === '#/organiser-trips' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-tasks"></i></span>
              <span>Manage Trips</span>
            </a>
          </li>
          <li>
            <a href="#/organiser-requests" class="nav-link ${currentHash === '#/organiser-requests' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-user-check"></i></span>
              <span style="flex: 1;">Join Requests</span>
              ${unreadCount > 0 ? `<span class="badge badge-warning" style="font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 8px;">${unreadCount}</span>` : ''}
            </a>
          </li>
          <li>
            <a href="#/mystery-trips" class="nav-link ${currentHash === '#/mystery-trips' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-mask"></i></span>
              <span>Mystery Miles ✨</span>
            </a>
          </li>
          <li>
            <a href="#/destinations" class="nav-link ${currentHash === '#/destinations' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-map-marked-alt"></i></span>
              <span>Incredible India</span>
            </a>
          </li>
        </ul>
      `;
    } else {
      // Regular User / Traveler Interface Navigation
      mainMenuHtml = `
        <div style="padding: 0.5rem 1rem 0.75rem;">
          <span class="badge badge-navy" style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 100%; justify-content: center;">
            <i class="fas fa-hiking" style="margin-right: 0.35rem;"></i> Traveler Portal
          </span>
        </div>

        <div class="sidebar-section-title">Traveler Hub</div>
        <ul class="sidebar-nav">
          <li>
            <a href="#/" class="nav-link ${currentHash === '#/' || currentHash === '' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-home"></i></span>
              <span>Home</span>
            </a>
          </li>
          <li>
            <a href="#/explore-trips" class="nav-link ${currentHash === '#/explore-trips' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-compass"></i></span>
              <span>Explore Trips</span>
            </a>
          </li>
          <li>
            <a href="#/dashboard" class="nav-link ${currentHash === '#/dashboard' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-suitcase-rolling"></i></span>
              <span>My Trips</span>
            </a>
          </li>
          <li>
            <a href="#/my-requests" class="nav-link ${currentHash === '#/my-requests' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-paper-plane"></i></span>
              <span>My Requests</span>
            </a>
          </li>
          <li>
            <a href="#/mystery-trips" class="nav-link ${currentHash === '#/mystery-trips' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-mask"></i></span>
              <span>Mystery Miles ✨</span>
            </a>
          </li>
          <li>
            <a href="#/destinations" class="nav-link ${currentHash === '#/destinations' ? 'active' : ''}">
              <span class="icon"><i class="fas fa-map-marked-alt"></i></span>
              <span>Incredible India</span>
            </a>
          </li>
          <li>
            <a href="#/wishlist" class="nav-link ${currentHash === '#/wishlist' ? 'active' : ''}">
              <span class="icon" style="color: #ef4444;"><i class="fas fa-heart"></i></span>
              <span>My Wishlist</span>
            </a>
          </li>
        </ul>
      `;
    }

    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-icon">
          <i class="fas fa-route"></i>
        </div>
        <div class="brand-title">Journey<span>Hub</span></div>
      </div>

      <div class="sidebar-scroll">
        ${mainMenuHtml}

        ${tripSectionHtml}

        ${user ? `
          <div class="sidebar-section-title" style="margin-top: 1rem;">Personal</div>
          <ul class="sidebar-nav">
            <li>
              <a href="#/notifications" class="nav-link ${currentHash === '#/notifications' ? 'active' : ''}">
                <span class="icon"><i class="fas fa-bell"></i></span>
                <span>Notifications</span>
                ${unreadCount > 0 ? `<span class="nav-badge">${unreadCount}</span>` : ''}
              </a>
            </li>
            <li>
              <a href="#/profile" class="nav-link ${currentHash === '#/profile' ? 'active' : ''}">
                <span class="icon"><i class="fas fa-user"></i></span>
                <span>My Profile</span>
              </a>
            </li>
            <li>
              <a href="#/settings" class="nav-link ${currentHash === '#/settings' ? 'active' : ''}">
                <span class="icon"><i class="fas fa-sliders-h"></i></span>
                <span>Settings</span>
              </a>
            </li>
            <li>
              <a href="javascript:void(0)" class="nav-link" onclick="Navbar.logout()" style="color: var(--danger-color, #ef4444);">
                <span class="icon"><i class="fas fa-sign-out-alt"></i></span>
                <span>Log Out</span>
              </a>
            </li>
          </ul>
        ` : `
          <div class="sidebar-section-title" style="margin-top: 1rem;">Account</div>
          <ul class="sidebar-nav">
            <li>
              <a href="#/login" class="nav-link ${currentHash === '#/login' ? 'active' : ''}">
                <span class="icon"><i class="fas fa-sign-in-alt"></i></span>
                <span>Log In</span>
              </a>
            </li>
            <li>
              <a href="#/register" class="nav-link ${currentHash === '#/register' ? 'active' : ''}">
                <span class="icon"><i class="fas fa-user-plus"></i></span>
                <span>Register</span>
              </a>
            </li>
          </ul>
        `}
      </div>
    `;

    // Close sidebar on mobile navigation click
    sidebar.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          sidebar.classList.remove('open');
          const backdrop = document.getElementById('sidebar-backdrop');
          if (backdrop) backdrop.classList.remove('active');
        }
      });
    });
  }
};

window.Sidebar = Sidebar;
