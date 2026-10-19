/**
 * Page 18: Settings & Preferences Page
 */
const SettingsPage = {
  render() {
    const user = window.State.currentUser;
    if (!user) return `<div class="empty-state">Please log in to manage settings.</div>`;

    const prefs = user.preferences || {};
    const currency = prefs.currency || 'USD';
    const threshold = prefs.budgetAlertThreshold || 80;
    const theme = prefs.theme || 'navy';
    const emailNotifs = prefs.emailNotifications !== false;

    return `
      <div class="settings-page" style="max-width: 780px; margin: 0 auto;">
        <div class="page-header">
          <div>
            <h1 class="page-title">Application Preferences & Settings</h1>
            <p class="page-subtitle">Configure preferred currency, budget warning alert thresholds, and interface appearance</p>
          </div>
        </div>

        <form id="settings-form">
          <!-- Appearance & Theme -->
          <div class="jh-card" style="margin-bottom: 1.5rem;">
            <div class="jh-card-header">
              <h3 class="jh-card-title"><i class="fas fa-palette" style="color: var(--primary-teal);"></i> Interface Theme</h3>
            </div>
            <div class="jh-card-body">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <label style="border: 2px solid ${theme === 'navy' ? 'var(--primary-teal)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                  <input type="radio" name="set-theme" value="navy" ${theme === 'navy' ? 'checked' : ''} style="accent-color: var(--primary-teal);" />
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem;">Deep Navy (Default)</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Signature travel palette</div>
                  </div>
                </label>

                <label style="border: 2px solid ${theme === 'light' ? 'var(--primary-teal)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                  <input type="radio" name="set-theme" value="light" ${theme === 'light' ? 'checked' : ''} style="accent-color: var(--primary-teal);" />
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem;">Light Minimal</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Clean crisp white canvas</div>
                  </div>
                </label>

                <label style="border: 2px solid ${theme === 'dark' ? 'var(--primary-teal)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                  <input type="radio" name="set-theme" value="dark" ${theme === 'dark' ? 'checked' : ''} style="accent-color: var(--primary-teal);" />
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem;">OLED Dark</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Midnight obsidian mode</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Currency & Budget Threshold -->
          <div class="jh-card" style="margin-bottom: 1.5rem;">
            <div class="jh-card-header">
              <h3 class="jh-card-title"><i class="fas fa-coins" style="color: var(--accent-orange);"></i> Currency & Financial Control</h3>
            </div>
            <div class="jh-card-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="set-currency">Default Preferred Currency <span id="set-currency-symbol">(${window.getCurrencySymbol(currency)})</span></label>
                  <select id="set-currency" class="form-control">
                    <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD ($ - United States Dollar)</option>
                    <option value="EUR" ${currency === 'EUR' ? 'selected' : ''}>EUR (€ - Euro)</option>
                    <option value="INR" ${currency === 'INR' ? 'selected' : ''}>INR (₹ - Indian Rupee)</option>
                    <option value="GBP" ${currency === 'GBP' ? 'selected' : ''}>GBP (£ - British Pound)</option>
                    <option value="JPY" ${currency === 'JPY' ? 'selected' : ''}>JPY (¥ - Japanese Yen)</option>
                    <option value="CAD" ${currency === 'CAD' ? 'selected' : ''}>CAD (CA$ - Canadian Dollar)</option>
                    <option value="AUD" ${currency === 'AUD' ? 'selected' : ''}>AUD (AU$ - Australian Dollar)</option>
                  </select>
                </div>

                <div class="form-group">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label class="form-label" for="set-threshold">Budget Warning Threshold</label>
                    <span id="threshold-val-label" style="font-weight: 800; color: var(--primary-teal);">${threshold}%</span>
                  </div>
                  <input type="range" id="set-threshold" min="50" max="100" step="5" value="${threshold}" style="width: 100%; accent-color: var(--primary-teal); margin-top: 0.5rem;" />
                  <div class="form-hint">JourneyHub alerts you when trip expenses reach this % of budget.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notifications & Alerts -->
          <div class="jh-card" style="margin-bottom: 2rem;">
            <div class="jh-card-header">
              <h3 class="jh-card-title"><i class="fas fa-bell" style="color: #6366f1;"></i> Notification Preferences</h3>
            </div>
            <div class="jh-card-body">
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.9rem;">Email Dispatch Notifications</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Receive email digests for itinerary changes and voting polls</div>
                  </div>
                  <input type="checkbox" id="set-email-notifs" ${emailNotifs ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--primary-teal);" />
                </label>

                <hr style="border: 0; border-top: 1px solid var(--border-color);" />

                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.9rem;">Real-Time Socket.IO Synchronization</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Stream collaborative changes, votes, and settlements instantly</div>
                  </div>
                  <input type="checkbox" checked disabled style="width: 20px; height: 20px; accent-color: var(--primary-teal);" />
                </label>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="submit" class="btn btn-teal btn-lg" id="save-settings-btn">
              <i class="fas fa-check"></i> Save Preferences
            </button>
          </div>
        </form>
      </div>
    `;
  },

  mount() {
    const slider = document.getElementById('set-threshold');
    const label = document.getElementById('threshold-val-label');
    if (slider && label) {
      slider.addEventListener('input', () => {
        label.textContent = `${slider.value}%`;
      });
    }

    const currSelect = document.getElementById('set-currency');
    const currSymbol = document.getElementById('set-currency-symbol');
    if (currSelect && currSymbol) {
      const updateSetSym = () => {
        currSymbol.textContent = `(${window.getCurrencySymbol(currSelect.value)})`;
      };
      currSelect.addEventListener('change', updateSetSym);
      currSelect.addEventListener('input', updateSetSym);
    }

    const form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('save-settings-btn');
      btn.disabled = true;

      const theme = document.querySelector('input[name="set-theme"]:checked')?.value || 'navy';
      const currency = document.getElementById('set-currency')?.value || 'USD';
      const budgetAlertThreshold = Number(document.getElementById('set-threshold')?.value) || 80;
      const emailNotifications = document.getElementById('set-email-notifs')?.checked;

      try {
        const res = await window.API.put('/api/auth/profile', {
          preferences: {
            theme,
            currency,
            budgetAlertThreshold,
            emailNotifications
          }
        });

        window.State.setUser(res.user);
        document.documentElement.setAttribute('data-theme', theme);
        window.showToast('Preferences saved successfully!', 'success');
      } catch (err) {
        window.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }
};

window.SettingsPage = SettingsPage;
