/**
 * Accessible Modal Manager Component
 */
const Modal = {
  getContainer() {
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  open({ title, body, footer, isLarge = false, onClose = null }) {
    const container = this.getContainer();

    container.innerHTML = `
      <div class="modal-backdrop" id="active-modal-backdrop">
        <div class="modal-dialog ${isLarge ? 'modal-lg' : ''}">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close-btn" id="modal-close-btn" aria-label="Close modal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            ${body}
          </div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
      </div>
    `;

    const backdrop = document.getElementById('active-modal-backdrop');
    setTimeout(() => backdrop.classList.add('active'), 10);

    const closeHandler = () => {
      this.close();
      if (onClose) onClose();
    };

    document.getElementById('modal-close-btn').addEventListener('click', closeHandler);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeHandler();
      }
    });

    // Close on Escape key
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeHandler();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);
  },

  close() {
    const backdrop = document.getElementById('active-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      setTimeout(() => {
        backdrop.remove();
      }, 200);
    }
  },

  confirm({ title = 'Confirm Action', message = 'Are you sure you want to proceed?', confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
    this.open({
      title,
      body: `<p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6;">${message}</p>`,
      footer: `
        <button class="btn btn-outline" id="confirm-cancel-btn">Cancel</button>
        <button class="btn ${confirmClass}" id="confirm-ok-btn">${confirmText}</button>
      `
    });

    document.getElementById('confirm-cancel-btn').addEventListener('click', () => this.close());
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
      this.close();
      if (onConfirm) onConfirm();
    });
  }
};

window.Modal = Modal;
