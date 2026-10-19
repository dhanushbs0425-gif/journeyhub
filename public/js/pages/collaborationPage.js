/**
 * Page 10: Group Collaboration Page & Group Availability Matcher
 */
const CollaborationPage = {
  tripId: null,
  activeSubTab: 'members', // 'members' | 'availability' | 'votes' | 'requests'

  async render(params) {
    CollaborationPage.tripId = params.tripId;

    return `
      <div class="collaboration-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Group Collaboration</h1>
            <p class="page-subtitle">Coordinate member roles, group availability consensus, polling decisions, and change reviews</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-teal" onclick="CollaborationPage.openInviteModal()"><i class="fas fa-user-plus"></i> Invite Member</button>
            <button class="btn btn-orange" onclick="CollaborationPage.openCreatePollModal()"><i class="fas fa-poll"></i> Create Poll</button>
          </div>
        </div>

        <!-- Sub Tabs -->
        <div class="tabs-header">
          <button class="tab-btn active" data-tab="members" onclick="CollaborationPage.switchTab('members', this)"><i class="fas fa-users"></i> Companions & Roles</button>
          <button class="tab-btn" data-tab="availability" onclick="CollaborationPage.switchTab('availability', this)"><i class="fas fa-calendar-check" style="color: var(--teal-400);"></i> Availability Matcher</button>
          <button class="tab-btn" data-tab="votes" onclick="CollaborationPage.switchTab('votes', this)"><i class="fas fa-vote-yea" style="color: var(--accent-orange);"></i> Group Voting Polls</button>
          <button class="tab-btn" data-tab="requests" onclick="CollaborationPage.switchTab('requests', this)"><i class="fas fa-code-branch"></i> Change Requests</button>
        </div>

        <div id="collab-tab-content">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    CollaborationPage.tripId = params.tripId;
    await CollaborationPage.renderActiveTab();
  },

  switchTab(tab, btn) {
    CollaborationPage.activeSubTab = tab;
    document.querySelectorAll('.collaboration-page .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    CollaborationPage.renderActiveTab();
  },

  async renderActiveTab() {
    const container = document.getElementById('collab-tab-content');
    if (!container) return;

    if (CollaborationPage.activeSubTab === 'members') {
      await CollaborationPage.renderMembersTab(container);
    } else if (CollaborationPage.activeSubTab === 'availability') {
      await CollaborationPage.renderAvailabilityTab(container);
    } else if (CollaborationPage.activeSubTab === 'votes') {
      await CollaborationPage.renderVotesTab(container);
    } else if (CollaborationPage.activeSubTab === 'requests') {
      await CollaborationPage.renderRequestsTab(container);
    }
  },

  /* TAB 1: Members & Roles */
  async renderMembersTab(container) {
    try {
      const res = await window.API.get(`/api/trips/${CollaborationPage.tripId}/members`);
      const members = res.members || [];
      const currentUserId = window.State.currentUser?._id;
      const currentTrip = window.State.currentTrip;
      const isOwner = currentTrip?.userRole === 'owner';

      container.innerHTML = `
        <div class="jh-card">
          <div class="jh-card-header">
            <h3 class="jh-card-title"><i class="fas fa-users" style="color: var(--primary-teal);"></i> Trip Members (${members.length})</h3>
            <button class="btn btn-teal btn-sm" onclick="CollaborationPage.openInviteModal()"><i class="fas fa-user-plus"></i> Add Companion</button>
          </div>
          <div class="jh-card-body" style="padding: 0;">
            <div style="display: flex; flex-direction: column;">
              ${members.map(m => {
                const isSelf = m.user?._id === currentUserId;
                const isTripOwner = m.role === 'owner';

                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                      <img src="${m.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" />
                      <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <h4 style="font-size: 1rem; font-weight: 700;">${m.user?.name || 'Traveler'}</h4>
                          ${isSelf ? `<span class="badge badge-teal" style="font-size: 0.7rem;">You</span>` : ''}
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);">${m.user?.email || ''} • ${m.user?.phone || 'No phone'}</p>
                        ${m.user?.bio ? `<p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">"${m.user.bio}"</p>` : ''}
                      </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <span class="badge ${m.role === 'owner' ? 'badge-orange' : m.role === 'editor' ? 'badge-teal' : 'badge-navy'}">
                        <i class="fas ${m.role === 'owner' ? 'fa-crown' : m.role === 'editor' ? 'fa-pencil-alt' : 'fa-eye'}"></i>
                        ${m.role.toUpperCase()}
                      </span>

                      ${isOwner && !isSelf && !isTripOwner ? `
                        <button class="btn btn-outline btn-sm" onclick="CollaborationPage.openChangeRoleModal('${m._id}', '${m.user?.name}', '${m.role}')" title="Change Role">
                          <i class="fas fa-user-cog"></i> Role
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="CollaborationPage.removeMember('${m._id}', '${m.user?.name}')" title="Remove Member">
                          <i class="fas fa-user-minus" style="color: var(--danger);"></i>
                        </button>
                      ` : ''}

                      ${!isTripOwner && isSelf ? `
                        <button class="btn btn-outline btn-sm" onclick="CollaborationPage.removeMember('${m._id}', 'yourself')">
                          <i class="fas fa-sign-out-alt" style="color: var(--danger);"></i> Leave Trip
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>`;
    }
  },

  /* TAB 2: Group Availability Matcher (Distinctive Feature 3) */
  async renderAvailabilityTab(container) {
    try {
      const res = await window.API.get(`/api/trips/${CollaborationPage.tripId}/availability`);
      const analysis = res.analysis || {};
      const best = analysis.bestWindow;
      const ranked = analysis.rankedWindows || [];
      const heatMap = analysis.dailyHeatMap || [];
      const currentTrip = window.State.currentTrip;
      const isEditor = currentTrip?.userRole === 'owner' || currentTrip?.userRole === 'editor';

      container.innerHTML = `
        <!-- Distinctive Feature Header Banner -->
        <div class="readiness-card" style="margin-bottom: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--teal-400); font-weight: 700; letter-spacing: 0.05em;">
                <i class="fas fa-calendar-alt"></i> Distinctive Feature
              </div>
              <h2 style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-display);">Group Availability Matcher</h2>
              <p style="font-size: 0.85rem; color: #cbd5e1;">Consensus algorithm calculating candidate travel dates with the greatest overlapping member availability</p>
            </div>
            <button class="btn btn-teal btn-sm" onclick="CollaborationPage.openSetMyAvailabilityModal()">
              <i class="fas fa-calendar-plus"></i> Submit / Edit My Free Dates
            </button>
          </div>
        </div>

        ${best ? `
          <!-- Winning Match Card -->
          <div class="jh-card" style="border: 2px solid var(--primary-teal); margin-bottom: 2rem; background: linear-gradient(135deg, rgba(13, 148, 136, 0.04), rgba(2, 132, 199, 0.04));">
            <div class="jh-card-body" style="padding: 1.75rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <span class="badge badge-teal" style="font-size: 0.8rem; margin-bottom: 0.5rem;"><i class="fas fa-trophy"></i> Best Optimal Travel Window</span>
                  <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800;">
                    ${new Date(best.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} — ${new Date(best.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    Duration: <strong>${best.durationDays} Days</strong> • Available: <strong>${best.availableCount} of ${best.totalMembers} Members</strong> (${best.matchPercentage}% attendance consensus)
                  </p>
                </div>

                ${isEditor ? `
                  <button class="btn btn-teal" onclick="CollaborationPage.applyMatchedDates('${best.startDate}', '${best.endDate}')">
                    <i class="fas fa-calendar-check"></i> Apply This Window to Live Trip
                  </button>
                ` : ''}
              </div>

              <!-- Available & Unavailable Breakdown -->
              <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <div style="flex: 1; min-width: 200px;">
                  <div style="font-size: 0.8rem; font-weight: 700; color: var(--success); margin-bottom: 0.4rem;"><i class="fas fa-check-circle"></i> Fully Available (${best.availableMembers.length})</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                    ${best.availableMembers.map(u => `<span class="badge badge-success">${u.name}</span>`).join('')}
                  </div>
                </div>
                ${best.unavailableMembers.length > 0 ? `
                  <div style="flex: 1; min-width: 200px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--danger); margin-bottom: 0.4rem;"><i class="fas fa-times-circle"></i> Partially / Unavailable (${best.unavailableMembers.length})</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                      ${best.unavailableMembers.map(u => `<span class="badge badge-danger">${u.name}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        ` : `
          <div class="empty-state" style="margin-bottom: 2rem;">
            <div class="empty-state-icon"><i class="far fa-calendar"></i></div>
            <h3 class="empty-state-title">No availability submitted yet</h3>
            <p class="empty-state-text">Ask members to submit their free travel intervals so our matcher algorithm can identify the best dates.</p>
            <button class="btn btn-teal" onclick="CollaborationPage.openSetMyAvailabilityModal()"><i class="fas fa-calendar-plus"></i> Submit My Dates</button>
          </div>
        `}

        <!-- Ranked Windows Table -->
        ${ranked.length > 0 ? `
          <div class="jh-card">
            <div class="jh-card-header">
              <h3 class="jh-card-title"><i class="fas fa-sort-amount-down"></i> Ranked Candidate Travel Windows</h3>
            </div>
            <div class="jh-card-body" style="padding: 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                  <tr style="background-color: var(--bg-surface); text-align: left; border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 0.75rem 1rem;">Rank</th>
                    <th style="padding: 0.75rem 1rem;">Candidate Window</th>
                    <th style="padding: 0.75rem 1rem;">Consensus Match</th>
                    <th style="padding: 0.75rem 1rem;">Available Count</th>
                    <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${ranked.map((w, idx) => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                      <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--text-muted);">#${idx + 1}</td>
                      <td style="padding: 0.75rem 1rem; font-weight: 600;">
                        ${new Date(w.startDate).toLocaleDateString()} - ${new Date(w.endDate).toLocaleDateString()}
                      </td>
                      <td style="padding: 0.75rem 1rem;">
                        <span class="badge ${w.matchPercentage >= 80 ? 'badge-teal' : w.matchPercentage >= 50 ? 'badge-warning' : 'badge-navy'}">
                          ${w.matchPercentage}% Match
                        </span>
                      </td>
                      <td style="padding: 0.75rem 1rem; color: var(--text-secondary);">${w.availableCount} of ${w.totalMembers} members</td>
                      <td style="padding: 0.75rem 1rem; text-align: right;">
                        ${isEditor ? `
                          <button class="btn btn-outline btn-sm" onclick="CollaborationPage.applyMatchedDates('${w.startDate}', '${w.endDate}')">Select</button>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>`;
    }
  },

  /* TAB 3: Group Voting Polls */
  async renderVotesTab(container) {
    try {
      const res = await window.API.get(`/api/trips/${CollaborationPage.tripId}/votes`);
      const polls = res.polls || [];

      if (polls.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-poll"></i></div>
            <h3 class="empty-state-title">No polls active</h3>
            <p class="empty-state-text">Propose destinations, excursions, or dinner spots for your travel group to vote on.</p>
            <button class="btn btn-teal" onclick="CollaborationPage.openCreatePollModal()"><i class="fas fa-plus"></i> Create Poll</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${polls.map(poll => {
            const isClosed = poll.status === 'closed';

            return `
              <div class="jh-card">
                <div class="jh-card-header">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                      <span class="badge badge-teal">${poll.type}</span>
                      <span class="badge ${isClosed ? 'badge-navy' : 'badge-success'}">${poll.status}</span>
                    </div>
                    <h3 class="jh-card-title">${poll.title}</h3>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">
                    ${poll.totalVotesCast} Vote${poll.totalVotesCast === 1 ? '' : 's'} Cast
                  </div>
                </div>

                <div class="jh-card-body">
                  ${poll.description ? `<p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;">${poll.description}</p>` : ''}

                  <!-- Poll Options -->
                  <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${poll.options.map(opt => {
                      const isUserChoice = poll.userVotedOptionId === opt._id;

                      return `
                        <div style="background-color: var(--bg-surface); border: 1px solid ${isUserChoice ? 'var(--primary-teal)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 0.85rem 1rem; cursor: pointer; transition: var(--transition);" onclick="CollaborationPage.castVote('${poll._id}', '${opt._id}')">
                          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.9rem;">
                              <i class="far ${isUserChoice ? 'fa-check-circle' : 'fa-circle'}" style="color: ${isUserChoice ? 'var(--primary-teal)' : 'var(--text-muted)'};"></i>
                              <span>${opt.text}</span>
                            </div>
                            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">${opt.count} votes (${opt.percentage}%)</span>
                          </div>
                          <div class="progress-bar-container" style="height: 6px;">
                            <div class="progress-bar-fill progress-teal" style="width: ${opt.percentage}%;"></div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>`;
    }
  },

  /* TAB 4: Change Requests */
  async renderRequestsTab(container) {
    try {
      const res = await window.API.get(`/api/trips/${CollaborationPage.tripId}/change-requests`);
      const requests = res.changeRequests || [];
      const currentTrip = window.State.currentTrip;
      const isEditor = currentTrip?.userRole === 'owner' || currentTrip?.userRole === 'editor';

      container.innerHTML = `
        <div class="jh-card">
          <div class="jh-card-header">
            <div>
              <h3 class="jh-card-title"><i class="fas fa-history" style="color: var(--primary-teal);"></i> Itinerary Change Requests Audit Log</h3>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">Proposed schedule and budget adjustments reviewed by group coordinators</p>
            </div>
            <button class="btn btn-teal btn-sm" onclick="CollaborationPage.openSubmitChangeRequestModal()"><i class="fas fa-plus"></i> Submit Request</button>
          </div>
          <div class="jh-card-body" style="padding: 0;">
            ${requests.length === 0 ? `
              <div class="empty-state" style="padding: 2.5rem 1rem;">
                <div class="empty-state-icon"><i class="fas fa-check-circle"></i></div>
                <h3 class="empty-state-title">No pending change requests</h3>
                <p class="empty-state-text">All itinerary modifications are in sync with group consensus.</p>
              </div>
            ` : requests.map(req => {
              const statusClass = req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning';

              return `
                <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                  <div style="flex: 1; min-width: 260px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                      <span class="badge ${statusClass}">${req.status}</span>
                      <span class="badge badge-navy">${req.changeType.replace('_', ' ')}</span>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem;">${req.title}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.5rem;">${req.description}</p>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                      Proposed by <strong>${req.proposedBy?.name || 'Member'}</strong>
                      ${req.reviewedBy ? ` • Reviewed by <strong>${req.reviewedBy?.name}</strong>` : ''}
                      ${req.reviewNote ? ` • <em>"${req.reviewNote}"</em>` : ''}
                    </div>
                  </div>

                  ${req.status === 'pending' && isEditor ? `
                    <div style="display: flex; gap: 0.5rem;">
                      <button class="btn btn-teal btn-sm" onclick="CollaborationPage.reviewChangeRequest('${req._id}', 'approved')"><i class="fas fa-check"></i> Approve & Apply</button>
                      <button class="btn btn-outline btn-sm" onclick="CollaborationPage.reviewChangeRequest('${req._id}', 'rejected')"><i class="fas fa-times"></i> Reject</button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>`;
    }
  },

  /* Actions & Modals */
  openInviteModal() {
    window.Modal.open({
      title: 'Invite Travel Companion',
      body: `
        <form id="invite-member-form">
          <div class="form-group">
            <label class="form-label">Email or Search Name</label>
            <input type="text" id="invite-email" class="form-control" placeholder="priya@journeyhub.dev" required />
            <div class="form-hint">Registered JourneyHub users can be invited by name or email.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Role Permissions</label>
            <select id="invite-role" class="form-control">
              <option value="editor">Editor (Can add/edit activities, expenses & packing)</option>
              <option value="viewer">Viewer (View-only trip access)</option>
              <option value="owner">Co-Owner (Full administrative rights)</option>
            </select>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="CollaborationPage.submitInvite()">Send Invitation</button>
      `
    });
  },

  async submitInvite() {
    const email = document.getElementById('invite-email')?.value.trim();
    const role = document.getElementById('invite-role')?.value || 'editor';

    if (!email) {
      window.showToast('Please enter an email or name to invite.', 'warning');
      return;
    }

    try {
      const res = await window.API.post(`/api/trips/${CollaborationPage.tripId}/members`, { email, role });
      window.Modal.close();
      window.showToast(res.message, 'success');
      await CollaborationPage.renderActiveTab();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  openChangeRoleModal(memberId, memberName, currentRole) {
    window.Modal.open({
      title: `Update Role: ${memberName}`,
      body: `
        <div class="form-group">
          <label class="form-label">Select New Role</label>
          <select id="new-member-role" class="form-control">
            <option value="editor" ${currentRole === 'editor' ? 'selected' : ''}>Editor (Add/Edit activities & expenses)</option>
            <option value="viewer" ${currentRole === 'viewer' ? 'selected' : ''}>Viewer (Read-only)</option>
            <option value="owner" ${currentRole === 'owner' ? 'selected' : ''}>Owner (Full administrative access)</option>
          </select>
        </div>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="CollaborationPage.submitChangeRole('${memberId}')">Update Role</button>
      `
    });
  },

  async submitChangeRole(memberId) {
    const role = document.getElementById('new-member-role')?.value;
    try {
      const res = await window.API.put(`/api/trips/${CollaborationPage.tripId}/members/${memberId}/role`, { role });
      window.Modal.close();
      window.showToast(res.message, 'success');
      await CollaborationPage.renderActiveTab();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  removeMember(memberId, name) {
    window.Modal.confirm({
      title: `Remove ${name}?`,
      message: `Are you sure you want to remove ${name} from this trip?`,
      confirmText: 'Remove Member',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          const res = await window.API.delete(`/api/trips/${CollaborationPage.tripId}/members/${memberId}`);
          window.showToast(res.message, 'info');
          if (name === 'yourself') {
            await window.State.loadTrips();
            window.location.hash = '#/dashboard';
          } else {
            await CollaborationPage.renderActiveTab();
          }
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  },

  openSetMyAvailabilityModal() {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 20);
    const endStr = nextMonth.toISOString().split('T')[0];

    window.Modal.open({
      title: 'Submit My Free Travel Dates',
      body: `
        <form id="my-avail-form">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Provide the date window when your schedule is free. Our consensus algorithm cross-matches dates across all members to find the optimal trip window!
          </p>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Available From</label>
              <input type="date" id="avail-start" class="form-control" value="${today}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Available Until</label>
              <input type="date" id="avail-end" class="form-control" value="${endStr}" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Availability Note</label>
            <input type="text" id="avail-note" class="form-control" placeholder="e.g. Free anytime during the first 2 weeks" value="Completely free for travel" />
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="CollaborationPage.submitMyAvailability()">Save My Dates</button>
      `
    });
  },

  async submitMyAvailability() {
    const startDate = document.getElementById('avail-start')?.value;
    const endDate = document.getElementById('avail-end')?.value;
    const note = document.getElementById('avail-note')?.value.trim();

    if (!startDate || !endDate) {
      window.showToast('Please select both start and end dates.', 'warning');
      return;
    }

    try {
      const res = await window.API.post(`/api/trips/${CollaborationPage.tripId}/availability`, {
        intervals: [{ startDate, endDate, note }]
      });
      window.Modal.close();
      window.showToast(res.message, 'success');
      await CollaborationPage.renderActiveTab();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async applyMatchedDates(startDate, endDate) {
    try {
      const res = await window.API.post(`/api/trips/${CollaborationPage.tripId}/availability/apply`, { startDate, endDate });
      window.showToast(res.message, 'success');
      await window.State.loadTrips();
      await CollaborationPage.renderActiveTab();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  openCreatePollModal() {
    window.Modal.open({
      title: 'Create Group Voting Poll',
      body: `
        <form id="create-poll-form">
          <div class="form-group">
            <label class="form-label">Poll Question / Title <span style="color: var(--danger);">*</span></label>
            <input type="text" id="poll-title" class="form-control" placeholder="e.g. Which island should we visit on Day 3?" required />
          </div>
          <div class="form-group">
            <label class="form-label">Poll Category</label>
            <select id="poll-type" class="form-control">
              <option value="activity">Activity / Excursion</option>
              <option value="destination">Destination / Location</option>
              <option value="budget">Budget / Accommodation</option>
              <option value="general">General Group Decision</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Options (one per line, min 2) <span style="color: var(--danger);">*</span></label>
            <textarea id="poll-options" class="form-control" rows="4" placeholder="Option 1: Nara Deer Park&#10;Option 2: Mount Hiei Cable Car&#10;Option 3: Gion Walking Tour" required></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="CollaborationPage.submitCreatePoll()">Launch Poll</button>
      `
    });
  },

  async submitCreatePoll() {
    const title = document.getElementById('poll-title')?.value.trim();
    const type = document.getElementById('poll-type')?.value || 'general';
    const rawOptions = document.getElementById('poll-options')?.value || '';

    const options = rawOptions.split('\n').map(o => o.trim()).filter(Boolean);

    if (!title || options.length < 2) {
      window.showToast('Please provide a title and at least two options.', 'warning');
      return;
    }

    try {
      await window.API.post(`/api/trips/${CollaborationPage.tripId}/votes`, { title, type, options });
      window.Modal.close();
      window.showToast('Poll created successfully!', 'success');
      CollaborationPage.activeSubTab = 'votes';
      document.querySelectorAll('.collaboration-page .tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'votes');
      });
      await CollaborationPage.renderActiveTab();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async castVote(voteId, optionId) {
    try {
      const res = await window.API.post(`/api/trips/${CollaborationPage.tripId}/votes/${voteId}/cast`, { optionId });
      window.showToast(res.message, 'success');
      await CollaborationPage.renderActiveTab();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  openSubmitChangeRequestModal() {
    window.Modal.open({
      title: 'Submit Itinerary Change Request',
      body: `
        <form id="change-req-form">
          <div class="form-group">
            <label class="form-label">Request Title <span style="color: var(--danger);">*</span></label>
            <input type="text" id="cr-title" class="form-control" placeholder="e.g. Add Sunrise Yoga at Coral Beach" required />
          </div>
          <div class="form-group">
            <label class="form-label">Change Type</label>
            <select id="cr-type" class="form-control">
              <option value="add_activity">Add New Activity</option>
              <option value="budget_update">Budget Adjustment</option>
              <option value="change_dates">Trip Dates Modification</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Explanation / Justification <span style="color: var(--danger);">*</span></label>
            <textarea id="cr-desc" class="form-control" rows="3" placeholder="Explain why the group should adopt this change..." required></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="CollaborationPage.submitChangeRequest()">Submit for Group Review</button>
      `
    });
  },

  async submitChangeRequest() {
    const title = document.getElementById('cr-title')?.value.trim();
    const changeType = document.getElementById('cr-type')?.value;
    const description = document.getElementById('cr-desc')?.value.trim();

    if (!title || !description) {
      window.showToast('Please provide both title and description.', 'warning');
      return;
    }

    try {
      const proposedValue = {
        title,
        dayNumber: 2,
        startTime: '08:00',
        endTime: '09:30',
        category: 'Leisure'
      };

      const res = await window.API.post(`/api/trips/${CollaborationPage.tripId}/change-requests`, {
        title,
        changeType,
        description,
        proposedValue
      });

      window.Modal.close();
      window.showToast(res.message, 'success');
      CollaborationPage.activeSubTab = 'requests';
      document.querySelectorAll('.collaboration-page .tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'requests');
      });
      await CollaborationPage.renderActiveTab();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  async reviewChangeRequest(requestId, status) {
    try {
      const res = await window.API.put(`/api/trips/${CollaborationPage.tripId}/change-requests/${requestId}/review`, { status });
      window.showToast(res.message, 'success');
      await CollaborationPage.renderActiveTab();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  }
};

window.CollaborationPage = CollaborationPage;
