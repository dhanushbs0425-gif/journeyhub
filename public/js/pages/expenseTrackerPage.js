/**
 * Page 11: Expense Tracker & Budget Management
 */
const ExpenseTrackerPage = {
  tripId: null,
  expenseData: null,

  async render(params) {
    ExpenseTrackerPage.tripId = params.tripId;

    return `
      <div class="expense-tracker-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Expense Tracker & Budget Control</h1>
            <p class="page-subtitle">Track planned vs actual spending, categorize expenses, and split tabs transparently</p>
          </div>
          <div class="page-actions">
            <a href="#/trips/${ExpenseTrackerPage.tripId}/settlements" class="btn btn-outline"><i class="fas fa-hand-holding-usd" style="color: var(--accent-orange);"></i> View Debt Settlement</a>
            <button class="btn btn-teal" onclick="ExpenseTrackerPage.openAddExpenseModal()"><i class="fas fa-plus"></i> Add Expense</button>
          </div>
        </div>

        <!-- Budget Summary & Warning Container -->
        <div id="expense-budget-summary">
          <div class="spinner"></div>
        </div>

        <!-- Category Spend Strip -->
        <div id="expense-category-breakdown" style="margin-bottom: 2rem;"></div>

        <!-- Expenses List Card -->
        <div class="jh-card">
          <div class="jh-card-header">
            <h3 class="jh-card-title"><i class="fas fa-receipt" style="color: var(--primary-teal);"></i> Recorded Expenses</h3>
            <button class="btn btn-teal btn-sm" onclick="ExpenseTrackerPage.openAddExpenseModal()"><i class="fas fa-plus"></i> Record Expense</button>
          </div>
          <div class="jh-card-body" id="expenses-table-container" style="padding: 0;">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    ExpenseTrackerPage.tripId = params.tripId;
    await ExpenseTrackerPage.loadExpenses();
  },

  async loadExpenses() {
    try {
      const res = await window.API.get(`/api/trips/${ExpenseTrackerPage.tripId}/expenses`);
      ExpenseTrackerPage.expenseData = res;
      ExpenseTrackerPage.renderBudgetSummary();
      ExpenseTrackerPage.renderCategoryBreakdown();
      ExpenseTrackerPage.renderExpensesTable();
    } catch (err) {
      document.getElementById('expenses-table-container').innerHTML = `
        <div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>
      `;
    }
  },

  renderBudgetSummary() {
    const container = document.getElementById('expense-budget-summary');
    if (!container) return;

    const summary = ExpenseTrackerPage.expenseData?.budgetSummary || {};
    const warning = summary.thresholdWarning;
    const curr = window.getCurrencySymbol(summary.currency || window.State.currentTrip?.currency);
    const percent = summary.percentSpent || 0;

    let warningBanner = '';
    if (warning) {
      const isDanger = warning.level === 'danger';
      warningBanner = `
        <div style="background-color: ${isDanger ? 'var(--danger-bg)' : 'var(--warning-bg)'}; border: 1px solid ${isDanger ? 'var(--danger)' : 'var(--warning)'}; border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
          <i class="fas fa-exclamation-triangle" style="color: ${isDanger ? 'var(--danger)' : 'var(--warning)'}; font-size: 1.3rem;"></i>
          <span style="font-weight: 600; font-size: 0.9rem; color: ${isDanger ? '#991b1b' : '#92400e'};">${warning.message}</span>
        </div>
      `;
    }

    container.innerHTML = `
      ${warningBanner}

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
        <div class="jh-card" style="padding: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Allocated Budget</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin-top: 0.25rem;">${curr}${summary.estimatedBudget?.toLocaleString()}</div>
        </div>

        <div class="jh-card" style="padding: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Total Actual Spent</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: ${percent >= 100 ? 'var(--danger)' : 'var(--primary-teal)'}; margin-top: 0.25rem;">${curr}${summary.totalSpent?.toLocaleString()}</div>
        </div>

        <div class="jh-card" style="padding: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Remaining Balance</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: ${summary.remainingBudget < 0 ? 'var(--danger)' : 'var(--success)'}; margin-top: 0.25rem;">${curr}${summary.remainingBudget?.toLocaleString()}</div>
        </div>

        <div class="jh-card" style="padding: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Budget Utilized</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: ${percent >= 100 ? 'var(--danger)' : percent >= 80 ? 'var(--warning)' : 'var(--primary-teal)'}; margin-top: 0.25rem;">${percent}%</div>
        </div>
      </div>

      <div class="jh-card" style="padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.4rem;">
          <span>Budget Burn Rate (${percent}%)</span>
          <span>${summary.remainingBudget < 0 ? 'Over Budget' : `${curr}${summary.remainingBudget?.toFixed(2)} remaining`}</span>
        </div>
        <div class="progress-bar-container" style="height: 10px;">
          <div class="progress-bar-fill ${percent >= 100 ? 'progress-danger' : percent >= 80 ? 'progress-orange' : 'progress-teal'}" style="width: ${Math.min(100, percent)}%;"></div>
        </div>
      </div>
    `;
  },

  renderCategoryBreakdown() {
    const container = document.getElementById('expense-category-breakdown');
    if (!container) return;

    const totals = ExpenseTrackerPage.expenseData?.categoryTotals || {};
    const curr = window.getCurrencySymbol(ExpenseTrackerPage.expenseData?.budgetSummary?.currency || window.State.currentTrip?.currency);

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
        ${Object.entries(totals).map(([cat, amt]) => `
          <div style="background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${cat}</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-top: 0.2rem;">${curr}${amt.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderExpensesTable() {
    const container = document.getElementById('expenses-table-container');
    if (!container) return;

    const expenses = ExpenseTrackerPage.expenseData?.expenses || [];
    const curr = window.getCurrencySymbol(ExpenseTrackerPage.expenseData?.budgetSummary?.currency || window.State.currentTrip?.currency);

    if (expenses.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="border: 0; padding: 3rem 1rem;">
          <div class="empty-state-icon"><i class="fas fa-wallet"></i></div>
          <h3 class="empty-state-title">No expenses logged yet</h3>
          <p class="empty-state-text">Add your accommodation, flights, meals, or excursion tickets to keep track of spending.</p>
          <button class="btn btn-teal" onclick="ExpenseTrackerPage.openAddExpenseModal()"><i class="fas fa-plus"></i> Record Expense</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <thead>
            <tr style="background-color: var(--bg-surface); text-align: left; border-bottom: 1px solid var(--border-color);">
              <th style="padding: 0.85rem 1.25rem;">Date</th>
              <th style="padding: 0.85rem 1.25rem;">Title & Notes</th>
              <th style="padding: 0.85rem 1.25rem;">Category</th>
              <th style="padding: 0.85rem 1.25rem;">Paid By</th>
              <th style="padding: 0.85rem 1.25rem;">Split Details</th>
              <th style="padding: 0.85rem 1.25rem;">Amount</th>
              <th style="padding: 0.85rem 1.25rem; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(exp => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.85rem 1.25rem; font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                  ${new Date(exp.date).toLocaleDateString()}
                </td>
                <td style="padding: 0.85rem 1.25rem;">
                  <div style="font-weight: 700; color: var(--text-main);">${exp.title}</div>
                  ${exp.notes ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">${exp.notes}</div>` : ''}
                </td>
                <td style="padding: 0.85rem 1.25rem;">
                  <span class="badge badge-teal">${exp.category}</span>
                </td>
                <td style="padding: 0.85rem 1.25rem;">
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <img src="${exp.paidBy?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                    <span style="font-weight: 600;">${exp.paidBy?.name || 'Someone'}</span>
                  </div>
                </td>
                <td style="padding: 0.85rem 1.25rem; font-size: 0.8rem; color: var(--text-secondary);">
                  ${exp.splitType === 'equal' ? 'Split Equally' : 'Custom Split'} (${(exp.splits || []).length} people)
                </td>
                <td style="padding: 0.85rem 1.25rem; font-weight: 800; color: var(--text-main); font-size: 1rem;">
                  ${curr}${exp.amount.toFixed(2)}
                </td>
                <td style="padding: 0.85rem 1.25rem; text-align: right; white-space: nowrap;">
                  <button class="btn btn-outline btn-sm" onclick="ExpenseTrackerPage.deleteExpense('${exp._id}')" title="Delete Expense">
                    <i class="fas fa-trash-alt" style="color: var(--danger);"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openAddExpenseModal() {
    const trip = window.State.currentTrip;
    const members = trip?.members || [];
    const today = new Date().toISOString().split('T')[0];

    window.Modal.open({
      title: 'Record Trip Expense',
      body: `
        <form id="add-exp-form">
          <div class="form-group">
            <label class="form-label">Expense Title <span style="color: var(--danger);">*</span></label>
            <input type="text" id="exp-title" class="form-control" placeholder="e.g. Kyoto Ryokan 2-Night Booking" required />
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Amount (${window.getCurrencySymbol(trip?.currency)}) <span style="color: var(--danger);">*</span></label>
              <input type="number" id="exp-amount" class="form-control" placeholder="150.00" step="0.01" min="0.01" required />
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="exp-cat" class="form-control">
                <option value="Accommodation">Accommodation</option>
                <option value="Transport">Transport</option>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Activities">Activities</option>
                <option value="Shopping">Shopping</option>
                <option value="Emergency">Emergency</option>
                <option value="Miscellaneous" selected>Miscellaneous</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" id="exp-date" class="form-control" value="${today}" />
            </div>
            <div class="form-group">
              <label class="form-label">Split Method</label>
              <select id="exp-split-type" class="form-control">
                <option value="equal">Split Equally Across All Members</option>
                <option value="exact">Custom Exact Split</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes / Receipt details</label>
            <textarea id="exp-notes" class="form-control" rows="2" placeholder="e.g. Paid in Japanese Yen on credit card..."></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal" onclick="ExpenseTrackerPage.submitAddExpense()">Save Expense</button>
      `
    });
  },

  async submitAddExpense() {
    const title = document.getElementById('exp-title')?.value.trim();
    const amount = document.getElementById('exp-amount')?.value;
    const category = document.getElementById('exp-cat')?.value;
    const date = document.getElementById('exp-date')?.value;
    const splitType = document.getElementById('exp-split-type')?.value;
    const notes = document.getElementById('exp-notes')?.value.trim();

    if (!title || !amount || Number(amount) <= 0) {
      window.showToast('Please enter an expense title and a positive amount.', 'warning');
      return;
    }

    try {
      const res = await window.API.post(`/api/trips/${ExpenseTrackerPage.tripId}/expenses`, {
        title,
        amount: Number(amount),
        category,
        date,
        splitType,
        notes
      });

      window.Modal.close();
      window.showToast(res.message, 'success');
      await ExpenseTrackerPage.loadExpenses();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  },

  deleteExpense(expenseId) {
    window.Modal.confirm({
      title: 'Delete Expense?',
      message: 'Are you sure you want to delete this expense? This will recalculate the group balances and debt simplification.',
      confirmText: 'Delete',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await window.API.delete(`/api/trips/${ExpenseTrackerPage.tripId}/expenses/${expenseId}`);
          window.showToast('Expense deleted.', 'info');
          await ExpenseTrackerPage.loadExpenses();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  }
};

window.ExpenseTrackerPage = ExpenseTrackerPage;
