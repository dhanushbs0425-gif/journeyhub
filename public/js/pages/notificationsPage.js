/**
 * Page 16: Notifications Center Page
 */
const NotificationsPage = {
  async render() {
    return `
      <div class="notifications-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Notifications & Alerts</h1>
            <p class="page-subtitle">Real-time system updates, trip invitations, budget warnings, and itinerary voting notices</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-outline" onclick="NotificationsPage.markAllRead()"><i class="fas fa-check-double"></i> Mark All as Read</button>
            <button class="btn btn-outline" onclick="NotificationsPage.clearAll()"><i class="fas fa-trash-alt" style="color: var(--danger);"></i> Clear All</button>
          </div>
        </div>

        <div id="notifications-list-container">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount() {
    await NotificationsPage.loadNotifications();
  },

  async loadNotifications() {
    const container = document.getElementById('notifications-list-container');
    if (!container) return;

    try {
      const res = await window.API.get('/api/notifications');
      const notifications = res.notifications || [];
      window.State.setUnreadNotificationsCount(res.unreadCount || 0);
      window.Navbar.render();
      window.Sidebar.render();

      if (notifications.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="far fa-bell-slash"></i></div>
            <h3 class="empty-state-title">No notifications right now</h3>
            <p class="empty-state-text">You are all caught up! Updates regarding your trips and group activities will appear here.</p>
          </div>
        `;
        return;
      }

      const iconTypeMap = {
        'invite': { icon: 'fa-user-plus', color: 'var(--primary-teal)', bg: 'var(--teal-50)' },
        'vote': { icon: 'fa-poll', color: 'var(--accent-orange)', bg: 'var(--orange-50)' },
        'change_request': { icon: 'fa-code-branch', color: '#6366f1', bg: '#eef2ff' },
        'budget_warning': { icon: 'fa-exclamation-triangle', color: 'var(--danger)', bg: 'var(--danger-bg)' },
        'itinerary_conflict': { icon: 'fa-calendar-times', color: 'var(--warning)', bg: 'var(--warning-bg)' },
        'settlement': { icon: 'fa-hand-holding-usd', color: 'var(--success)', bg: 'var(--success-bg)' },
        'join_request': { icon: 'fa-user-clock', color: '#f59e0b', bg: '#fffbeb' },
        'join_approved': { icon: 'fa-check-circle', color: '#10b981', bg: '#ecfdf5' },
        'join_rejected': { icon: 'fa-times-circle', color: '#ef4444', bg: '#fef2f2' },
        'general': { icon: 'fa-bell', color: 'var(--text-muted)', bg: 'var(--bg-surface)' }
      };

      container.innerHTML = `
        <div class="jh-card" style="padding: 0;">
          <div style="display: flex; flex-direction: column;">
            ${notifications.map(n => {
              const meta = iconTypeMap[n.type] || iconTypeMap['general'];
              const isUnread = !n.isRead;

              return `
                <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; ${isUnread ? 'background-color: rgba(13, 148, 136, 0.04);' : ''}">
                  <div style="display: flex; align-items: flex-start; gap: 1rem; flex: 1;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${meta.bg}; color: ${meta.color}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
                      <i class="fas ${meta.icon}"></i>
                    </div>

                    <div>
                      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">${n.title}</h4>
                        ${isUnread ? `<span class="badge badge-teal" style="font-size: 0.65rem; padding: 0.1rem 0.4rem;">NEW</span>` : ''}
                      </div>
                      <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.4rem;">${n.message}</p>
                      <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.75rem;">
                        <span><i class="far fa-clock"></i> ${new Date(n.createdAt).toLocaleString()}</span>
                        ${n.trip ? `<span><i class="fas fa-map-marker-alt"></i> ${n.trip.title}</span>` : ''}
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${n.link ? `
                      <a href="${n.link}" class="btn btn-outline btn-sm" onclick="NotificationsPage.markRead('${n._id}')">
                        View
                      </a>
                    ` : ''}
                    ${isUnread ? `
                      <button class="btn btn-outline btn-sm" onclick="NotificationsPage.markRead('${n._id}')" title="Mark as read">
                        <i class="fas fa-check"></i>
                      </button>
                    ` : ''}
                    <button class="btn btn-outline btn-sm" onclick="NotificationsPage.deleteNotif('${n._id}')" title="Delete">
                      <i class="fas fa-trash-alt" style="color: var(--danger); font-size: 0.75rem;"></i>
                    </button>
                  </div>
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

  async markRead(id) {
    try {
      await window.API.put(`/api/notifications/${id}/read`, {});
      await NotificationsPage.loadNotifications();
    } catch (err) {
      console.error(err);
    }
  },

  async markAllRead() {
    try {
      await window.API.put('/api/notifications/read-all', {});
      window.showToast('All notifications marked as read.', 'info');
      await NotificationsPage.loadNotifications();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  clearAll() {
    window.Modal.confirm({
      title: 'Clear Notifications Inbox?',
      message: 'Are you sure you want to delete all notifications?',
      confirmText: 'Clear All',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await window.API.delete('/api/notifications/clear-all');
          window.showToast('Notifications inbox cleared.', 'info');
          await NotificationsPage.loadNotifications();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  }
};

window.NotificationsPage = NotificationsPage;
