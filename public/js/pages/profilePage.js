/**
 * Page 4: User Profile Page
 */
const ProfilePage = {
  stats: null,

  async render() {
    const user = window.State.currentUser;
    if (!user) return `<div class="empty-state">Please log in to view profile.</div>`;

    let statsHtml = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="jh-card" style="padding: 1.25rem; text-align: center;">
          <div style="color: var(--primary-teal); font-size: 1.5rem; margin-bottom: 0.35rem;"><i class="fas fa-map-marked-alt"></i></div>
          <div style="font-size: 1.75rem; font-weight: 800;" id="stat-trips">-</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total Trips</div>
        </div>
        <div class="jh-card" style="padding: 1.25rem; text-align: center;">
          <div style="color: var(--accent-orange); font-size: 1.5rem; margin-bottom: 0.35rem;"><i class="fas fa-globe-asia"></i></div>
          <div style="font-size: 1.75rem; font-weight: 800;" id="stat-dest">-</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Destinations</div>
        </div>
        <div class="jh-card" style="padding: 1.25rem; text-align: center;">
          <div style="color: var(--success); font-size: 1.5rem; margin-bottom: 0.35rem;"><i class="fas fa-receipt"></i></div>
          <div style="font-size: 1.75rem; font-weight: 800;" id="stat-spent">-</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Expenses Paid</div>
        </div>
        <div class="jh-card" style="padding: 1.25rem; text-align: center;">
          <div style="color: #6366f1; font-size: 1.5rem; margin-bottom: 0.35rem;"><i class="fas fa-calendar-check"></i></div>
          <div style="font-size: 1.75rem; font-weight: 800;" id="stat-active">-</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Upcoming / Active</div>
        </div>
      </div>
    `;

    return `
      <div class="profile-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">My Travel Profile</h1>
            <p class="page-subtitle">Manage personal information, default emergency contacts, and travel preferences</p>
          </div>
        </div>

        ${statsHtml}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <!-- Profile Edit Form -->
          <div class="jh-card">
            <div class="jh-card-header">
              <h3 class="jh-card-title"><i class="fas fa-user-edit" style="color: var(--primary-teal);"></i> Personal Details</h3>
            </div>
            <div class="jh-card-body">
              <form id="profile-edit-form">
                <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem;">
                  <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}" id="profile-avatar-preview" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid var(--teal-500);" />
                  <div style="flex: 1;">
                    <label class="form-label" for="prof-avatar">Avatar Image URL</label>
                    <input type="url" id="prof-avatar" class="form-control" value="${user.avatar || ''}" placeholder="https://..." />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="prof-name">Full Name</label>
                    <input type="text" id="prof-name" class="form-control" value="${user.name}" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="prof-email">Email Address</label>
                    <input type="email" id="prof-email" class="form-control" value="${user.email}" disabled style="background-color: var(--bg-surface); opacity: 0.75;" />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="prof-phone">Phone Number</label>
                  <input type="tel" id="prof-phone" class="form-control" value="${user.phone || ''}" placeholder="+1 555 123 4567" />
                </div>

                <div class="form-group">
                  <label class="form-label" for="prof-bio">Traveler Bio</label>
                  <textarea id="prof-bio" class="form-control" rows="3" placeholder="Tell your trip members about your travel style...">${user.bio || ''}</textarea>
                </div>

                <h4 style="font-size: 0.95rem; font-weight: 700; margin: 1.5rem 0 0.75rem 0; color: var(--text-main);"><i class="fas fa-first-aid" style="color: var(--danger);"></i> Default Emergency Contact</h4>
                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="prof-emg-name">Contact Name</label>
                    <input type="text" id="prof-emg-name" class="form-control" value="${user.emergencyContact?.name || ''}" placeholder="e.g. Sunita Mehta" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="prof-emg-rel">Relationship</label>
                    <input type="text" id="prof-emg-rel" class="form-control" value="${user.emergencyContact?.relationship || ''}" placeholder="e.g. Mother / Spouse" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="prof-emg-phone">Emergency Phone</label>
                  <input type="tel" id="prof-emg-phone" class="form-control" value="${user.emergencyContact?.phone || ''}" placeholder="+91 98765 11111" />
                </div>

                <button type="submit" class="btn btn-teal btn-block" id="save-profile-btn">
                  <i class="fas fa-save"></i> Save Profile Changes
                </button>
              </form>
            </div>
          </div>

          <!-- Password & Preferences -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Change Password -->
            <div class="jh-card">
              <div class="jh-card-header">
                <h3 class="jh-card-title"><i class="fas fa-lock" style="color: var(--accent-orange);"></i> Security & Password</h3>
              </div>
              <div class="jh-card-body">
                <form id="change-pass-form">
                  <div class="form-group">
                    <label class="form-label" for="curr-pass">Current Password</label>
                    <input type="password" id="curr-pass" class="form-control" placeholder="••••••••" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="new-pass">New Password (min 6 characters)</label>
                    <input type="password" id="new-pass" class="form-control" placeholder="••••••••" required minlength="6" />
                  </div>
                  <button type="submit" class="btn btn-outline btn-block" id="change-pass-btn">
                    <i class="fas fa-key"></i> Update Password
                  </button>
                </form>
              </div>
            </div>

            <!-- Interests Tags -->
            <div class="jh-card">
              <div class="jh-card-header">
                <h3 class="jh-card-title"><i class="fas fa-tags" style="color: var(--primary-teal);"></i> Travel Styles & Interests</h3>
              </div>
              <div class="jh-card-body">
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;" id="profile-interests-container">
                  ${['Mountains', 'Beaches', 'Cultural', 'Adventure', 'Foodie', 'Road Trips', 'Heritage', 'Wildlife', 'Urban'].map(tag => {
                    const isSelected = (user.travelInterests || []).includes(tag);
                    return `
                      <span class="badge ${isSelected ? 'badge-teal' : 'badge-navy'}" style="cursor: pointer; padding: 0.4rem 0.75rem; font-size: 0.825rem;" onclick="ProfilePage.toggleInterest('${tag}', this)">
                        ${isSelected ? '<i class="fas fa-check"></i> ' : ''}${tag}
                      </span>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    // Fetch user stats
    try {
      const res = await window.API.get('/api/users/stats');
      if (res && res.stats) {
        document.getElementById('stat-trips').textContent = res.stats.totalTrips || 0;
        document.getElementById('stat-dest').textContent = res.stats.destinationsVisited || 0;
        document.getElementById('stat-spent').textContent = window.formatCurrency(res.stats.totalExpensesPaid || 0, window.State.currentUser?.preferences?.currency);
        document.getElementById('stat-active').textContent = (res.stats.upcomingTrips || 0) + (res.stats.ongoingTrips || 0);
      }
    } catch (e) {
      console.warn('Could not load user stats:', e);
    }

    // Avatar preview update
    const avatarInput = document.getElementById('prof-avatar');
    const avatarImg = document.getElementById('profile-avatar-preview');
    if (avatarInput && avatarImg) {
      avatarInput.addEventListener('input', () => {
        if (avatarInput.value) avatarImg.src = avatarInput.value;
      });
    }

    // Profile form submit
    const profileForm = document.getElementById('profile-edit-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-profile-btn');
        btn.disabled = true;

        try {
          const name = document.getElementById('prof-name').value.trim();
          const avatar = document.getElementById('prof-avatar').value.trim();
          const phone = document.getElementById('prof-phone').value.trim();
          const bio = document.getElementById('prof-bio').value.trim();
          const emgName = document.getElementById('prof-emg-name').value.trim();
          const emgRel = document.getElementById('prof-emg-rel').value.trim();
          const emgPhone = document.getElementById('prof-emg-phone').value.trim();

          const res = await window.API.put('/api/auth/profile', {
            name,
            avatar,
            phone,
            bio,
            emergencyContact: { name: emgName, relationship: emgRel, phone: emgPhone }
          });

          window.State.setUser(res.user);
          window.Navbar.render();
          window.showToast('Profile updated successfully!', 'success');
        } catch (err) {
          window.showToast(err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    }

    // Password form submit
    const passForm = document.getElementById('change-pass-form');
    if (passForm) {
      passForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('curr-pass').value;
        const newPassword = document.getElementById('new-pass').value;

        try {
          await window.API.put('/api/auth/change-password', { currentPassword, newPassword });
          window.showToast('Password changed successfully!', 'success');
          passForm.reset();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      });
    }
  },

  async toggleInterest(tag, badgeElem) {
    const user = window.State.currentUser;
    if (!user) return;
    let list = user.travelInterests || [];
    if (list.includes(tag)) {
      list = list.filter(t => t !== tag);
    } else {
      list.push(tag);
    }

    try {
      const res = await window.API.put('/api/auth/profile', { travelInterests: list });
      window.State.setUser(res.user);
      window.showToast(`Updated travel interests`, 'info');
      // Re-render tag badge
      const isSelected = list.includes(tag);
      badgeElem.className = `badge ${isSelected ? 'badge-teal' : 'badge-navy'}`;
      badgeElem.innerHTML = `${isSelected ? '<i class="fas fa-check"></i> ' : ''}${tag}`;
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  }
};

window.ProfilePage = ProfilePage;
