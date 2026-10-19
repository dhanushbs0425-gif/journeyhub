/**
 * JourneyHub Central API Client
 */
const API = {
  tokenKey: 'journeyhub_jwt_token',

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  },

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      // Special handling for CSV file downloads
      if (headers['Accept'] === 'text/csv' || endpoint.endsWith('/csv')) {
        if (!response.ok) throw new Error('Failed to download report');
        return await response.text();
      }

      const data = await response.json();

      if (response.status === 401) {
        // Expired or invalid token
        this.clearToken();
        if (window.State) window.State.setUser(null);
        window.location.hash = '#/login';
        throw new Error(data.message || 'Session expired. Please log in.');
      }

      if (!response.ok) {
        const err = new Error(data.message || 'An error occurred while processing your request.');
        err.status = response.status;
        err.code = data.code;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

window.API = API;
