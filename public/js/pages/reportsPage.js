/**
 * Page 17: Reports & Analytics Page (with Chart.js & CSV Export)
 */
const ReportsPage = {
  tripId: null,
  reportData: null,
  pieChartInstance: null,
  barChartInstance: null,

  async render(params) {
    ReportsPage.tripId = params.tripId || window.State.currentTrip?._id;

    if (!ReportsPage.tripId) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-chart-pie"></i></div>
          <h3 class="empty-state-title">No trip selected for reporting</h3>
          <p class="empty-state-text">Please select an active trip from your dashboard to view its analytics and expense report.</p>
          <a href="#/dashboard" class="btn btn-teal">Go to Dashboard</a>
        </div>
      `;
    }

    return `
      <div class="reports-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Trip Analytics & Expense Reports</h1>
            <p class="page-subtitle">Visual cost breakdowns, daily spend trends, member split audits, and downloadable CSV statements</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-outline" onclick="ReportsPage.exportCSV()"><i class="fas fa-file-csv" style="color: var(--success);"></i> Download CSV Statement</button>
            <button class="btn btn-teal" onclick="window.print()"><i class="fas fa-print"></i> Print Summary</button>
          </div>
        </div>

        <!-- Analytics Body Container -->
        <div id="reports-content-container">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  },

  async mount(params) {
    ReportsPage.tripId = params.tripId || window.State.currentTrip?._id;
    if (ReportsPage.tripId) {
      await ReportsPage.loadReport();
    }
  },

  async loadReport() {
    const container = document.getElementById('reports-content-container');
    if (!container) return;

    try {
      const res = await window.API.get(`/api/reports/trip/${ReportsPage.tripId}`);
      ReportsPage.reportData = res.report;
      ReportsPage.renderReportContent(container);
      ReportsPage.initCharts();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">${err.message}</p></div>`;
    }
  },

  renderReportContent(container) {
    const rep = ReportsPage.reportData;
    const trip = rep.trip;
    const counts = rep.counts;
    const curr = window.getCurrencySymbol(trip.currency);

    container.innerHTML = `
      <!-- High-Level Metric Tiles -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
        <div class="jh-card" style="padding: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Budget</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin-top: 0.25rem;">${curr}${trip.estimatedBudget?.toLocaleString()}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">Planned allocation</div>
        </div>

        <div class="jh-card" style="padding: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Actual Outlay</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: var(--primary-teal); margin-top: 0.25rem;">${curr}${trip.totalExpense?.toLocaleString()}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">${trip.percentSpent}% utilized</div>
        </div>

        <div class="jh-card" style="padding: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Variance / Balance</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: ${trip.remainingBudget < 0 ? 'var(--danger)' : 'var(--success)'}; margin-top: 0.25rem;">
            ${curr}${trip.remainingBudget?.toLocaleString()}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">${trip.remainingBudget < 0 ? 'Over budget' : 'Under budget'}</div>
        </div>

        <div class="jh-card" style="padding: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Planning Scope</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: #6366f1; margin-top: 0.25rem;">${counts.activities} Acts</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">Across ${trip.durationDays || 1} Days (${counts.members} Travelers)</div>
        </div>
      </div>

      <!-- Chart.js Visualizations Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
        <!-- Category Doughnut Chart -->
        <div class="jh-card">
          <div class="jh-card-header">
            <h3 class="jh-card-title"><i class="fas fa-chart-pie" style="color: var(--primary-teal);"></i> Category Distribution</h3>
          </div>
          <div class="jh-card-body" style="height: 320px; position: relative;">
            <canvas id="category-doughnut-chart"></canvas>
          </div>
        </div>

        <!-- Daily Spending Velocity Chart -->
        <div class="jh-card">
          <div class="jh-card-header">
            <h3 class="jh-card-title"><i class="fas fa-chart-line" style="color: var(--accent-orange);"></i> Daily Spending Trend</h3>
          </div>
          <div class="jh-card-body" style="height: 320px; position: relative;">
            <canvas id="daily-spending-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Member Settlement Audit Table -->
      <div class="jh-card">
        <div class="jh-card-header">
          <h3 class="jh-card-title"><i class="fas fa-balance-scale"></i> Member Financial Contribution Audit</h3>
        </div>
        <div class="jh-card-body" style="padding: 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="background-color: var(--bg-surface); text-align: left; border-bottom: 1px solid var(--border-color);">
                <th style="padding: 0.85rem 1.25rem;">Traveler</th>
                <th style="padding: 0.85rem 1.25rem;">Total Paid Out of Pocket</th>
                <th style="padding: 0.85rem 1.25rem;">Total Consumption Share</th>
                <th style="padding: 0.85rem 1.25rem;">Net Standing</th>
              </tr>
            </thead>
            <tbody>
              ${(rep.memberBalances || []).map(b => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.85rem 1.25rem; font-weight: 700;">${b.user?.name}</td>
                  <td style="padding: 0.85rem 1.25rem; font-weight: 600;">${curr}${b.paid.toFixed(2)}</td>
                  <td style="padding: 0.85rem 1.25rem; color: var(--text-secondary);">${curr}${b.share.toFixed(2)}</td>
                  <td style="padding: 0.85rem 1.25rem;">
                    <span class="badge ${b.netBalance > 0.01 ? 'badge-success' : b.netBalance < -0.01 ? 'badge-danger' : 'badge-navy'}">
                      ${b.netBalance > 0.01 ? `Receives ${curr}${b.netBalance.toFixed(2)}` : b.netBalance < -0.01 ? `Owes ${curr}${Math.abs(b.netBalance).toFixed(2)}` : 'Balanced'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  initCharts() {
    if (typeof Chart === 'undefined') return;

    const rep = ReportsPage.reportData;
    if (!rep) return;

    // 1. Doughnut Chart: Categories
    const ctxCat = document.getElementById('category-doughnut-chart');
    if (ctxCat) {
      if (ReportsPage.pieChartInstance) ReportsPage.pieChartInstance.destroy();

      const labels = Object.keys(rep.categoryBreakdown);
      const dataValues = Object.values(rep.categoryBreakdown);

      ReportsPage.pieChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: dataValues,
            backgroundColor: [
              '#0d9488', // Teal (Accommodation)
              '#0284c7', // Sky (Transport)
              '#f97316', // Orange (Food)
              '#8b5cf6', // Violet (Activities)
              '#ec4899', // Pink (Shopping)
              '#ef4444', // Red (Emergency)
              '#64748b'  // Slate (Misc)
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // 2. Bar Chart: Daily Spending
    const ctxDaily = document.getElementById('daily-spending-chart');
    if (ctxDaily) {
      if (ReportsPage.barChartInstance) ReportsPage.barChartInstance.destroy();

      const daily = rep.dailySpending || [];
      const labels = daily.map(d => d.date);
      const values = daily.map(d => d.amount);

      const chartCurr = window.getCurrencySymbol(rep.trip?.currency);
      ReportsPage.barChartInstance = new Chart(ctxDaily, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['No Data'],
          datasets: [{
            label: 'Amount Spent',
            data: values.length > 0 ? values : [0],
            backgroundColor: '#0d9488',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (val) => `${chartCurr}${val}` }
            }
          }
        }
      });
    }
  },

  async exportCSV() {
    try {
      const csvData = await window.API.get(`/api/reports/trip/${ReportsPage.tripId}/csv`);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `journeyhub-trip-expenses.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.showToast('CSV Statement downloaded!', 'success');
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  }
};

window.ReportsPage = ReportsPage;
