/**
 * Page 12: Expense Settlement & Debt Simplification
 */
const ExpenseSettlementPage = {
  tripId: null,
  settlementData: null,

  async render(params) {
    ExpenseSettlementPage.tripId = params.tripId;

    return `
      <div class="settlement-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Expense Settlement & Debt Simplifier</h1>
            <p class="page-subtitle">Algorithmic debt minimization: solves cross-debts in the fewest transactions possible</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-teal" onclick="ExpenseSettlementPage.openSettleUpModal()"><i class="fas fa-handshake"></i> Record Settlement</button>
            <a href="#/trips/${ExpenseSettlementPage.tripId}/expenses" class="btn btn-outline"><i class="fas fa-arrow-left"></i> Expense Tracker</a>
          </div>
        </div>

        <!-- Settlement Engine Container -->
        <div id="settlement-content-container">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    ExpenseSettlementPage.tripId = params.tripId;
    await ExpenseSettlementPage.loadSettlements();
  },

  async loadSettlements() {
    try {
      const res = await window.API.get(`/api/trips/${ExpenseSettlementPage.tripId}/settlements`);
      ExpenseSettlementPage.settlementData = res;
      ExpenseSettlementPage.renderSettlementView();
    } catch (err) {
      document.getElementById('settlement-content-container').innerHTML = `
        <div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>
      `;
    }
  },

  renderSettlementView() {
    const container = document.getElementById('settlement-content-container');
    if (!container) return;

    const calc = ExpenseSettlementPage.settlementData?.calculation || {};
    const balances = calc.balanceBreakdown || [];
    const debts = calc.simplifiedDebts || [];
    const history = ExpenseSettlementPage.settlementData?.settlementHistory || [];
    const trip = window.State.currentTrip;
    const curr = window.getCurrencySymbol(trip?.currency);

    container.innerHTML = `
      <!-- Minimized Transactions Highlight -->
      <div class="jh-card" style="margin-bottom: 2rem; border: 2px solid var(--primary-teal);">
        <div class="jh-card-header">
          <div>
            <span class="badge badge-teal" style="font-size: 0.75rem; margin-bottom: 0.25rem;"><i class="fas fa-bolt"></i> Optimal Net Transactions</span>
            <h3 class="jh-card-title">Who Owes Whom (Minimized Settlement Matrix)</h3>
          </div>
          <button class="btn btn-teal btn-sm" onclick="ExpenseSettlementPage.openSettleUpModal()"><i class="fas fa-check"></i> Settle Up</button>
        </div>

        <div class="jh-card-body">
          ${debts.length === 0 ? `
            <div class="empty-state" style="border: 0; padding: 2rem 1rem;">
              <div class="empty-state-icon" style="color: var(--success);"><i class="fas fa-check-circle"></i></div>
              <h3 class="empty-state-title">Everyone is Settled Up!</h3>
              <p class="empty-state-text">No outstanding balances or debts remaining among your travel companions.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${debts.map(d => `
                <div class="debt-transfer-card">
                  <div class="debt-transfer-flow">
                    <!-- Debtor -->
                    <div class="debt-avatar-pair">
                      <img src="${d.debtor?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--danger);" />
                      <div>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${d.debtor?.name}</div>
                        <div style="font-size: 0.75rem; color: var(--danger); font-weight: 600;">Owes money</div>
                      </div>
                    </div>

                    <div style="text-align: center; padding: 0 0.5rem;">
                      <div class="debt-arrow"><i class="fas fa-arrow-right"></i></div>
                      <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">pays</div>
                    </div>

                    <!-- Creditor -->
                    <div class="debt-avatar-pair">
                      <img src="${d.creditor?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--success);" />
                      <div>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${d.creditor?.name}</div>
                        <div style="font-size: 0.75rem; color: var(--success); font-weight: 600;">Gets back</div>
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="font-size: 1.35rem; font-weight: 800; color: var(--accent-orange);">
                      ${curr}${d.amount.toFixed(2)}
                    </div>
                    <button class="btn btn-teal btn-sm" onclick="ExpenseSettlementPage.quickSettle('${d.creditor?._id}', '${d.creditor?.name}', ${d.amount})">
                      Settle Now
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- Individual Net Balances Breakdown -->
      <div class="jh-card" style="margin-bottom: 2rem;">
        <div class="jh-card-header">
          <h3 class="jh-card-title"><i class="fas fa-balance-scale" style="color: var(--primary-teal);"></i> Member Balance Breakdown</h3>
        </div>
        <div class="jh-card-body" style="padding: 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="background-color: var(--bg-surface); text-align: left; border-bottom: 1px solid var(--border-color);">
                <th style="padding: 0.75rem 1.25rem;">Member</th>
                <th style="padding: 0.75rem 1.25rem;">Total Paid</th>
                <th style="padding: 0.75rem 1.25rem;">Fair Share</th>
                <th style="padding: 0.75rem 1.25rem;">Net Balance</th>
                <th style="padding: 0.75rem 1.25rem;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${balances.map(b => {
                const isCreditor = b.netBalance > 0.01;
                const isDebtor = b.netBalance < -0.01;

                return `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1.25rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${b.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" />
                        <span style="font-weight: 600;">${b.user?.name || 'Traveler'}</span>
                      </div>
                    </td>
                    <td style="padding: 0.75rem 1.25rem; font-weight: 600;">${curr}${b.paid.toFixed(2)}</td>
                    <td style="padding: 0.75rem 1.25rem; color: var(--text-secondary);">${curr}${b.share.toFixed(2)}</td>
                    <td style="padding: 0.75rem 1.25rem; font-weight: 800; color: ${isCreditor ? 'var(--success)' : isDebtor ? 'var(--danger)' : 'var(--text-muted)'};">
                      ${isCreditor ? `+${curr}${b.netBalance.toFixed(2)}` : isDebtor ? `-${curr}${Math.abs(b.netBalance).toFixed(2)}` : `${curr}0.00`}
                    </td>
                    <td style="padding: 0.75rem 1.25rem;">
                      <span class="badge ${isCreditor ? 'badge-success' : isDebtor ? 'badge-danger' : 'badge-navy'}">
                        ${isCreditor ? 'Gets Back' : isDebtor ? 'Owes' : 'Settled'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Past Settlement History -->
      <div class="jh-card">
        <div class="jh-card-header">
          <h3 class="jh-card-title"><i class="fas fa-history"></i> Recorded Payment History (${history.length})</h3>
        </div>
        <div class="jh-card-body" style="padding: 0;">
          ${history.length === 0 ? `
            <div class="empty-state" style="border: 0; padding: 2rem 1rem;">
              <p style="color: var(--text-muted); font-size: 0.85rem;">No settlement payments recorded yet.</p>
            </div>
          ` : `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
              <thead>
                <tr style="background-color: var(--bg-surface); text-align: left; border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 0.75rem 1.25rem;">Date</th>
                  <th style="padding: 0.75rem 1.25rem;">Payer</th>
                  <th style="padding: 0.75rem 1.25rem;">Payee</th>
                  <th style="padding: 0.75rem 1.25rem;">Amount</th>
                  <th style="padding: 0.75rem 1.25rem;">Method & Notes</th>
                </tr>
              </thead>
              <tbody>
                ${history.map(s => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1.25rem; font-size: 0.8rem; color: var(--text-muted);">${new Date(s.settledAt).toLocaleDateString()}</td>
                    <td style="padding: 0.75rem 1.25rem; font-weight: 600;">${s.payer?.name}</td>
                    <td style="padding: 0.75rem 1.25rem; font-weight: 600; color: var(--primary-teal);">${s.payee?.name}</td>
                    <td style="padding: 0.75rem 1.25rem; font-weight: 800; color: var(--success);">${curr}${s.amount.toFixed(2)}</td>
                    <td style="padding: 0.75rem 1.25rem; font-size: 0.8rem; color: var(--text-secondary);">
                      <span class="badge badge-navy">${s.paymentMethod || 'Transfer'}</span> ${s.notes || ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  },

  openSettleUpModal(defaultPayeeId = '', defaultAmount = '') {
    const trip = window.State.currentTrip;
    const members = (trip?.members || []).filter(m => m.user?._id !== window.State.currentUser?._id);

    window.Modal.open({
      title: 'Record Payment Settlement',
      body: `
        <form id="settle-form">
          <div class="form-group">
            <label class="form-label">Payee (Person you paid) <span style="color: var(--danger);">*</span></label>
            <select id="settle-payee" class="form-control" required>
              <option value="">-- Choose Member --</option>
              ${members.map(m => `
                <option value="${m.user?._id}" ${m.user?._id === defaultPayeeId ? 'selected' : ''}>${m.user?.name} (${m.user?.email})</option>
              `).join('')}
            </select>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Amount (${window.getCurrencySymbol(trip?.currency)}) <span style="color: var(--danger);">*</span></label>
              <input type="number" id="settle-amount" class="form-control" value="${defaultAmount || ''}" placeholder="50.00" step="0.01" min="0.01" required />
            </div>
            <div class="form-group">
              <label class="form-label">Payment Method</label>
              <select id="settle-method" class="form-control">
                <option value="UPI / Bank Transfer">UPI / Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="PayPal">PayPal</option>
                <option value="Venmo">Venmo</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes (optional)</label>
            <input type="text" id="settle-notes" class="form-control" placeholder="e.g. Settle up for dinner and tickets" />
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="ExpenseSettlementPage.submitSettleUp()">Confirm Settlement</button>
      `
    });
  },

  quickSettle(payeeId, payeeName, amount) {
    ExpenseSettlementPage.openSettleUpModal(payeeId, amount);
  },

  async submitSettleUp() {
    const payeeId = document.getElementById('settle-payee')?.value;
    const amount = document.getElementById('settle-amount')?.value;
    const paymentMethod = document.getElementById('settle-method')?.value;
    const notes = document.getElementById('settle-notes')?.value.trim();

    if (!payeeId || !amount || Number(amount) <= 0) {
      window.showToast('Please select a recipient and enter a valid settlement amount.', 'warning');
      return;
    }

    try {
      const res = await window.API.post(`/api/trips/${ExpenseSettlementPage.tripId}/settlements`, {
        payeeId,
        amount: Number(amount),
        paymentMethod,
        notes
      });

      window.Modal.close();
      window.showToast(res.message, 'success');
      await ExpenseSettlementPage.loadSettlements();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  }
};

window.ExpenseSettlementPage = ExpenseSettlementPage;
