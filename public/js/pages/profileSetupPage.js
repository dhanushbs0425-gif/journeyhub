/**
 * Page: Profile Setup Page (Step 4 of First-Time User Registration)
 * Allows users to personalize their avatar, contact phone, home city, budget preference, and travel categories
 */
const ProfileSetupPage = {
  selectedAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',

  avatarPresets: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80'
  ],

  render() {
    const user = window.State?.user || {};
    const name = user.name || 'Traveler';

    return `
      <div class="auth-wrapper" style="min-height: calc(100vh - 70px); display: flex; align-items: center; justify-content: center; padding: 2.5rem 1rem; background: linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(13, 148, 136, 0.05) 100%);">
        <div class="auth-card" style="width: 100%; max-width: 620px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid rgba(226, 232, 240, 0.8); padding: 2.5rem;">
          
          <div class="auth-header" style="text-align: center; margin-bottom: 2rem;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: rgba(13, 148, 136, 0.1); color: var(--primary-teal, #0d9488); font-size: 1.25rem; margin-bottom: 0.75rem;">
              <i class="fas fa-check-circle"></i>
            </div>
            <h2 style="font-family: var(--font-display, inherit); font-size: 1.65rem; font-weight: 800; color: #0f172a; margin: 0;">Welcome, ${name}!</h2>
            <p style="font-size: 0.95rem; color: #64748b; margin-top: 0.4rem;">Let's customize your traveler profile so you get matched with great trips</p>
          </div>

          <form id="profile-setup-form" novalidate>
            <!-- Avatar Selection -->
            <div class="form-group" style="margin-bottom: 1.75rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.75rem;">
                Choose Profile Avatar
              </label>
              
              <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1rem;">
                <img
                  id="setup-avatar-preview"
                  src="${this.selectedAvatar}"
                  alt="Avatar Preview"
                  style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-teal, #0d9488); box-shadow: 0 4px 10px rgba(0,0,0,0.1);"
                />
                <div style="flex: 1;">
                  <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.4rem;">Pick a preset or paste an image URL:</div>
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${this.avatarPresets.map((url, i) => `
                      <img
                        src="${url}"
                        alt="Preset ${i + 1}"
                        class="avatar-preset-item"
                        data-url="${url}"
                        style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; cursor: pointer; border: 2px solid ${i === 0 ? 'var(--primary-teal, #0d9488)' : '#e2e8f0'}; transition: transform 0.2s;"
                      />
                    `).join('')}
                  </div>
                </div>
              </div>

              <input
                type="url"
                id="setup-avatar-url"
                class="form-control"
                placeholder="https://images.unsplash.com/... (optional custom photo URL)"
                value="${this.selectedAvatar}"
                style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem;"
              />
            </div>

            <!-- Contact & Location Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group">
                <label class="form-label" for="setup-phone" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                  <i class="fas fa-phone" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Phone Number
                </label>
                <input
                  type="tel"
                  id="setup-phone"
                  class="form-control"
                  placeholder="+91 98765 43210"
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="setup-home-city" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                  <i class="fas fa-city" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Home City
                </label>
                <input
                  type="text"
                  id="setup-home-city"
                  class="form-control"
                  placeholder="e.g. Bengaluru, Mumbai"
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
                />
              </div>
            </div>

            <!-- Budget Preference -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.5rem;">
                <i class="fas fa-wallet" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Budget Preference
              </label>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
                <label class="budget-option" style="border: 2px solid #cbd5e1; border-radius: 8px; padding: 0.75rem; text-align: center; cursor: pointer; transition: all 0.2s;">
                  <input type="radio" name="budget-pref" value="Budget" style="accent-color: var(--primary-teal, #0d9488);" />
                  <div style="font-weight: 700; font-size: 0.9rem; margin-top: 0.25rem;">Budget</div>
                  <div style="font-size: 0.75rem; color: #64748b;">Hostels & Backpacking</div>
                </label>
                <label class="budget-option" style="border: 2px solid var(--primary-teal, #0d9488); background: rgba(13,148,136,0.05); border-radius: 8px; padding: 0.75rem; text-align: center; cursor: pointer; transition: all 0.2s;">
                  <input type="radio" name="budget-pref" value="Moderate" checked style="accent-color: var(--primary-teal, #0d9488);" />
                  <div style="font-weight: 700; font-size: 0.9rem; margin-top: 0.25rem;">Moderate</div>
                  <div style="font-size: 0.75rem; color: #64748b;">Comfortable Boutique</div>
                </label>
                <label class="budget-option" style="border: 2px solid #cbd5e1; border-radius: 8px; padding: 0.75rem; text-align: center; cursor: pointer; transition: all 0.2s;">
                  <input type="radio" name="budget-pref" value="Luxury" style="accent-color: var(--primary-teal, #0d9488);" />
                  <div style="font-weight: 700; font-size: 0.9rem; margin-top: 0.25rem;">Luxury</div>
                  <div style="font-size: 0.75rem; color: #64748b;">Resorts & Premium</div>
                </label>
              </div>
            </div>

            <!-- Preferred Travel Categories -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.5rem;">
                <i class="fas fa-tags" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Preferred Travel Categories
              </label>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${[
                  { id: 'Mountains & Hill Stations', label: 'Mountains & Hills', icon: 'fa-mountain' },
                  { id: 'Beaches & Coastal', label: 'Beaches & Coastal', icon: 'fa-umbrella-beach' },
                  { id: 'Heritage & Historical', label: 'Heritage & Historical', icon: 'fa-monument' },
                  { id: 'Nature & Wildlife', label: 'Nature & Wildlife', icon: 'fa-paw' },
                  { id: 'Spiritual & Cultural', label: 'Spiritual & Cultural', icon: 'fa-place-of-worship' },
                  { id: 'Adventure Sports', label: 'Adventure Sports', icon: 'fa-hiking' }
                ].map((cat, idx) => `
                  <label class="cat-pill" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; border-radius: 9999px; border: 1px solid #cbd5e1; font-size: 0.85rem; cursor: pointer; user-select: none;">
                    <input type="checkbox" name="travel-cat" value="${cat.id}" ${idx < 3 ? 'checked' : ''} style="accent-color: var(--primary-teal, #0d9488);" />
                    <i class="fas ${cat.icon}" style="color: var(--primary-teal, #0d9488); font-size: 0.75rem;"></i> ${cat.label}
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Bio -->
            <div class="form-group" style="margin-bottom: 2rem;">
              <label class="form-label" for="setup-bio" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
                <i class="fas fa-quote-left" style="color: var(--primary-teal, #0d9488); margin-right: 0.35rem;"></i> Short Bio
              </label>
              <textarea
                id="setup-bio"
                class="form-control"
                rows="2"
                placeholder="A couple of sentences about your travel style and favorite places..."
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem;"
              >Passionate globetrotter exploring new horizons.</textarea>
            </div>

            <button type="submit" class="btn btn-teal btn-block btn-lg" id="setup-submit-btn" style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; border-radius: 8px;">
              <span>Save Profile & Go to Dashboard</span>
            </button>
          </form>

          <div style="margin-top: 1.25rem; text-align: center;">
            <a href="#/dashboard" style="font-size: 0.875rem; color: #64748b; text-decoration: underline;">
              Skip for now and go directly to Dashboard &rarr;
            </a>
          </div>

        </div>
      </div>
    `;
  },

  mount() {
    const form = document.getElementById('profile-setup-form');
    const avatarPreview = document.getElementById('setup-avatar-preview');
    const avatarInput = document.getElementById('setup-avatar-url');
    const presets = document.querySelectorAll('.avatar-preset-item');

    // Preset avatar selection
    presets.forEach((p) => {
      p.addEventListener('click', () => {
        const url = p.getAttribute('data-url');
        ProfileSetupPage.selectedAvatar = url;
        if (avatarPreview) avatarPreview.src = url;
        if (avatarInput) avatarInput.value = url;

        presets.forEach((img) => (img.style.borderColor = '#e2e8f0'));
        p.style.borderColor = 'var(--primary-teal, #0d9488)';
      });
    });

    if (avatarInput) {
      avatarInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url && avatarPreview) {
          avatarPreview.src = url;
          ProfileSetupPage.selectedAvatar = url;
        }
      });
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const avatar = avatarInput?.value.trim() || ProfileSetupPage.selectedAvatar;
      const phone = document.getElementById('setup-phone')?.value.trim();
      const homeCity = document.getElementById('setup-home-city')?.value.trim();
      const bio = document.getElementById('setup-bio')?.value.trim();

      const budgetRadio = document.querySelector('input[name="budget-pref"]:checked');
      const budgetPreference = budgetRadio ? budgetRadio.value : 'Moderate';

      const catCheckboxes = document.querySelectorAll('input[name="travel-cat"]:checked');
      const preferredCategories = Array.from(catCheckboxes).map((cb) => cb.value);

      const btn = document.getElementById('setup-submit-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; margin: 0 0.5rem 0 0; display: inline-block; vertical-align: middle;"></span> Saving Profile...`;
      }

      try {
        const res = await window.API.patch('/api/users/profile', {
          avatar,
          phone,
          bio,
          homeCity,
          budgetPreference,
          preferredCategories
        });

        // Update local state with latest user
        if (res.user) {
          window.State.setUser(res.user);
        }

        if (window.Toast) {
          window.Toast.show('Profile updated successfully! Welcome to JourneyHub.', 'success');
        }

        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 150);
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>Save Profile & Go to Dashboard</span>`;
        }
        if (window.Toast) {
          window.Toast.show(err.message || 'Failed to update profile.', 'error');
        }
      }
    });
  }
};

window.ProfileSetupPage = ProfileSetupPage;
