/**
 * JourneyHub Application Bootstrapper
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[JourneyHub] Initializing client application...');

  // Setup Socket.IO if available
  let socket = null;
  if (typeof io !== 'undefined') {
    try {
      socket = io();
      window.socket = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connected to real-time collaboration gateway');
      });

      socket.on('notification', (data) => {
        window.showToast(data.message || 'New notification', 'info');
        window.State.loadNotificationsCount();
      });
    } catch (e) {
      console.warn('[Socket] Real-time gateway not active, falling back to REST polling:', e);
    }
  }

  // Restore authenticated user session
  try {
    if (window.State && window.State.initUser) {
      await window.State.initUser();
    }
  } catch (err) {
    console.warn('[JourneyHub] Session initialization error:', err.message);
  }

  // Render Shell Components
  try {
    if (window.Navbar && window.Navbar.render) window.Navbar.render();
    if (window.Sidebar && window.Sidebar.render) window.Sidebar.render();
  } catch (err) {
    console.warn('[JourneyHub] Navbar/Sidebar render error:', err.message);
  }

  // Subscribe state changes to re-render navbar/sidebar
  if (window.State && window.State.subscribe) {
    window.State.subscribe((event) => {
      if (['user_changed', 'trip_changed', 'trips_updated', 'notifications_count_changed'].includes(event)) {
        if (window.Navbar && window.Navbar.render) window.Navbar.render();
        if (window.Sidebar && window.Sidebar.render) window.Sidebar.render();
      }
    });
  }

  // Start Router
  if (window.Router && window.Router.init) {
    window.Router.init();
  }
  console.log('[JourneyHub] Application successfully initialized.');
});
