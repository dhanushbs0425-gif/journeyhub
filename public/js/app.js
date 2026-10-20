/**
 * JourneyHub Application Bootstrapper
 * Features: Non-blocking independent frontend initialization, background session hydration,
 * and seamless cold-start recovery.
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[JourneyHub] Initializing client application shell...');

  // 1. Initialize Cloud Backend Status Manager (cold-start / wakeup monitor)
  if (window.BackendStatus && window.BackendStatus.init) {
    window.BackendStatus.init();
  }

  // 2. Render Shell Components Immediately (Instant load, zero blocking)
  try {
    if (window.Navbar && window.Navbar.render) window.Navbar.render();
    if (window.Sidebar && window.Sidebar.render) window.Sidebar.render();
  } catch (err) {
    console.warn('[JourneyHub] Navbar/Sidebar initial render warning:', err.message);
  }

  // 3. Launch SPA Router immediately (displays Landing, Destinations, or cached Dashboard)
  if (window.Router && window.Router.init) {
    window.Router.init();
  }

  // 4. Fade out initial branded boot preloader
  const preloader = document.getElementById('jh-boot-preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('fade-out');
      setTimeout(() => preloader.remove(), 400);
    }, 250);
  }

  // 5. Subscribe state changes to re-render navbar and sidebar
  if (window.State && window.State.subscribe) {
    window.State.subscribe((event) => {
      if (['user_changed', 'trip_changed', 'trips_updated', 'notifications_count_changed'].includes(event)) {
        if (window.Navbar && window.Navbar.render) window.Navbar.render();
        if (window.Sidebar && window.Sidebar.render) window.Sidebar.render();
      }
    });
  }

  // 6. Connect Real-time Socket.IO Gateway in background (non-blocking)
  if (typeof io !== 'undefined') {
    try {
      const backendOrigin = (window.API && typeof window.API.getBaseUrl === 'function') ? window.API.getBaseUrl() : '';
      const socket = backendOrigin ? io(backendOrigin, {
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
        timeout: 20000
      }) : io({
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
        timeout: 20000
      });
      window.socket = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connected to real-time collaboration gateway');
        if (window.BackendStatus) window.BackendStatus.setAwake();
      });

      socket.on('notification', (data) => {
        if (window.Toast) window.Toast.show(data.message || 'New notification', 'info');
        if (window.State) window.State.loadNotificationsCount();
      });
    } catch (e) {
      console.warn('[Socket] Real-time gateway fallback:', e.message);
    }
  }

  // 7. Verify / refresh session with backend asynchronously in background
  if (window.State && window.State.initUser) {
    window.State.initUser().catch((err) => {
      console.log('[JourneyHub] Background session verification postponed:', err.message);
    });
  }

  console.log('[JourneyHub] Application shell mounted successfully.');
});
