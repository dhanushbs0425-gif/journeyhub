/**
 * Page: Traveler Registration — Gmail Email OTP Verification
 * Enforces real 6-digit Email OTP verification via Nodemailer / Gmail SMTP before account registration.
 * Normal login remains password-based without OTP.
 */
const RegisterPage = {
  isEmailVerified: false,
  verifiedEmail: '',
  resendTimer: null,
  cooldownSeconds: 0,
  isSendingOtp: false,
  isVerifyingOtp: false,

  render() {
    return `
      <div class="auth-wrapper" style="min-height: calc(100vh - 70px); display: flex; align-items: center; justify-content: center; padding: 2.5rem 1rem; background: linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(13, 148, 136, 0.05) 100%);">
        <div class="auth-card" style="width: 100%; max-width: 520px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid rgba(226, 232, 240, 0.8); padding: 2.25rem;">
          
          <div class="auth-header" style="text-align: center; margin-bottom: 1.75rem;">
            <div style="margin: 0 auto 1rem auto; width: 56px; height: 56px; border-radius: 50%; background: rgba(13, 148, 136, 0.1); display: flex; align-items: center; justify-content: center; color: var(--primary-teal, #0d9488); font-size: 1.5rem;">
              <i class="fas fa-envelope-open-text"></i>
            </div>
            <h2 style="font-family: var(--font-display, inherit); font-size: 1.65rem; font-weight: 800; color: #0f172a; margin: 0;">Create Your Account</h2>
            <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.4rem;">Verify your email address via Email OTP to get started on JourneyHub</p>
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

            <!-- 2. Email Address & Send OTP Button -->
            <div class="form-group" style="margin-bottom: 1.15rem;">
              <div style="margin-bottom: 0.35rem; display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label" for="reg-email" style="font-size: 0.85rem; font-weight: 600; color: #334155; margin: 0;">
                  <i class="fas fa-envelope" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Email Address <span style="color: #ef4444;">*</span>
                </label>
                <span style="font-size: 0.75rem; color: #64748b;">(Email OTP verification)</span>
              </div>

              <div style="display: flex; gap: 0.5rem; align-items: stretch;">
                <input
                  type="email"
                  id="reg-email"
                  class="form-control"
                  placeholder="e.g. maya@gmail.com"
                  autocomplete="email"
                  required
                  style="flex: 1; min-width: 0; padding: 0.75rem 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
                />
                <button
                  type="button"
                  id="btn-send-otp"
                  onclick="RegisterPage.handleSendOtp()"
                  class="btn btn-teal"
                  style="white-space: nowrap; padding: 0 1.15rem; font-size: 0.875rem; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; gap: 0.35rem;"
                >
                  <i class="fas fa-paper-plane"></i> <span id="label-send-otp">Send OTP</span>
                </button>
              </div>
              <div id="reg-email-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>

              <!-- Verified Status Banner -->
              <div id="email-verified-badge" style="display: none; margin-top: 0.6rem; padding: 0.6rem 0.85rem; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 0.85rem; font-weight: 600; align-items: center; gap: 0.4rem;">
                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1rem;"></i>
                <span>Email <strong id="verified-email-address"></strong> verified successfully!</span>
              </div>
            </div>

            <!-- 3. OTP Verification Section (Always visible so users immediately see where to enter code) -->
            <div id="section-otp-verify" style="display: block; margin-bottom: 1.25rem; background: #f8fafc; border: 1.5px dashed var(--primary-teal, #0d9488); border-radius: 12px; padding: 1.1rem; transition: all 0.2s ease;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label style="font-size: 0.85rem; font-weight: 700; color: #0f172a; margin: 0;">
                  <i class="fas fa-shield-alt" style="color: var(--primary-teal, #0d9488);"></i> Enter 6-Digit Email Verification Code:
                </label>
                <span style="font-size: 0.75rem; color: #64748b;"><i class="fas fa-clock"></i> Expires in 5 min</span>
              </div>

              <div style="display: flex; gap: 0.5rem; align-items: stretch; margin-top: 0.5rem;">
                <input
                  type="text"
                  id="reg-otp"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="Enter 6-digit OTP"
                  autocomplete="one-time-code"
                  style="flex: 1; padding: 0.7rem 1rem; border-radius: 8px; border: 2px solid #cbd5e1; font-size: 1.25rem; font-weight: 800; text-align: center; letter-spacing: 4px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;"
                />
                <button
                  type="button"
                  id="btn-verify-otp"
                  onclick="RegisterPage.handleVerifyOtp()"
                  class="btn btn-teal"
                  style="padding: 0 1.25rem; font-size: 0.875rem; font-weight: 700; border-radius: 8px; white-space: nowrap;"
                >
                  <span>Verify OTP</span>
                </button>
              </div>
              <div id="reg-otp-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.35rem;"></div>

              <div style="margin-top: 0.65rem; font-size: 0.78rem; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
                <span>Didn't receive email? Check spam folder or</span>
                <button
                  type="button"
                  id="btn-resend-inline"
                  onclick="RegisterPage.handleSendOtp()"
                  disabled
                  style="background: none; border: none; font-size: 0.78rem; font-weight: 700; color: #94a3b8; cursor: not-allowed; padding: 0;"
                >
                  <span id="label-resend-inline">Resend Code in 60s</span>
                </button>
              </div>
            </div>

            <!-- 4. Optional Phone Number -->
            <div class="form-group" style="margin-bottom: 1.15rem;">
              <label class="form-label" for="reg-phone" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">
                <i class="fas fa-phone-alt" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Mobile Phone Number <span style="font-size: 0.75rem; font-weight: 400; color: #64748b;">(Optional, for trip updates)</span>
              </label>
              <input
                type="tel"
                id="reg-phone"
                class="form-control"
                placeholder="e.g. +91 9876543210 (optional)"
                autocomplete="tel"
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
              <div id="reg-phone-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <!-- 5. Password -->
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
                >
                  <i class="fas fa-eye" id="toggle-reg-icon"></i>
                </button>
              </div>
              <div id="reg-pass-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <!-- 6. Confirm Password -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="reg-confirm-password" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">
                <i class="fas fa-check-double" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Confirm Password <span style="color: #ef4444;">*</span>
              </label>
              <input
                type="password"
                id="reg-confirm-password"
                class="form-control"
                placeholder="Re-type your password"
                autocomplete="new-password"
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              />
              <div id="reg-confirm-err" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <button type="submit" class="btn btn-teal btn-block btn-lg" id="reg-submit-btn" style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; border-radius: 8px;">
              <span>Complete Registration</span>
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
    this.isEmailVerified = false;
    this.verifiedEmail = '';
    this.clearIntervals();

    const form = document.getElementById('register-form');
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const phoneInput = document.getElementById('reg-phone');
    const passInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm-password');
    const toggleBtn = document.getElementById('toggle-reg-pass');
    const toggleIcon = document.getElementById('toggle-reg-icon');

    // Toggle password visibility
    if (toggleBtn && passInput && toggleIcon) {
      toggleBtn.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleIcon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    }

    // Reset verification if email input is modified before submit
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        if (this.isEmailVerified && emailInput.value.trim().toLowerCase() !== this.verifiedEmail) {
          this.isEmailVerified = false;
          this.verifiedEmail = '';
          const badge = document.getElementById('email-verified-badge');
          if (badge) badge.style.display = 'none';
          const btnSend = document.getElementById('btn-send-otp');
          if (btnSend) btnSend.style.display = 'inline-flex';
        }
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

      // 1. Validate Name
      if (!name || name.length < 2) {
        RegisterPage.showFieldError('reg-name-err', 'Please enter your full name (at least 2 characters).');
        hasError = true;
      }

      // 2. Validate Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        RegisterPage.showFieldError('reg-email-err', 'Please enter a valid email address.');
        hasError = true;
      }

      // 3. Ensure Email is Verified via Gmail OTP
      if (!this.isEmailVerified || this.verifiedEmail !== email) {
        RegisterPage.showFieldError('reg-email-err', 'Please click "Send OTP" and verify the 6-digit code sent to your email.');
        RegisterPage.showAlert('Email verification required: Please send and verify your email OTP first.', 'error');
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
        submitBtn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; margin: 0 0.5rem 0 0; display: inline-block; vertical-align: middle;"></span> Registering...`;
      }

      try {
        const payload = {
          name,
          email: this.verifiedEmail || email,
          phone: phone || undefined,
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

        setTimeout(() => {
          window.location.hash = '#/profile-setup';
        }, 200);
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Complete Registration</span>`;
        }
        RegisterPage.showAlert(err.message || 'Registration failed. Please check your information.', 'error');
      }
    });
  },

  async handleSendOtp() {
    if (this.isSendingOtp) return;
    RegisterPage.clearErrors();
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const btnSend = document.getElementById('btn-send-otp');
    const labelSend = document.getElementById('label-send-otp');

    const rawEmail = emailInput?.value.trim().toLowerCase();
    const name = nameInput?.value.trim() || 'Traveler';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      RegisterPage.showFieldError('reg-email-err', 'Please enter a valid email address before requesting an OTP.');
      return;
    }

    this.isSendingOtp = true;
    if (btnSend) {
      btnSend.disabled = true;
      if (labelSend) labelSend.textContent = 'Sending...';
    }

    try {
      const res = await window.API.post('/api/auth/send-email-otp', {
        email: rawEmail,
        name
      });

      // Highlight and focus the OTP input box
      const otpSection = document.getElementById('section-otp-verify');
      const otpInput = document.getElementById('reg-otp');
      if (otpSection) {
        otpSection.style.display = 'block';
        otpSection.style.borderColor = '#0d9488';
        otpSection.style.backgroundColor = '#f0fdfa';
      }
      if (otpInput) {
        otpInput.value = '';
        otpInput.style.borderColor = '#0d9488';
        otpInput.style.boxShadow = '0 0 0 4px rgba(13, 148, 136, 0.25)';
        otpInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => otpInput.focus(), 150);
      }

      RegisterPage.showAlert(res.message || `A 6-digit verification code has been dispatched to ${rawEmail}. Please check your email inbox (and spam folder).`, 'success');
      if (window.Toast) {
        window.Toast.show(res.message || 'Verification code sent to your email!', 'success');
      }

      RegisterPage.startCooldown(res.cooldown || 60);
    } catch (err) {
      if (btnSend) {
        btnSend.disabled = false;
        if (labelSend) labelSend.textContent = 'Send OTP';
      }

      // If cloud server is in cold-start spin-up
      const errMsg = err.message || '';
      const isResendSandboxNotice = 
        errMsg.includes('testing email address') || 
        errMsg.includes('only send testing emails') ||
        errMsg.includes('verify your domain') ||
        errMsg.includes('Invalid `to` field');

      if (err.isColdStart) {
        RegisterPage.showAlert(`
          <div style="font-weight: 700; margin-bottom: 0.4rem;"><i class="fas fa-spinner fa-spin"></i> Cloud Server Initializing:</div>
          <div>The cloud backend is finishing initialization (~10s remaining). Please wait a few moments and click <strong>Send OTP</strong> again.</div>
        `, 'warning');
      } else if (isResendSandboxNotice) {
        RegisterPage.showAlert(`
          <div style="font-weight: 700; margin-bottom: 0.4rem;"><i class="fas fa-info-circle"></i> Resend Testing Mode:</div>
          <div>In sandbox testing mode, verification codes can only be delivered to the verified developer email address (<code>dhanushbs0425@gmail.com</code>).</div>
          <div style="margin-top: 0.4rem; font-size: 0.8rem; color: #64748b;">To enable delivery to any email domain in production, verify your custom domain in the Resend dashboard.</div>
        `, 'warning');
      } else {
        RegisterPage.showAlert(errMsg || 'Failed to send verification code. Please check your email address and try again.', 'error');
      }
    } finally {
      this.isSendingOtp = false;
    }
  },

  async handleVerifyOtp() {
    if (this.isVerifyingOtp) return;
    RegisterPage.clearErrors();
    const emailInput = document.getElementById('reg-email');
    const otpInput = document.getElementById('reg-otp');
    const btnVerify = document.getElementById('btn-verify-otp');

    const rawEmail = emailInput?.value.trim().toLowerCase();
    const otp = otpInput?.value.trim();

    if (!otp || otp.length !== 6) {
      RegisterPage.showFieldError('reg-otp-err', 'Please enter the complete 6-digit verification code.');
      if (otpInput) otpInput.focus();
      return;
    }

    this.isVerifyingOtp = true;
    if (btnVerify) {
      btnVerify.disabled = true;
      btnVerify.innerHTML = `<span class="spinner" style="width: 14px; height: 14px; margin: 0; display: inline-block;"></span>`;
    }

    try {
      const res = await window.API.post('/api/auth/verify-email-otp', {
        email: rawEmail,
        otp
      });

      this.isEmailVerified = true;
      this.verifiedEmail = res.email || rawEmail;

      // Lock email input and show verified badge
      if (emailInput) emailInput.disabled = true;
      const btnSend = document.getElementById('btn-send-otp');
      if (btnSend) btnSend.style.display = 'none';

      const otpSection = document.getElementById('section-otp-verify');
      if (otpSection) otpSection.style.display = 'none';

      const badge = document.getElementById('email-verified-badge');
      const badgeAddress = document.getElementById('verified-email-address');
      if (badge) {
        if (badgeAddress) badgeAddress.textContent = this.verifiedEmail;
        badge.style.display = 'flex';
      }

      RegisterPage.showAlert('Email address verified successfully! You can now finish creating your account.', 'success');
      if (window.Toast) {
        window.Toast.show('Email verified successfully!', 'success');
      }

      // Move focus to password
      const passInput = document.getElementById('reg-password');
      if (passInput) passInput.focus();
    } catch (err) {
      if (btnVerify) {
        btnVerify.disabled = false;
        btnVerify.innerHTML = `<span>Verify OTP</span>`;
      }
      RegisterPage.showFieldError('reg-otp-err', err.message || 'Invalid or expired verification code.');
      RegisterPage.showAlert(err.message || 'OTP verification failed.', 'error');
    } finally {
      this.isVerifyingOtp = false;
    }
  },

  startCooldown(seconds) {
    this.clearIntervals();
    this.cooldownSeconds = seconds;

    const btnSend = document.getElementById('btn-send-otp');
    const labelSend = document.getElementById('label-send-otp');
    const btnResendInline = document.getElementById('btn-resend-inline');
    const labelResendInline = document.getElementById('label-resend-inline');

    const updateUI = () => {
      if (this.cooldownSeconds <= 0) {
        this.clearIntervals();
        if (btnSend) {
          btnSend.disabled = false;
          if (labelSend) labelSend.textContent = 'Resend OTP';
        }
        if (btnResendInline) {
          btnResendInline.disabled = false;
          btnResendInline.style.color = 'var(--primary-teal, #0d9488)';
          btnResendInline.style.cursor = 'pointer';
          if (labelResendInline) labelResendInline.textContent = 'Resend Code Now';
        }
      } else {
        if (btnSend) {
          btnSend.disabled = true;
          if (labelSend) labelSend.textContent = `Wait ${this.cooldownSeconds}s`;
        }
        if (btnResendInline) {
          btnResendInline.disabled = true;
          btnResendInline.style.color = '#94a3b8';
          btnResendInline.style.cursor = 'not-allowed';
          if (labelResendInline) labelResendInline.textContent = `Resend Code in ${this.cooldownSeconds}s`;
        }
      }
    };

    updateUI();

    this.resendTimer = setInterval(() => {
      this.cooldownSeconds -= 1;
      updateUI();
    }, 1000);
  },

  clearIntervals() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  },

  destroy() {
    this.clearIntervals();
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
