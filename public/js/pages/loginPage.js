/**
 * Page: Real Database-Backed Login Page
 * Supports login using verified Mobile Phone Number or Email/Username and password
 * Standard login requires NO OTP.
 */
const LoginPage = {
  render() {
    return `
      <div class="auth-wrapper" style="min-height: calc(100vh - 70px); display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(13, 148, 136, 0.05) 100%);">
        <div class="auth-card" style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid rgba(226, 232, 240, 0.8); padding: 2.25rem;">
          
          <div class="auth-header" style="text-align: center; margin-bottom: 2rem;">
            <div class="brand-icon" style="margin: 0 auto 1rem auto; width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, var(--primary-teal, #0d9488) 0%, #0f766e 100%); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 1.4rem; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
              <i class="fas fa-compass"></i>
            </div>
            <h2 style="font-family: var(--font-display, inherit); font-size: 1.65rem; font-weight: 800; color: #0f172a; margin: 0;">Welcome Back</h2>
            <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.4rem;">Sign in to your JourneyHub account</p>
          </div>

          <div id="login-alert-box" style="display: none; padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.875rem; line-height: 1.4;"></div>

          <form id="login-form" novalidate>
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label" for="login-identifier" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                <i class="fas fa-mobile-alt" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Mobile Phone Number or Email
              </label>
              <input
                type="text"
                id="login-identifier"
                class="form-control"
                placeholder="e.g. 9876543210 or user@example.com"
                autocomplete="username"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <label class="form-label" for="login-password" style="font-size: 0.85rem; font-weight: 600; color: #334155; margin: 0;">
                  <i class="fas fa-lock" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Password
                </label>
                <a href="#/forgot-password" style="font-size: 0.8rem; color: var(--primary-teal, #0d9488); font-weight: 600; text-decoration: none;">
                  Forgot password?
                </a>
              </div>
              <div style="position: relative;">
                <input
                  type="password"
                  id="login-password"
                  class="form-control"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  required
                  style="width: 100%; padding: 0.75rem 2.5rem 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
                />
                <button
                  type="button"
                  id="toggle-login-password"
                  tabindex="-1"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;"
                  title="Show/Hide password"
                >
                  <i class="fas fa-eye" id="toggle-login-icon"></i>
                </button>
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #64748b; cursor: pointer; user-select: none;">
                <input type="checkbox" id="login-remember-me" style="accent-color: var(--primary-teal, #0d9488); width: 16px; height: 16px;" />
                Remember me for 30 days
              </label>
            </div>

            <button type="submit" class="btn btn-teal btn-block btn-lg" id="login-submit-btn" style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; border-radius: 8px;">
              <span>Sign In</span>
            </button>
          </form>

          <div style="margin-top: 1.75rem; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 1.5rem;">
            <p style="font-size: 0.875rem; color: #64748b; margin: 0;">
              Don't have an account yet? 
              <a href="#/register" style="color: var(--primary-teal, #0d9488); font-weight: 700; text-decoration: none;">Create an account</a>
            </p>
          </div>

        </div>
      </div>
    `;
  },

  mount() {
    const form = document.getElementById('login-form');
    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('toggle-login-password');
    const toggleIcon = document.getElementById('toggle-login-icon');
    const alertBox = document.getElementById('login-alert-box');

    if (identifierInput) identifierInput.focus();

    if (toggleBtn && passwordInput && toggleIcon) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        toggleIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.style.display = 'none';

      const identifier = identifierInput?.value.trim();
      const password = passwordInput?.value;
      const rememberMe = document.getElementById('login-remember-me')?.checked || false;

      if (!identifier || !password) {
        LoginPage.showAlert('Please enter your mobile phone number (or email) and password.', 'error');
        return;
      }

      const btn = document.getElementById('login-submit-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; margin: 0 0.5rem 0 0; display: inline-block; vertical-align: middle;"></span> Signing In...`;
      }

      try {
        const res = await window.API.post('/api/auth/login', {
          identifier,
          password,
          rememberMe
        });

        window.API.setToken(res.token);
        window.State.setUser(res.user);

        if (window.Toast) {
          const roleLabel = res.user.role === 'organiser' ? 'Trip Organiser' : 'Traveler';
          window.Toast.show(`Welcome back, ${res.user.name}! (${roleLabel})`, 'success');
        }

        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 150);
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>Sign In</span>`;
        }

        const isWakeup = err.isColdStart || err.status === 502 || err.status === 503 || err.message?.includes('waking up') || err.message?.includes('reach');
        const alertMsg = isWakeup
          ? '⚡ Cloud server is waking up (Render free tier spin-up). Please wait a few seconds and click Sign In again.'
          : (err.message || 'Invalid email/username or password. Please try again.');
        LoginPage.showAlert(alertMsg, isWakeup ? 'warning' : 'error');
      }
    });
  },

  showAlert(message, type = 'error') {
    const alertBox = document.getElementById('login-alert-box');
    if (!alertBox) return;

    if (type === 'error') {
      alertBox.style.background = '#fef2f2';
      alertBox.style.color = '#991b1b';
      alertBox.style.border = '1px solid #fecaca';
    } else if (type === 'warning') {
      alertBox.style.background = '#fffbeb';
      alertBox.style.color = '#92400e';
      alertBox.style.border = '1px solid #fde68a';
    } else {
      alertBox.style.background = '#f0fdf4';
      alertBox.style.color = '#166534';
      alertBox.style.border = '1px solid #bbf7d0';
    }

    alertBox.innerHTML = message;
    alertBox.style.display = 'block';
  }
};

window.LoginPage = LoginPage;
