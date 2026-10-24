/**
 * Page: Traveler Registration (No OTP Required)
 * Supports direct registration with Full Name, Email Address, Mobile Number, Password, and Confirm Password.
 */
const RegisterPage = {
  render() {
    return `
      <div class="auth-wrapper" style="min-height: calc(100vh - 70px); display: flex; align-items: center; justify-content: center; padding: 2.5rem 1rem; background: linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(13, 148, 136, 0.05) 100%);">
        <div class="auth-card" style="width: 100%; max-width: 480px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid rgba(226, 232, 240, 0.8); padding: 2.25rem;">
          
          <div class="auth-header" style="text-align: center; margin-bottom: 1.75rem;">
            <div style="margin: 0 auto 1rem auto; width: 56px; height: 56px; border-radius: 50%; background: rgba(13, 148, 136, 0.1); display: flex; align-items: center; justify-content: center; color: var(--primary-teal, #0d9488); font-size: 1.5rem;">
              <i class="fas fa-user-plus"></i>
            </div>
            <h2 style="font-family: var(--font-display, inherit); font-size: 1.65rem; font-weight: 800; color: #0f172a; margin: 0;">Create Your Account</h2>
            <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.4rem;">Join JourneyHub to explore group trips, share expenses, and plan adventures</p>
          </div>

          <div id="register-alert-box" style="display: none; padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.875rem; line-height: 1.45;"></div>

          <form id="register-form" novalidate>
            <!-- 1. Full Name -->
            <div class="form-group" style="margin-bottom: 1.15rem;">
              <label class="form-label" for="reg-name" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">
                <i class="fas fa-user" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Full Name <span style="color: #ef4444;">*</span>
              </label>
              <input
                type="text"
                id="reg-name"
                class="form-control"
                placeholder="e.g. Maya Patel"
                autocomplete="name"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
              <div id="reg-name-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <!-- 2. Email Address -->
            <div class="form-group" style="margin-bottom: 1.15rem;">
              <label class="form-label" for="reg-email" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">
                <i class="fas fa-envelope" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Email Address <span style="color: #ef4444;">*</span>
              </label>
              <input
                type="email"
                id="reg-email"
                class="form-control"
                placeholder="e.g. maya@example.com"
                autocomplete="email"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
              <div id="reg-email-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <!-- 3. Mobile Number -->
            <div class="form-group" style="margin-bottom: 1.15rem;">
              <label class="form-label" for="reg-phone" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">
                <i class="fas fa-phone-alt" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Mobile Number <span style="color: #ef4444;">*</span>
              </label>
              <input
                type="tel"
                id="reg-phone"
                class="form-control"
                placeholder="e.g. 9876543210 or +91 9876543210"
                autocomplete="tel"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
              <div id="reg-phone-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <!-- 4. Password -->
            <div class="form-group" style="margin-bottom: 1.15rem;">
              <label class="form-label" for="reg-password" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">
                <i class="fas fa-lock" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Password <span style="color: #ef4444;">*</span>
              </label>
              <div style="position: relative;">
                <input
                  type="password"
                  id="reg-password"
                  class="form-control"
                  placeholder="At least 6 characters"
                  autocomplete="new-password"
                  required
                  minlength="6"
                  style="width: 100%; padding: 0.75rem 2.5rem 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
                />
                <button
                  type="button"
                  id="toggle-reg-pass"
                  tabindex="-1"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;"
                  title="Show/Hide Password"
                >
                  <i class="fas fa-eye" id="toggle-reg-icon"></i>
                </button>
              </div>
              <div id="reg-pass-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <!-- 5. Confirm Password -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="reg-confirm-password" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">
                <i class="fas fa-check-double" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Confirm Password <span style="color: #ef4444;">*</span>
              </label>
              <div style="position: relative;">
                <input
                  type="password"
                  id="reg-confirm-password"
                  class="form-control"
                  placeholder="Re-type your password"
                  autocomplete="new-password"
                  required
                  minlength="6"
                  style="width: 100%; padding: 0.75rem 2.5rem 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
                />
                <button
                  type="button"
                  id="toggle-reg-confirm-pass"
                  tabindex="-1"
                  style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;"
                  title="Show/Hide Confirm Password"
                >
                  <i class="fas fa-eye" id="toggle-reg-confirm-icon"></i>
                </button>
              </div>
              <div id="reg-confirm-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <button type="submit" class="btn btn-teal btn-block btn-lg" id="reg-submit-btn" style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; border-radius: 8px;">
              <span>Create Account</span>
            </button>
          </form>

          <div style="margin-top: 1.75rem; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 1.25rem;">
            <p style="font-size: 0.875rem; color: #64748b; margin: 0;">
              Already have an account? 
              <a href="#/login" style="color: var(--primary-teal, #0d9488); font-weight: 700; text-decoration: none;">Sign in here</a>
            </p>
          </div>

        </div>
      </div>
    `;
  },

  mount() {
    const form = document.getElementById('register-form');
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const phoneInput = document.getElementById('reg-phone');
    const passInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm-password');
    const toggleBtn = document.getElementById('toggle-reg-pass');
    const toggleIcon = document.getElementById('toggle-reg-icon');
    const toggleConfirmBtn = document.getElementById('toggle-reg-confirm-pass');
    const toggleConfirmIcon = document.getElementById('toggle-reg-confirm-icon');

    // Toggle password visibility
    if (toggleBtn && passInput && toggleIcon) {
      toggleBtn.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleIcon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    }

    // Toggle confirm password visibility
    if (toggleConfirmBtn && confirmInput && toggleConfirmIcon) {
      toggleConfirmBtn.addEventListener('click', () => {
        const isPass = confirmInput.type === 'password';
        confirmInput.type = isPass ? 'text' : 'password';
        toggleConfirmIcon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      RegisterPage.clearErrors();

      const name = nameInput?.value.trim();
      const email = emailInput?.value.trim().toLowerCase();
      const phone = phoneInput?.value.trim();
      const password = passInput?.value;
      const confirmPassword = confirmInput?.value;

      let hasError = false;

      // 1. Validate Full Name
      if (!name || name.length < 2) {
        RegisterPage.showFieldError('reg-name-err', 'Please enter your full name (at least 2 characters).');
        hasError = true;
      }

      // 2. Validate Email Address format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        RegisterPage.showFieldError('reg-email-err', 'Please enter a valid email address.');
        hasError = true;
      }

      // 3. Validate Mobile Number (required, 10-15 digits)
      const phoneDigits = (phone || '').replace(/\D/g, '');
      if (!phone || phoneDigits.length < 10 || phoneDigits.length > 15) {
        RegisterPage.showFieldError('reg-phone-err', 'Please enter a valid 10 to 15 digit mobile number.');
        hasError = true;
      }

      // 4. Validate Passwords
      if (!password || password.length < 6) {
        RegisterPage.showFieldError('reg-pass-err', 'Password must be at least 6 characters long.');
        hasError = true;
      }

      if (password !== confirmPassword) {
        RegisterPage.showFieldError('reg-confirm-err', 'Passwords do not match.');
        hasError = true;
      }

      if (hasError) return;

      const submitBtn = document.getElementById('reg-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; margin: 0 0.5rem 0 0; display: inline-block; vertical-align: middle;"></span> Creating Account...`;
      }

      try {
        const payload = {
          name,
          email,
          phone,
          password,
          confirmPassword
        };

        const res = await window.API.post('/api/auth/register', payload);

        // Store authenticated session token and state
        window.API.setToken(res.token);
        window.State.setUser(res.user);

        if (window.Toast) {
          window.Toast.show(res.message || 'Registration successful! Welcome to JourneyHub.', 'success');
        }

        // Navigate directly to dashboard or home maintaining active session
        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 200);
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Create Account</span>`;
        }
        RegisterPage.showAlert(err.message || 'Registration failed. Please check your information.', 'error');
      }
    });
  },

  destroy() {
    this.clearErrors();
  },

  showAlert(message, type = 'error') {
    const box = document.getElementById('register-alert-box');
    if (!box) return;
    box.innerHTML = message;
    box.style.display = 'block';
    if (type === 'error') {
      box.style.background = '#fef2f2';
      box.style.border = '1px solid #fecaca';
      box.style.color = '#991b1b';
    } else {
      box.style.background = '#ecfdf5';
      box.style.border = '1px solid #a7f3d0';
      box.style.color = '#065f46';
    }
  },

  showFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  },

  clearErrors() {
    const box = document.getElementById('register-alert-box');
    if (box) box.style.display = 'none';
    document.querySelectorAll('[id$="-err"]').forEach((el) => {
      el.style.display = 'none';
      el.textContent = '';
    });
  }
};

window.RegisterPage = RegisterPage;
