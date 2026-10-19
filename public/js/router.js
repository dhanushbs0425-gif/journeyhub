/**
 * JourneyHub Client-Side SPA Hash Router
 * Enforces role guards and dynamic view routing
 */
const Router = {
  currentPage: null,

  get routes() {
    return [
      { path: '#/', page: window.LandingPage, requiresAuth: false },
      { path: '#/login', page: window.LoginPage, requiresAuth: false },
      { path: '#/register', page: window.RegisterPage, requiresAuth: false },
      { path: '#/verify-otp', page: window.VerifyOtpPage, requiresAuth: false },
      { path: '#/profile-setup', page: window.ProfileSetupPage, requiresAuth: true },
      { path: '#/forgot-password', page: window.ForgotPasswordPage, requiresAuth: false },
      { path: '#/reset-password', page: window.ResetPasswordPage, requiresAuth: false },
      { path: '#/profile', page: window.ProfilePage, requiresAuth: true },
      { path: '#/dashboard', page: window.DashboardPage, requiresAuth: true },
      { path: '#/destinations', page: window.DestinationExplorerPage, requiresAuth: false },
      { path: '#/notifications', page: window.NotificationsPage, requiresAuth: true },
      { path: '#/settings', page: window.SettingsPage, requiresAuth: true },

      // Traveler / User Portal Routes
      { path: '#/explore-trips', page: window.ExploreTripsPage, requiresAuth: false },
      { path: '#/my-requests', page: window.MyRequestsPage, requiresAuth: true },
      { path: '#/wishlist', page: window.WishlistPage, requiresAuth: true },

      // Organiser Portal Routes (Strict Organiser Access)
      { path: '#/trips/create', page: window.CreateTripPage, requiresAuth: true, organiserOnly: true },
      { path: '#/organiser-trips', page: window.OrganiserTripsPage, requiresAuth: true, organiserOnly: true },
      { path: '#/organiser-requests', page: window.OrganiserRequestsPage, requiresAuth: true, organiserOnly: true },

      // Distinctive Feature: Mystery Miles (Surprise Destination Reveal)
      { path: '#/mystery-trips', page: window.MysteryTripsPage, requiresAuth: false },

      // Trip Workspace Sub-Pages
      { path: '#/trips/:tripId/itinerary', page: window.ItineraryPage, requiresAuth: true },
      { path: '#/trips/:tripId/collaboration', page: window.CollaborationPage, requiresAuth: true },
      { path: '#/trips/:tripId/expenses', page: window.ExpenseTrackerPage, requiresAuth: true },
      { path: '#/trips/:tripId/settlements', page: window.ExpenseSettlementPage, requiresAuth: true },
      { path: '#/trips/:tripId/packing', page: window.PackingPage, requiresAuth: true },
      { path: '#/trips/:tripId/bookings', page: window.BookingPage, requiresAuth: true },
      { path: '#/trips/:tripId/diary', page: window.DiaryPage, requiresAuth: true },
      { path: '#/trips/:tripId/reports', page: window.ReportsPage, requiresAuth: true },
      { path: '#/trips/:tripId', page: window.TripDetailsPage, requiresAuth: true }
    ];
  },

  matchRoute(hash) {
    let cleanHash = (hash || '#/').split('?')[0];
    if (!cleanHash || cleanHash === '#' || cleanHash === '') {
      cleanHash = '#/';
    }

    for (const route of this.routes) {
      const routeRegex = new RegExp('^' + route.path.replace(/:([a-zA-Z0-9_]+)/g, '(?<$1>[^/]+)') + '$');
      const match = cleanHash.match(routeRegex);

      if (match) {
        return {
          route,
          params: match.groups || {}
        };
      }
    }

    return null;
  },

  async handleRouting() {
    const hash = window.location.hash || '#/';
    const matched = this.matchRoute(hash);

    const viewport = document.getElementById('app-viewport');
    if (!viewport) return;

    if (!matched) {
      viewport.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-compass"></i></div>
          <h2 class="empty-state-title">Page Not Found</h2>
          <p class="empty-state-text">The travel route you requested (${hash}) does not exist.</p>
          <a href="#/dashboard" class="btn btn-teal">Return to Dashboard</a>
        </div>
      `;
      return;
    }

    const { route, params } = matched;

    // Clean up previous page if it had timers or intervals
    if (this.currentPage && typeof this.currentPage.destroy === 'function') {
      try {
        this.currentPage.destroy();
      } catch (e) {
        console.warn('Error destroying previous page:', e);
      }
    }

    // Auth guard: If session is currently restoring and user has token, wait for it
    if (route.requiresAuth && !window.State.currentUser) {
      if (window.API && window.API.getToken() && window.State.isRestoringSession) {
        viewport.innerHTML = `
          <div class="empty-state" style="padding: 4rem 1.5rem; text-align: center;">
            <div class="spinner"></div>
            <h3 style="margin-top: 1.25rem; font-size: 1.15rem; font-weight: 700; color: var(--text-main);">
              Verifying Traveler Session...
            </h3>
            <p style="color: var(--text-secondary); max-width: 440px; margin: 0.5rem auto 1.25rem auto; font-size: 0.875rem; line-height: 1.5;">
              Connecting to cloud engine to restore your session. If the free backend is waking up, this may take a moment.
            </p>
            <button class="btn btn-outline btn-sm" onclick="if(window.BackendStatus)window.BackendStatus.manualRetry()">
              <i class="fas fa-satellite-dish"></i> Check Connection
            </button>
          </div>
        `;
        const checkRestored = setInterval(() => {
          if (!window.State.isRestoringSession) {
            clearInterval(checkRestored);
            this.handleRouting();
          }
        }, 300);
        return;
      }

      window.Toast?.show('Please log in to access this page.', 'warning');
      window.location.hash = '#/login';
      return;
    }

    // Organiser role guard
    if (route.organiserOnly && !window.State.isOrganiser()) {
      window.Toast?.show('Access Denied: Only certified Organisers can access this workspace.', 'error');
      window.location.hash = '#/explore-trips';
      return;
    }

    // Redirect logged-in users away from auth pages
    if ((hash === '#/login' || hash === '#/register') && window.State.currentUser) {
      if (window.State.isOrganiser()) {
        window.location.hash = '#/dashboard';
      } else {
        window.location.hash = '#/explore-trips';
      }
      return;
    }

    try {
      viewport.innerHTML = `<div class="spinner"></div>`;
      window.scrollTo(0, 0);

      this.currentPage = route.page;

      if (!route.page || typeof route.page.render !== 'function') {
        throw new Error(`The requested view is not available.`);
      }

      // Render Page View
      const html = await route.page.render(params);
      viewport.innerHTML = html;

      // Update Navigation Bars
      window.Navbar.render();
      window.Sidebar.render();

      // Mount lifecycle hook
      if (route.page.mount) {
        await route.page.mount(params);
      }
    } catch (err) {
      console.error('[Router Render Error]:', err);
      if (window.API && window.API.renderRetryCard) {
        window.API.renderRetryCard(viewport, err.message, () => this.handleRouting());
      } else {
        viewport.innerHTML = `
          <div class="empty-state">
            <p style="color: var(--danger); font-size: 1rem;">Failed to load view: ${err.message}</p>
            <a href="#/dashboard" class="btn btn-outline btn-sm" style="margin-top: 1rem;">Return to Dashboard</a>
          </div>
        `;
      }
    }
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRouting());
    this.handleRouting();
  }
};

window.Router = Router;
