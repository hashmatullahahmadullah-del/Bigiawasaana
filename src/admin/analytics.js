import { showToast } from './orders.js';
import { state } from './shared.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';

import Chart from 'chart.js/auto';

window.profitChartInst = null;
window.profitChartInst = null;

// ─── Global Chart Configuration State & Handlers ───
window.currentProfitRange = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 7 : 30;
window.currentProfitMode = 'compare'; // 'compare' (grouped bar), 'profit' (standalone profit), 'all' (combo)
window.includeFixedCostsInChart = true;

window.setProfitChartRange = (days) => {
  window.currentProfitRange = days;
  document.querySelectorAll('[id^="btn-chart-range-"]').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-chart-range-${days}`)?.classList.add('active');
  
  const innerWrapper = document.getElementById('profitChartInnerWrapper');
  const swipeHint = document.getElementById('chart-swipe-hint');
  if (innerWrapper) {
    if (window.innerWidth <= 768) {
      if (days === 30) {
        innerWrapper.style.minWidth = '750px';
        if (swipeHint) swipeHint.style.display = 'inline';
      } else if (days === 14) {
        innerWrapper.style.minWidth = '450px';
        if (swipeHint) swipeHint.style.display = 'inline';
      } else {
        innerWrapper.style.minWidth = '100%';
        if (swipeHint) swipeHint.style.display = 'none';
      }
    } else {
      innerWrapper.style.minWidth = '100%';
      if (swipeHint) swipeHint.style.display = 'none';
    }
  }

  updateProfitDashboard();
};

window.setProfitChartMode = (mode) => {
  window.currentProfitMode = mode;
  document.querySelectorAll('[id^="btn-chart-mode-"]').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-chart-mode-${mode}`)?.classList.add('active');
  
  const subtitle = document.getElementById('profit-chart-subtitle');
  if (subtitle) {
    if (mode === 'compare') {
      subtitle.textContent = 'Side-by-side comparison of daily sales (green) vs expenses (red).';
    } else if (mode === 'profit') {
      subtitle.textContent = 'Daily net profit or loss (green = profitable, red = loss day).';
    } else {
      subtitle.textContent = 'All metrics layered with sales, expenses, and net profit.';
    }
  }

  updateProfitDashboard();
};

window.toggleFixedCosts = () => {
  window.includeFixedCostsInChart = !window.includeFixedCostsInChart;
  const btn = document.getElementById('btn-toggle-fixed-costs');
  const label = document.getElementById('label-toggle-fixed-costs');
  
  const fc = profitDataCache.fixedCosts || {};
  const totalMonthlyFC = (parseFloat(fc.rent)||0) + (parseFloat(fc.commissaryRent)||0) + (parseFloat(fc.insurance)||0) + (parseFloat(fc.other)||0);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyFixedCost = totalMonthlyFC > 0 ? (totalMonthlyFC / daysInMonth) : 0;

  if (btn) {
    if (window.includeFixedCostsInChart) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }
  if (label) {
    label.textContent = window.includeFixedCostsInChart ? `Overhead: ${dailyFixedCost.toFixed(0)}/d` : 'Overhead: OFF';
  }
  updateProfitDashboard();
};

export function updateFixedCostsSummaryUI() {
  const rent = parseFloat(document.getElementById('fc-home-rent')?.value) || 0;
  const commissaryRent = parseFloat(document.getElementById('fc-commissary-rent')?.value) || 0;
  const insurance = parseFloat(document.getElementById('fc-insurance')?.value) || 0;
  const other = parseFloat(document.getElementById('fc-other')?.value) || 0;
  
  const total = rent + commissaryRent + insurance + other;
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const daily = total > 0 ? (total / daysInMonth) : 0;
  
  const monthlyEl = document.getElementById('fc-calc-monthly');
  const dailyEl = document.getElementById('fc-calc-daily');
  const noteEl = document.getElementById('fc-calc-note');
  
  if (monthlyEl) monthlyEl.textContent = `${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo`;
  if (dailyEl) dailyEl.textContent = `${daily.toFixed(2)} / day`;
  if (noteEl) noteEl.innerHTML = `Divided by <strong>${daysInMonth} days</strong> in ${monthName}. Added daily to profit calculations.`;
  
  const toggleBtnLabel = document.getElementById('label-toggle-fixed-costs');
  if (toggleBtnLabel) {
    toggleBtnLabel.textContent = window.includeFixedCostsInChart ? `Overhead: ${daily.toFixed(0)}/d` : 'Overhead: OFF';
  }
}
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
    if (document.getElementById('fc-home-rent')) document.getElementById('fc-home-rent').value = profitDataCache.fixedCosts.rent || 0;
    if (document.getElementById('fc-commissary-rent')) document.getElementById('fc-commissary-rent').value = profitDataCache.fixedCosts.commissaryRent || 0;
    if (document.getElementById('fc-insurance')) document.getElementById('fc-insurance').value = profitDataCache.fixedCosts.insurance || 0;
    if (document.getElementById('fc-other')) document.getElementById('fc-other').value = profitDataCache.fixedCosts.other || 0;
  }
  updateFixedCostsSummaryUI();

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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDayOfMonth = now.getDate();
  const monthShort = now.toLocaleString('en-US', { month: 'short' });

  // Calculate daily fixed cost based on current month days
  const fc = profitDataCache.fixedCosts || {};
  const totalMonthlyFC = (parseFloat(fc.rent)||0) + (parseFloat(fc.commissaryRent)||0) + (parseFloat(fc.insurance)||0) + (parseFloat(fc.other)||0);
  const dailyFixedCost = totalMonthlyFC > 0 ? (totalMonthlyFC / daysInMonth) : 0;

  updateFixedCostsSummaryUI();

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

  // Ensure last 30 days exist in the map, even if 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (!dailyData[dateStr]) dailyData[dateStr] = { sales: 0, expenses: 0 };
  }

  // Sort dates
  const sortedDates = Object.keys(dailyData).sort();

  // ── True Month-to-Date (MTD) Calculation ──
  // Calculate from 1st of current month through today
  let mtdSales = 0;
  let mtdVarExpenses = 0;
  let mtdDaysCount = 0;

  for (let d = 1; d <= currentDayOfMonth; d++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dData = dailyData[dStr] || { sales: 0, expenses: 0 };
    mtdSales += (dData.sales || 0);
    mtdVarExpenses += (dData.expenses || 0);
    mtdDaysCount++;
  }

  const mtdFixedCost = dailyFixedCost * mtdDaysCount;
  const mtdTotalExpenses = mtdVarExpenses + mtdFixedCost;
  const mtdProfit = mtdSales - mtdTotalExpenses;

  // Update MTD Stat Cards
  const ueSales = document.getElementById('ue-mtd-sales');
  if (ueSales) ueSales.textContent = '$' + mtdSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const ueExpenses = document.getElementById('ue-mtd-expenses');
  if (ueExpenses) ueExpenses.textContent = '$' + mtdTotalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const ueProfit = document.getElementById('ue-mtd-profit');
  if (ueProfit) {
    const sign = mtdProfit >= 0 ? '' : '-';
    ueProfit.textContent = (sign === '-' ? '-$' : '$') + Math.abs(mtdProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    ueProfit.style.color = mtdProfit >= 0 ? '#10b981' : '#f43f5e';
  }

  // Subtitles on MTD cards
  const ueSalesSub = document.getElementById('ue-mtd-sales-sub');
  if (ueSalesSub) ueSalesSub.textContent = `${monthShort} 1 – ${monthShort} ${currentDayOfMonth} (${mtdDaysCount} days)`;

  const ueExpSub = document.getElementById('ue-mtd-expenses-sub');
  if (ueExpSub) ueExpSub.textContent = `Food: $${mtdVarExpenses.toFixed(0)} + Fixed: $${mtdFixedCost.toFixed(0)}`;

  const ueProfitSub = document.getElementById('ue-mtd-profit-sub');
  if (ueProfitSub) {
    const margin = mtdSales > 0 ? ((mtdProfit / mtdSales) * 100).toFixed(1) : '0.0';
    ueProfitSub.textContent = `${margin}% net margin`;
  }

  // Render Chart
  const ctx = document.getElementById('profitChart');
  if (!ctx) return;

  if (window.profitChartInst) {
    window.profitChartInst.destroy();
  }

  // Filter dates for selected timeframe (7D, 14D, or 30D)
  const range = window.currentProfitRange || 30;
  const displayDates = sortedDates.slice(-range);

  // Sync active UI pill states
  document.querySelectorAll('[id^="btn-chart-range-"]').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-chart-range-${range}`)?.classList.add('active');
  document.querySelectorAll('[id^="btn-chart-mode-"]').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-chart-mode-${window.currentProfitMode || 'compare'}`)?.classList.add('active');

  const btnToggleFixed = document.getElementById('btn-toggle-fixed-costs');
  if (btnToggleFixed) {
    if (window.includeFixedCostsInChart) btnToggleFixed.classList.add('active');
    else btnToggleFixed.classList.remove('active');
  }

  // Calculate Period Summary Stats for selected timeframe
  let periodSales = 0;
  let periodVarExp = 0;
  let periodFixedExp = 0;

  displayDates.forEach(date => {
    const s = dailyData[date]?.sales || 0;
    const v = dailyData[date]?.expenses || 0;
    const f = window.includeFixedCostsInChart ? dailyFixedCost : 0;
    periodSales += s;
    periodVarExp += v;
    periodFixedExp += f;
  });

  const periodTotalExp = periodVarExp + periodFixedExp;
  const periodProfit = periodSales - periodTotalExp;

  const sumSalesEl = document.getElementById('chart-sum-sales');
  const sumVarExpEl = document.getElementById('chart-sum-var-exp');
  const sumFixedExpEl = document.getElementById('chart-sum-fixed-exp');
  const sumProfitEl = document.getElementById('chart-sum-profit');
  const sumHintEl = document.getElementById('chart-sum-hint');

  if (sumSalesEl) sumSalesEl.textContent = '$' + periodSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sumVarExpEl) sumVarExpEl.textContent = '$' + periodVarExp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sumFixedExpEl) {
    if (window.includeFixedCostsInChart) {
      sumFixedExpEl.textContent = '$' + periodFixedExp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      sumFixedExpEl.style.color = '#f43f5e';
    } else {
      sumFixedExpEl.textContent = 'Excluded';
      sumFixedExpEl.style.color = 'var(--text-muted)';
    }
  }
  if (sumProfitEl) {
    const sign = periodProfit >= 0 ? '+' : '';
    sumProfitEl.textContent = sign + '$' + periodProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    sumProfitEl.style.color = periodProfit >= 0 ? '#10b981' : '#f43f5e';
  }
  if (sumHintEl) {
    const margin = periodSales > 0 ? (periodProfit / periodSales) * 100 : 0;
    const ovhStatus = window.includeFixedCostsInChart ? 'incl. fixed overhead' : 'raw gross margin (overhead excluded)';
    if (periodProfit >= 0) {
      sumHintEl.innerHTML = `<span style="color: #10b981; font-weight: 600;">Profitable</span> (+${margin.toFixed(1)}% margin, ${ovhStatus})`;
    } else {
      sumHintEl.innerHTML = `<span style="color: #f43f5e; font-weight: 600;">Expenses Exceeded Sales</span> (${ovhStatus})`;
    }
  }

  // Format Labels and Datasets
  const chartLabels = [];
  const chartSales = [];
  const chartExpenses = [];
  const chartProfit = [];
  const profitBarColors = [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  displayDates.forEach(dateStr => {
    const parts = dateStr.split('-');
    const m = parseInt(parts[1], 10) - 1;
    const dayNum = parseInt(parts[2], 10);
    const dObj = new Date(parseInt(parts[0], 10), m, dayNum);

    const isSmall = typeof window !== 'undefined' && window.innerWidth <= 640;
    if (range <= 7) {
      chartLabels.push(isSmall ? dayNames[dObj.getDay()] : `${dayNames[dObj.getDay()]} ${m+1}/${dayNum}`);
    } else if (range <= 14) {
      chartLabels.push(isSmall ? `${m+1}/${dayNum}` : `${monthNames[m]} ${dayNum}`);
    } else {
      chartLabels.push(`${m+1}/${dayNum}`);
    }

    const dSales = dailyData[dateStr]?.sales || 0;
    const dVarExp = dailyData[dateStr]?.expenses || 0;
    const dFixedExp = window.includeFixedCostsInChart ? dailyFixedCost : 0;
    const dTotalExp = dVarExp + dFixedExp;
    const dProfit = dSales - dTotalExp;

    chartSales.push(parseFloat(dSales.toFixed(2)));
    chartExpenses.push(parseFloat(dTotalExp.toFixed(2)));
    chartProfit.push(parseFloat(dProfit.toFixed(2)));
    profitBarColors.push(dProfit >= 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(244, 63, 94, 0.85)');
  });

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)';
  const tickColor = isLight ? '#64748b' : '#94a3b8';
  const zeroLineColor = isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';

  let datasets = [];
  let chartType = 'bar';

  const expenseLabel = window.includeFixedCostsInChart ? 'Total Costs (Food + Fixed) ($)' : 'Food & Supplies ($)';

  if (window.currentProfitMode === 'compare') {
    // Mode 1: Clean Grouped Bar Chart (Sales vs Expenses side-by-side)
    chartType = 'bar';
    datasets = [
      {
        label: 'Gross Sales ($)',
        data: chartSales,
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        hoverBackgroundColor: '#10b981',
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: range === 7 ? 36 : (range === 14 ? 22 : 14),
        categoryPercentage: 0.8,
        barPercentage: 0.9
      },
      {
        label: expenseLabel,
        data: chartExpenses,
        backgroundColor: 'rgba(244, 63, 94, 0.8)',
        hoverBackgroundColor: '#f43f5e',
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: range === 7 ? 36 : (range === 14 ? 22 : 14),
        categoryPercentage: 0.8,
        barPercentage: 0.9
      }
    ];
  } else if (window.currentProfitMode === 'profit') {
    // Mode 2: Clean Net Profit Bars (Green above $0, Red below $0)
    chartType = 'bar';
    datasets = [
      {
        label: window.includeFixedCostsInChart ? 'Net Profit ($)' : 'Gross Profit ($)',
        data: chartProfit,
        backgroundColor: profitBarColors,
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: range === 7 ? 48 : (range === 14 ? 28 : 16)
      }
    ];
  } else {
    // Mode 3: All Metrics Combined (Grouped bars + Profit line)
    chartType = 'bar';
    datasets = [
      {
        type: 'line',
        label: window.includeFixedCostsInChart ? 'Net Profit ($)' : 'Gross Profit ($)',
        data: chartProfit,
        borderColor: '#38bdf8',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointBackgroundColor: profitBarColors,
        pointBorderColor: '#fff',
        pointRadius: range <= 14 ? 5 : 3,
        tension: 0.3,
        order: 1
      },
      {
        type: 'bar',
        label: 'Gross Sales ($)',
        data: chartSales,
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderRadius: 4,
        maxBarThickness: range === 7 ? 28 : (range === 14 ? 18 : 10),
        order: 2
      },
      {
        type: 'bar',
        label: expenseLabel,
        data: chartExpenses,
        backgroundColor: 'rgba(244, 63, 94, 0.7)',
        borderRadius: 4,
        maxBarThickness: range === 7 ? 28 : (range === 14 ? 18 : 10),
        order: 3
      }
    ];
  }

  window.profitChartInst = new Chart(ctx, {
    type: chartType,
    data: {
      labels: chartLabels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 250
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: tickColor,
            font: { size: 12, family: "'Outfit', sans-serif" },
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            padding: 14
          }
        },
        tooltip: {
          backgroundColor: isLight ? 'rgba(15, 23, 42, 0.95)' : 'rgba(24, 24, 27, 0.95)',
          titleColor: '#fff',
          bodyColor: '#e2e8f0',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          borderColor: isLight ? 'transparent' : 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              if (idx !== undefined && displayDates[idx]) {
                const parts = displayDates[idx].split('-');
                const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                return dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
              }
              return '';
            },
            label: (item) => {
              const val = item.parsed.y;
              const prefix = val >= 0 ? '$' : '-$';
              return ` ${item.dataset.label}: ${prefix}${Math.abs(val).toFixed(2)}`;
            },
            afterBody: (tooltipItems) => {
              const idx = tooltipItems[0]?.dataIndex;
              if (idx === undefined) return [];
              const dateStr = displayDates[idx];
              const s = dailyData[dateStr]?.sales || 0;
              const vExp = dailyData[dateStr]?.expenses || 0;
              const fExp = window.includeFixedCostsInChart ? dailyFixedCost : 0;
              const tExp = vExp + fExp;
              const p = s - tExp;
              const margin = s > 0 ? ((p / s) * 100).toFixed(1) : '0.0';
              const sign = p >= 0 ? '+' : '';
              
              const lines = [];
              lines.push('─────────────────────────');
              lines.push(`• Food & Supplies: $${vExp.toFixed(2)}`);
              if (window.includeFixedCostsInChart && dailyFixedCost > 0) {
                lines.push(`• Fixed Overhead: $${dailyFixedCost.toFixed(2)}`);
              }
              const profitLabel = window.includeFixedCostsInChart ? 'Net Profit' : 'Gross Profit';
              lines.push(`• ${profitLabel}: ${sign}$${p.toFixed(2)} (${margin}% margin)`);
              return lines;
            }
          }
        }
      },
      scales: {
        y: {
          grid: {
            color: (c) => (c.tick?.value === 0 ? zeroLineColor : gridColor),
            lineWidth: (c) => (c.tick?.value === 0 ? 1.5 : 1)
          },
          ticks: {
            color: tickColor,
            font: { size: 11 },
            callback: (val) => '$' + val
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: tickColor,
            font: { size: range <= 7 ? 12 : (range <= 14 ? 11 : 10) },
            maxRotation: 0,
            autoSkip: range > 14
          }
        }
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
  // Real-time calculation on input change
  ['fc-home-rent', 'fc-commissary-rent', 'fc-insurance', 'fc-other'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateFixedCostsSummaryUI);
  });

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
      
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const total = rent + commissaryRent + insurance + other;
      const daily = total > 0 ? (total / daysInMonth) : 0;

      document.getElementById('fc-status').textContent = `Fixed costs saved! (${daily.toFixed(2)}/day)`;
      setTimeout(() => document.getElementById('fc-status').textContent = "", 3000);
      showToast(`Fixed Costs Saved (${daily.toFixed(2)}/day)`);
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

