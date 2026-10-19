/**
 * Page: Reset Password (Step 2 of Password Recovery)
 * Verifies 6-digit SMS OTP and updates user's hashed password
 */
const ResetPasswordPage = {
  render() {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const phone = params.get('phone') || sessionStorage.getItem('journeyhub_reset_phone') || '';
    const email = params.get('email') || sessionStorage.getItem('journeyhub_reset_email') || '';
    const identifier = phone || email || '';

    return `
      <div class="auth-wrapper" style="min-height: calc(100vh - 70px); display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(13, 148, 136, 0.05) 100%);">
        <div class="auth-card" style="width: 100%; max-width: 460px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid rgba(226, 232, 240, 0.8); padding: 2.25rem;">
          
          <div class="auth-header" style="text-align: center; margin-bottom: 2rem;">
            <div style="margin: 0 auto 1.25rem auto; width: 56px; height: 56px; border-radius: 50%; background: rgba(13, 148, 136, 0.1); display: flex; align-items: center; justify-content: center; color: var(--primary-teal, #0d9488); font-size: 1.5rem;">
              <i class="fas fa-shield-alt"></i>
            </div>
            <h2 style="font-family: var(--font-display, inherit); font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0;">Create New Password</h2>
            <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.4rem; line-height: 1.4;">
              Enter the 6-digit SMS verification code and choose your new password
            </p>
          </div>

          <div id="reset-alert-box" style="display: none; padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.875rem; line-height: 1.4;"></div>

          <form id="reset-password-form" novalidate>
            <!-- Registered Mobile Phone Number -->
            <div class="form-group" style="margin-bottom: 1.2rem;">
              <label class="form-label" for="reset-target" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                <i class="fas fa-mobile-alt" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Registered Mobile Phone Number <span style="color: #ef4444;">*</span>
              </label>
              <input
                type="text"
                id="reset-target"
                class="form-control"
                value="${identifier}"
                placeholder="e.g. 9876543210 or +919876543210"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
            </div>

            <!-- 6-Digit SMS OTP -->
            <div class="form-group" style="margin-bottom: 1.2rem;">
              <label class="form-label" for="reset-otp" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                <i class="fas fa-key" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> 6-Digit SMS Code <span style="color: #ef4444;">*</span>
              </label>
              <input
                type="text"
                id="reset-otp"
                class="form-control"
                placeholder="&bull; &bull; &bull; &bull; &bull; &bull;"
                maxlength="6"
                inputmode="numeric"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 1.25rem; letter-spacing: 5px; font-weight: 800; text-align: center;"
              />
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">Valid for 10 minutes from request.</div>
            </div>

            <!-- New Password -->
            <div class="form-group" style="margin-bottom: 1.2rem;">
              <label class="form-label" for="reset-new-password" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                <i class="fas fa-lock" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> New Password <span style="color: #ef4444;">*</span>
              </label>
              <input
                type="password"
                id="reset-new-password"
                class="form-control"
                placeholder="At least 6 characters"
                required
                minlength="6"
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
            </div>

            <!-- Confirm New Password -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="reset-confirm-password" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                <i class="fas fa-check-double" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Confirm New Password <span style="color: #ef4444;">*</span>
              </label>
              <input
                type="password"
                id="reset-confirm-password"
                class="form-control"
                placeholder="Re-type new password"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
            </div>

            <button type="submit" class="btn btn-teal btn-block btn-lg" id="reset-submit-btn" style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; border-radius: 8px;">
              <span>Update Password</span>
            </button>
          </form>

          <div style="margin-top: 1.75rem; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 1.5rem;">
            <p style="font-size: 0.875rem; color: #64748b; margin: 0;">
              <a href="#/login" style="color: var(--primary-teal, #0d9488); font-weight: 700; text-decoration: none;">Back to Sign In</a>
            </p>
          </div>

        </div>
      </div>
    `;
  },

  mount() {
    const form = document.getElementById('reset-password-form');
    const otpInput = document.getElementById('reset-otp');
    if (otpInput && !otpInput.value) otpInput.focus();

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const target = document.getElementById('reset-target')?.value.trim();
      const otp = document.getElementById('reset-otp')?.value.trim();
      const newPassword = document.getElementById('reset-new-password')?.value;
      const confirmPassword = document.getElementById('reset-confirm-password')?.value;

      if (!target || !otp || !newPassword) {
        ResetPasswordPage.showAlert('Please fill in all required fields.', 'error');
        return;
      }

      if (otp.length !== 6) {
        ResetPasswordPage.showAlert('Please enter the full 6-digit verification code.', 'error');
        return;
      }

      if (newPassword.length < 6) {
        ResetPasswordPage.showAlert('New password must be at least 6 characters long.', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        ResetPasswordPage.showAlert('New passwords do not match.', 'error');
        return;
      }

      const btn = document.getElementById('reset-submit-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; margin: 0 0.5rem 0 0; display: inline-block; vertical-align: middle;"></span> Resetting Password...`;
      }

      try {
        const res = await window.API.post('/api/auth/reset-password', {
          phone: target,
          email: target,
          otp,
          newPassword,
          confirmPassword
        });

        sessionStorage.removeItem('journeyhub_reset_phone');
        sessionStorage.removeItem('journeyhub_reset_email');

        if (window.Toast) {
          window.Toast.show(res.message || 'Password updated successfully! Please sign in.', 'success');
        }

        setTimeout(() => {
          window.location.hash = '#/login';
        }, 300);
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>Update Password</span>`;
        }
        ResetPasswordPage.showAlert(err.message || 'Password reset failed. Please check your code.', 'error');
      }
    });
  },

  showAlert(message, type = 'error') {
    const alertBox = document.getElementById('reset-alert-box');
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

window.ResetPasswordPage = ResetPasswordPage;
