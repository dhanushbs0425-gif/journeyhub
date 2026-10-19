/**
 * Page: VerifyOtpPage (Redirects to unified mobile OTP registration)
 * OTP verification is now embedded directly in the registration flow.
 */
const VerifyOtpPage = {
  render() {
    return `
      <div style="min-height: calc(100vh - 70px); display: flex; align-items: center; justify-content: center;">
        <div class="spinner"></div>
      </div>
    `;
  },
  mount() {
    window.location.hash = '#/register';
  }
};

window.VerifyOtpPage = VerifyOtpPage;
