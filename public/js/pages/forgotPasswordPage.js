/**
 * Page: Forgot Password (Step 1 of Password Recovery)
 * Sends time-limited recovery OTP to registered mobile number
 */
const ForgotPasswordPage = {
  render() {
    return `
      <div class="auth-wrapper" style="min-height: calc(100vh - 70px); display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(13, 148, 136, 0.05) 100%);">
        <div class="auth-card" style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid rgba(226, 232, 240, 0.8); padding: 2.25rem;">
          
          <div class="auth-header" style="text-align: center; margin-bottom: 2rem;">
            <div style="margin: 0 auto 1.25rem auto; width: 56px; height: 56px; border-radius: 50%; background: rgba(249, 115, 22, 0.1); display: flex; align-items: center; justify-content: center; color: var(--accent-orange, #f97316); font-size: 1.5rem;">
              <i class="fas fa-key"></i>
            </div>
            <h2 style="font-family: var(--font-display, inherit); font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0;">Reset Password</h2>
            <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.4rem; line-height: 1.4;">
              Enter your registered mobile phone number to receive a 6-digit SMS verification code
            </p>
          </div>

          <div id="forgot-alert-box" style="display: none; padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.875rem; line-height: 1.4;"></div>

          <form id="forgot-password-form" novalidate>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="forgot-phone" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                <i class="fas fa-mobile-alt" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Registered Mobile Phone Number
              </label>
              <input
                type="text"
                id="forgot-phone"
                class="form-control"
                placeholder="e.g. 9876543210 or +919876543210"
                autocomplete="tel"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
            </div>

            <button type="submit" class="btn btn-teal btn-block btn-lg" id="forgot-submit-btn" style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; border-radius: 8px;">
              <span>Send SMS Reset Code</span>
            </button>
          </form>

          <div style="margin-top: 1.75rem; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 1.5rem;">
            <p style="font-size: 0.875rem; color: #64748b; margin: 0;">
              Remembered your password? 
              <a href="#/login" style="color: var(--primary-teal, #0d9488); font-weight: 700; text-decoration: none;">Back to Sign In</a>
            </p>
          </div>

        </div>
      </div>
    `;
  },

  mount() {
    const form = document.getElementById('forgot-password-form');
    const phoneInput = document.getElementById('forgot-phone');
    if (phoneInput) phoneInput.focus();

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = phoneInput?.value.trim();

      if (!phone || phone.length < 7) {
        ForgotPasswordPage.showAlert('Please enter your valid registered mobile phone number.', 'error');
        return;
      }

      const btn = document.getElementById('forgot-submit-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; margin: 0 0.5rem 0 0; display: inline-block; vertical-align: middle;"></span> Sending Reset Code...`;
      }

      try {
        const res = await window.API.post('/api/auth/forgot-password', { phone });

        if (window.Toast) {
          window.Toast.show('If an account exists, an SMS reset code was sent.', 'info');
        }

        sessionStorage.setItem('journeyhub_reset_phone', phone);
        setTimeout(() => {
          window.location.hash = `#/reset-password?phone=${encodeURIComponent(phone)}`;
        }, 300);
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>Send SMS Reset Code</span>`;
        }

        if (err.code === 'SMS_PROVIDER_NOT_CONFIGURED') {
          ForgotPasswordPage.showAlert(
            `<strong>SMS Service Not Configured:</strong><br>
            Password recovery requires MSG91 SMS credentials (<code>MSG91_AUTH_KEY</code>, <code>MSG91_TEMPLATE_ID</code>) in your <code>.env</code> file.`,
            'error'
          );
        } else {
          ForgotPasswordPage.showAlert(err.message || 'Unable to process password reset request.', 'error');
        }
      }
    });
  },

  showAlert(message, type = 'error') {
    const alertBox = document.getElementById('forgot-alert-box');
    if (!alertBox) return;

    if (type === 'error') {
      alertBox.style.background = '#fef2f2';
      alertBox.style.color = '#991b1b';
      alertBox.style.border = '1px solid #fecaca';
    } else {
      alertBox.style.background = '#f0fdf4';
      alertBox.style.color = '#166534';
      alertBox.style.border = '1px solid #bbf7d0';
    }

    alertBox.innerHTML = message;
    alertBox.style.display = 'block';
  }
};

window.ForgotPasswordPage = ForgotPasswordPage;
