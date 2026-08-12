import { showToast } from './orders.js';
import { state } from './shared.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';


window.profitChartInst = null;
window.profitChartInst = null;
export let profitDataCache = {
  fixedCosts: { rent: 0, commissaryRent: 0, insurance: 0, other: 0 },
  sales: [],
  expenses: []
};

export async function loadProfitData() {
  // Load Fixed Costs
  const fcSnap = await getDoc(doc(db, 'settings', 'fixed_costs'));
  if (fcSnap.exists()) {
    profitDataCache.fixedCosts = fcSnap.data();
    document.getElementById('fc-home-rent').value = profitDataCache.fixedCosts.rent || 0;
    document.getElementById('fc-commissary-rent').value = profitDataCache.fixedCosts.commissaryRent || 0;
    document.getElementById('fc-insurance').value = profitDataCache.fixedCosts.insurance || 0;
    document.getElementById('fc-other').value = profitDataCache.fixedCosts.other || 0;
  }

  // Set default date for sales entry
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('ds-date').value = today;

  // Listen for Sales Logs
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startTimestamp = thirtyDaysAgo.getTime();

  const salesQ = query(collection(db, 'sales_logs'), orderBy('date', 'desc'));
  onSnapshot(salesQ, (snapshot) => {
    profitDataCache.sales = [];
    snapshot.forEach(docSnap => {
      profitDataCache.sales.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Sort ascending for chart after fetching descending (so we have most recent first in table but chronologically sorted for chart)
    profitDataCache.sales.sort((a, b) => a.date.localeCompare(b.date));
    updateProfitDashboard();
    renderRecentDailySales();
  });

  // Fetch expenses (from receipts)
  const expQ = query(collection(db, 'expenses'), where('status', '==', 'confirmed'));
  onSnapshot(expQ, (snapshot) => {
    profitDataCache.expenses = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const dateStr = (data.confirmedAt && data.confirmedAt.toDate) ? 
                      data.confirmedAt.toDate().toISOString().split('T')[0] : 
                      new Date().toISOString().split('T')[0];
      
      let total = 0;
      (data.items || []).forEach(item => total += (item.lineTotal || 0));
      profitDataCache.expenses.push({ id: docSnap.id, date: dateStr, amount: total });
    });
    updateProfitDashboard();
  });
}

export function updateProfitDashboard() {
  const container = document.getElementById('eco-tab-profit');
  if (!container || container.style.display === 'none') return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Aggregate daily data
  const dailyData = {};
  
  // 1a. Map Manual Sales (from sales_logs)
  profitDataCache.sales.forEach(s => {
    const d = new Date(s.date);
    if (d >= thirtyDaysAgo) {
      if (!dailyData[s.date]) dailyData[s.date] = { sales: 0, onlineOrders: 0, expenses: 0 };
      dailyData[s.date].sales += (s.amount || 0);
    }
  });

  // 1b. Auto-sync completed online orders from state.orders
  if (state.orders && state.orders.length > 0) {
    state.orders.forEach(o => {
      if (o.status !== 'completed') return;
      const oDate = o.date;
      if (!oDate || oDate < thirtyDaysAgo) return;
      const dateStr = oDate.toISOString().split('T')[0];
      if (!dailyData[dateStr]) dailyData[dateStr] = { sales: 0, onlineOrders: 0, expenses: 0 };
      dailyData[dateStr].sales += (o.total || 0);
      dailyData[dateStr].onlineOrders += (o.total || 0);
    });
  }

  // Show online orders hint on the daily sales form
  const dsHint = document.getElementById('ds-online-hint');
  if (dsHint) {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOnline = dailyData[todayStr]?.onlineOrders || 0;
    dsHint.textContent = todayOnline > 0 ? `Online orders today: $${todayOnline.toFixed(2)} (auto-included)` : '';
  }

  // 2. Map Variable Expenses
  profitDataCache.expenses.forEach(e => {
    const d = new Date(e.date);
    if (d >= thirtyDaysAgo) {
      if (!dailyData[e.date]) dailyData[e.date] = { sales: 0, expenses: 0 };
      dailyData[e.date].expenses += (e.amount || 0);
    }
  });

  // 3. Calculate Fixed Costs per day
  const fc = profitDataCache.fixedCosts;
  const totalMonthlyFC = (parseFloat(fc.rent)||0) + (parseFloat(fc.commissaryRent)||0) + (parseFloat(fc.insurance)||0) + (parseFloat(fc.other)||0);
  const dailyFixedCost = totalMonthlyFC / 30;

  // Ensure last 30 days exist in the map, even if 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (!dailyData[dateStr]) dailyData[dateStr] = { sales: 0, expenses: 0 };
  }

  // Sort dates
  const sortedDates = Object.keys(dailyData).sort();
  
  let totalSales = 0;
  let totalExpenses = 0;
  let totalProfit = 0;

  const labels = [];
  const salesDataset = [];
  const expensesDataset = [];
  const profitDataset = [];

  sortedDates.forEach(date => {
    labels.push(date.substring(5)); // MM-DD
    const dSales = dailyData[date].sales;
    const dExp = dailyData[date].expenses + dailyFixedCost;
    const dProfit = dSales - dExp;
    
    totalSales += dSales;
    totalExpenses += dExp;
    totalProfit += dProfit;

    salesDataset.push(dSales);
    expensesDataset.push(dExp);
    profitDataset.push(dProfit);
  });

  // Update UI Stats
  document.getElementById('dash-30d-sales').textContent = '$' + totalSales.toFixed(2);
  document.getElementById('dash-30d-expenses').textContent = '$' + totalExpenses.toFixed(2);
  const profitEl = document.getElementById('dash-30d-profit');
  profitEl.textContent = '$' + totalProfit.toFixed(2);
  profitEl.style.color = totalProfit >= 0 ? 'var(--accent)' : '#f44336';

  // 1. Profit Margin
  let profitMargin = 0;
  if (totalSales > 0) {
    profitMargin = (totalProfit / totalSales) * 100;
  }
  const pmEl = document.getElementById('dash-profit-margin');
  if (pmEl) {
    pmEl.textContent = profitMargin.toFixed(1) + '%';
    if (profitMargin >= 15) pmEl.style.color = '#4caf50'; // green
    else if (profitMargin >= 5) pmEl.style.color = '#ff9800'; // orange
    else pmEl.style.color = '#f44336'; // red
  }

  // 2. Avg Daily Sales (only days with >0 sales)
  let daysWithSales = 0;
  let bestDayLabel = '--';
  let bestDaySales = -1;
  sortedDates.forEach(date => {
    const s = dailyData[date].sales;
    if (s > 0) daysWithSales++;
    if (s > bestDaySales) {
      bestDaySales = s;
      bestDayLabel = date.substring(5) + ' ($' + s.toFixed(0) + ')';
    }
  });

  const avgSalesEl = document.getElementById('dash-avg-daily-sales');
  if (avgSalesEl) {
    avgSalesEl.textContent = daysWithSales > 0 ? '$' + (totalSales / daysWithSales).toFixed(2) : '$0.00';
  }

  const bestDayEl = document.getElementById('dash-best-day');
  if (bestDayEl) {
    bestDayEl.textContent = bestDaySales > 0 ? bestDayLabel : '--';
  }

  // Render Chart
  const ctx = document.getElementById('profitChart');
  if (!ctx) return;

  if (window.profitChartInst) {
    window.profitChartInst.destroy();
  }

  window.profitChartInst = new Chart(ctx, {
    type: 'bar', // Base type for combo chart
    data: {
      labels: labels,
      datasets: [
        {
          type: 'line',
          label: 'Sales ($)',
          data: salesDataset,
          borderColor: '#4caf50',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4,
          order: 2
        },
        {
          type: 'bar',
          label: 'Total Expenses ($)',
          data: expensesDataset,
          backgroundColor: 'rgba(244,67,54,0.7)',
          borderRadius: 4,
          order: 3
        },
        {
          type: 'line',
          label: 'Net Profit ($)',
          data: profitDataset,
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33,150,243,0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { labels: { color: '#ccc' } },
        tooltip: {
          callbacks: {
            footer: (tooltipItems) => {
              let sales = 0; let profit = 0;
              tooltipItems.forEach(ti => {
                if(ti.dataset.label.includes('Sales')) sales = ti.parsed.y;
                if(ti.dataset.label.includes('Profit')) profit = ti.parsed.y;
              });
              if (sales > 0) return `Margin: ${((profit/sales)*100).toFixed(1)}%`;
              return '';
            }
          }
        }
      },
      scales: {
        y: { grid: { color: '#333' }, ticks: { color: '#aaa' } },
        x: { grid: { color: '#333' }, ticks: { color: '#aaa' } }
      }
    }
  });

  // === NEW: Day of Week Performance ===
  const dowSales = [0, 0, 0, 0, 0, 0, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  const dowCount = [0, 0, 0, 0, 0, 0, 0];
  
  sortedDates.forEach(dateStr => {
    const d = new Date(dateStr + 'T12:00:00');
    // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    // We want 0=Mon, 6=Sun
    let dayIdx = d.getDay() - 1;
    if (dayIdx === -1) dayIdx = 6;
    dowSales[dayIdx] += dailyData[dateStr].sales;
    if (dailyData[dateStr].sales > 0 || dailyData[dateStr].expenses > 0 || d <= new Date()) {
      dowCount[dayIdx]++;
    }
  });

  const dowAverages = dowSales.map((sales, i) => {
    return dowCount[i] > 0 ? sales / dowCount[i] : 0;
  });

  const dowCtx = document.getElementById('dayOfWeekChart');
  if (dowCtx) {
    if (window.dayOfWeekChartInst) {
      window.dayOfWeekChartInst.destroy();
    }
    
    // Varying opacity for accent color #00e676
    const barColors = [
      'rgba(0, 230, 118, 0.4)',
      'rgba(0, 230, 118, 0.5)',
      'rgba(0, 230, 118, 0.6)',
      'rgba(0, 230, 118, 0.7)',
      'rgba(0, 230, 118, 0.8)',
      'rgba(0, 230, 118, 0.9)',
      'rgba(0, 230, 118, 1.0)'
    ];

    window.dayOfWeekChartInst = new Chart(dowCtx, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Avg Sales ($)',
          data: dowAverages,
          backgroundColor: barColors,
          borderColor: '#00e676',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { grid: { color: '#333' }, ticks: { color: '#aaa' } },
          x: { grid: { color: '#333' }, ticks: { color: '#aaa' } }
        }
      }
    });
  }

  // === NEW: Week over Week Comparison ===
  const now = new Date();
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - (currentDayOfWeek - 1));
  thisWeekStart.setHours(0,0,0,0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
  lastWeekEnd.setHours(23,59,59,999);

  let thisSales = 0, thisExp = 0, lastSales = 0, lastExp = 0;

  Object.keys(dailyData).forEach(dateStr => {
    const d = new Date(dateStr + 'T12:00:00');
    if (d >= thisWeekStart) {
      thisSales += dailyData[dateStr].sales;
      thisExp += dailyData[dateStr].expenses + dailyFixedCost;
    } else if (d >= lastWeekStart && d <= lastWeekEnd) {
      lastSales += dailyData[dateStr].sales;
      lastExp += dailyData[dateStr].expenses + dailyFixedCost;
    }
  });

  const thisProfit = thisSales - thisExp;
  const lastProfit = lastSales - lastExp;

  const getDiffHtml = (current, previous) => {
    if (previous === 0) return '';
    const pct = ((current - previous) / previous) * 100;
    if (pct > 0) return `<span style="color: #4caf50;">&#9650; ${pct.toFixed(1)}%</span>`;
    if (pct < 0) return `<span style="color: #f44336;">&#9660; ${Math.abs(pct).toFixed(1)}%</span>`;
    return `<span style="color: var(--gray);">0.0%</span>`;
  };

  const wwThisSalesEl = document.getElementById('ww-this-sales');
  if (wwThisSalesEl) {
    wwThisSalesEl.textContent = '$' + thisSales.toFixed(2);
    document.getElementById('ww-last-sales').textContent = '$' + lastSales.toFixed(2);
    document.getElementById('ww-diff-sales').innerHTML = getDiffHtml(thisSales, lastSales);
    
    document.getElementById('ww-this-expenses').textContent = '$' + thisExp.toFixed(2);
    document.getElementById('ww-last-expenses').textContent = '$' + lastExp.toFixed(2);

    document.getElementById('ww-this-profit').textContent = '$' + thisProfit.toFixed(2);
    document.getElementById('ww-last-profit').textContent = '$' + lastProfit.toFixed(2);
    document.getElementById('ww-this-profit').style.color = thisProfit >= 0 ? 'var(--accent)' : '#f44336';
    document.getElementById('ww-diff-profit').innerHTML = getDiffHtml(thisProfit, lastProfit);
  }
}

export function renderRecentDailySales() {
  const tbody = document.getElementById('recent-sales-tbody');
  if (!tbody) return;
  
  if (profitDataCache.sales.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 16px; color: var(--gray);">No sales logged yet.</td></tr>';
    return;
  }
  
  // profitDataCache.sales is sorted ascending for chart. Let's show newest first in table.
  const recentSales = [...profitDataCache.sales].reverse().slice(0, 30);
  
  tbody.innerHTML = '';
  recentSales.forEach(s => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = `
      <td style="padding: 12px 8px;">${s.date}</td>
      <td style="padding: 12px 8px;">$${(s.amount || 0).toFixed(2)}</td>
      <td style="padding: 12px 8px; color: var(--gray);">${s.notes || '-'}</td>
      <td style="padding: 12px 8px; text-align: right;">
        <button class="btn-outline btn-small" onclick="editDailySale('${s.date}', ${s.amount}, '${(s.notes || '').replace(/'/g, "\\'")}')" style="margin-right: 8px;">Edit</button>
        <button class="btn-outline btn-small" onclick="deleteDailySale('${s.date}')" style="color: #f44336; border-color: rgba(244,67,54,0.4);">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.editDailySale = (date, amount, notes) => {
  document.getElementById('ds-date').value = date;
  document.getElementById('ds-amount').value = amount;
  document.getElementById('ds-notes').value = notes;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteDailySale = async (date) => {
  if (!confirm(`Delete sales log for ${date}?`)) return;
  try {
    await deleteDoc(doc(db, 'sales_logs', date));
    showToast('Sales log deleted');
  } catch (err) {
    console.error('Error deleting daily sale:', err);
    showToast('Error deleting sales log', true);
  }
};

window.renderEconomicsProfit = () => {
  const container = document.getElementById('eco-tab-profit');
  if (!container) return;
  loadProfitData(); // Initial load
};

export const fixedForm = document.getElementById('fixed-costs-form');
if (fixedForm) {
  fixedForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rent = parseFloat(document.getElementById('fc-home-rent').value) || 0;
    const commissaryRent = parseFloat(document.getElementById('fc-commissary-rent').value) || 0;
    const insurance = parseFloat(document.getElementById('fc-insurance').value) || 0;
    const other = parseFloat(document.getElementById('fc-other').value) || 0;
    
    try {
      await setDoc(doc(db, 'settings', 'fixed_costs'), {
        rent, commissaryRent, insurance, other,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      document.getElementById('fc-status').textContent = "Fixed costs saved!";
      setTimeout(() => document.getElementById('fc-status').textContent = "", 3000);
      showToast("Fixed Costs Saved");
      loadProfitData();
    } catch(err) {
      console.error(err);
      document.getElementById('fc-status').textContent = "Error saving.";
    }
  });
}

export const salesForm = document.getElementById('daily-sales-form');
if (salesForm) {
  salesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('ds-date').value;
    const amount = parseFloat(document.getElementById('ds-amount').value) || 0;
    const notes = document.getElementById('ds-notes').value;
    
    try {
      await setDoc(doc(db, 'sales_logs', date), {
        date, amount, notes,
        loggedAt: serverTimestamp()
      });
      
      document.getElementById('ds-status').textContent = "Daily sales logged!";
      setTimeout(() => document.getElementById('ds-status').textContent = "", 3000);
      showToast("Daily Sales Saved");
      loadProfitData();
    } catch(err) {
      console.error(err);
      document.getElementById('ds-status').textContent = "Error saving.";
    }
  });
}

