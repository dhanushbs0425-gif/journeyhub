/**
 * JourneyHub Reactive State Store
 */
const State = {
  currentUser: null,
  currentTrip: null,
  trips: [],
  unreadNotificationsCount: 0,
  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload));
  },

  setUser(user) {
    this.currentUser = user;
    if (user && user.preferences?.theme) {
      document.documentElement.setAttribute('data-theme', user.preferences.theme);
    }
    if (user) {
      this.loadNotificationsCount();
      this.startNotificationPolling();
    } else {
      if (this._notifPoller) clearInterval(this._notifPoller);
      this.setUnreadNotificationsCount(0);
    }
    this.notify('user_changed', user);
  },

  setCurrentTrip(trip) {
    this.currentTrip = trip;
    if (trip && trip._id) {
      localStorage.setItem('journeyhub_active_trip_id', trip._id);
    }
    this.notify('trip_changed', trip);
  },

  setCurrentTripId(tripId) {
    if (!tripId) return;
    localStorage.setItem('journeyhub_active_trip_id', tripId);
    const match = (this.trips || []).find(t => (t._id || t.id) === tripId);
    this.setCurrentTrip(match || { _id: tripId });
  },

  setTrips(trips) {
    this.trips = trips || [];
    this.notify('trips_updated', this.trips);
  },

  setUnreadNotificationsCount(count) {
    this.unreadNotificationsCount = count;
    this.notify('notifications_count_changed', count);
  },

  async initUser() {
    const token = window.API.getToken();
    if (!token) return null;

    try {
      const res = await window.API.get('/api/auth/me');
      if (res && res.user) {
        this.setUser(res.user);
        await this.loadTrips();
        await this.loadNotificationsCount();
        await this.loadWishlist();
        return res.user;
      }
    } catch (err) {
      console.warn('Failed to restore session:', err.message);
      this.setUser(null);
    }
    return null;
  },

  async loadTrips() {
    if (!this.currentUser) return;
    try {
      const res = await window.API.get('/api/trips');
      if (res && res.trips) {
        this.setTrips(res.trips);
        // Restore last active trip if available
        const savedTripId = localStorage.getItem('journeyhub_active_trip_id');
        if (savedTripId) {
          const match = res.trips.find(t => t._id === savedTripId);
          if (match) {
            this.setCurrentTrip(match);
          } else if (res.trips.length > 0) {
            this.setCurrentTrip(res.trips[0]);
          }
        } else if (res.trips.length > 0) {
          this.setCurrentTrip(res.trips[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load trips:', err);
    }
  },

  async loadNotificationsCount() {
    if (!this.currentUser) return;
    try {
      const res = await window.API.get('/api/notifications');
      if (res) {
        this.setUnreadNotificationsCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications count:', err.message);
    }
  },

  startNotificationPolling() {
    if (this._notifPoller) clearInterval(this._notifPoller);
    this._notifPoller = setInterval(() => {
      if (this.currentUser) {
        this.loadNotificationsCount();
      }
    }, 10000); // Check every 10 seconds for real-time notification alerts
  },

  wishlistIds: new Set(),

  isOrganiser() {
    const role = (this.currentUser?.role || '').toLowerCase();
    return role === 'organiser' || role === 'organizer' || role === 'admin';
  },

  isRegularUser() {
    return !this.isOrganiser();
  },

  async loadWishlist() {
    if (!this.currentUser) {
      this.wishlistIds = new Set();
      return;
    }
    try {
      const res = await window.API.get('/api/wishlist');
      if (res && res.wishlist) {
        this.wishlistIds = new Set(res.wishlist.map(w => (w.destinationId?._id || w.destinationId).toString()));
        this.notify('wishlist_updated', this.wishlistIds);
      }
    } catch (err) {
      console.warn('Failed to load wishlist:', err.message);
    }
  },

  isWishlisted(destinationId) {
    if (!destinationId) return false;
    return this.wishlistIds.has(destinationId.toString());
  },

  async toggleWishlist(destinationId) {
    if (!this.currentUser) {
      window.Toast?.show('Please log in to save destinations to your wishlist', 'warning');
      window.location.hash = '#/login';
      return false;
    }
    const destId = destinationId.toString();
    const alreadySaved = this.wishlistIds.has(destId);
    try {
      if (alreadySaved) {
        await window.API.delete(`/api/wishlist/${destId}`);
        this.wishlistIds.delete(destId);
        window.Toast?.show('Removed from your Wishlist', 'info');
      } else {
        await window.API.post(`/api/wishlist/${destId}`);
        this.wishlistIds.add(destId);
        window.Toast?.show('Saved to your Wishlist ❤️', 'success');
      }
      this.notify('wishlist_updated', this.wishlistIds);
      return !alreadySaved;
    } catch (err) {
      window.Toast?.show(err.message || 'Could not update wishlist', 'error');
      return alreadySaved;
    }
  }
};

/**
 * Universal Currency Symbol Resolver
 */
function getCurrencySymbol(currencyCode = 'USD') {
  if (!currencyCode) return '$';
  const clean = currencyCode.toString().trim().toUpperCase();
  const map = {
    USD: '$',
    EUR: '€',
    INR: '₹',
    GBP: '£',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'AU$',
    CHF: 'CHF',
    AED: 'AED',
    SGD: 'S$',
    NZD: 'NZ$'
  };
  return map[clean] || (clean.length <= 3 ? clean : '$');
}

/**
 * Universal Currency Formatter
 */
function formatCurrency(amount, currencyCode = 'USD') {
  const sym = getCurrencySymbol(currencyCode);
  const num = Number(amount) || 0;
  return `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

window.State = State;
window.getCurrencySymbol = getCurrencySymbol;
window.formatCurrency = formatCurrency;

