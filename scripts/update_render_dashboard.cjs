const fs = require('fs');

const sharedPath = 'src/admin/shared.js';
let content = fs.readFileSync(sharedPath, 'utf8');

// 1. Ensure state has agreements and retailOrders initialized
content = content.replace(
  `export let state = {
  customers: [],
  orders: [],
  reviews: [],
  catering: [],
  quotes: [],
  packageRequests: [],
  cateringCatalog: [],`,
  `export let state = {
  customers: [],
  orders: [],
  reviews: [],
  catering: [],
  quotes: [],
  packageRequests: [],
  cateringCatalog: [],
  agreements: [],
  retailOrders: [],`
);

// 2. Replace renderDashboard function implementation
const fnStart = 'export function renderDashboard() {';
const nextFn = 'export function renderCustomers() {';

const startIndex = content.indexOf(fnStart);
const endIndex = content.indexOf(nextFn);

if (startIndex === -1 || endIndex === -1) {
  throw new Error('Could not locate renderDashboard boundaries in src/admin/shared.js');
}

const newRenderDashboard = `export function getTrailerOperatingStatus() {
  try {
    const now = new Date();
    const laString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    const laDate = new Date(laString);
    const day = laDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const hours = laDate.getHours();
    const minutes = laDate.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // Strict hours per AGENTS.md:
    // Monday to Saturday: 01:00 PM – 10:30 PM (13:00 to 22:30)
    // Sunday: Closed
    if (day === 0) {
      return {
        isOpen: false,
        text: 'Closed Today · Opens Monday 1:00 PM',
        stateClass: 'closed'
      };
    }

    const openMinutes = 13 * 60; // 13:00 = 780
    const closeMinutes = 22 * 60 + 30; // 22:30 = 1350

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return {
        isOpen: true,
        text: 'Open Now · Closes 10:30 PM',
        stateClass: 'open'
      };
    } else if (currentMinutes < openMinutes) {
      return {
        isOpen: false,
        text: 'Closed · Opens Today at 1:00 PM',
        stateClass: 'busy'
      };
    } else {
      const nextDay = day === 6 ? 'Monday' : 'Tomorrow';
      return {
        isOpen: false,
        text: \`Closed for Tonight · Opens \${nextDay} 1:00 PM\`,
        stateClass: 'closed'
      };
    }
  } catch (err) {
    return { isOpen: true, text: 'Open Mon–Sat: 1:00 PM – 10:30 PM', stateClass: 'open' };
  }
}

export function renderDashboard() {
  const completedOrders = (state.orders || []).filter(o => o.status === 'completed' || o.status === 'partially_refunded');
  const totalRevenue = completedOrders.reduce((sum, o) => {
    const refund = o.refundedAmount || (o.refundedAmountCents ? o.refundedAmountCents / 100 : 0) || 0;
    const gross = typeof o.total === 'number' ? o.total : (parseFloat(o.total) || 0);
    return sum + Math.max(0, gross - refund);
  }, 0);
  const aov = completedOrders.length > 0 ? (totalRevenue / completedOrders.length) : 0;
  const repeatCustomers = (state.customers || []).filter(c => c.totalOrders > 1).length;
  const repeatRate = state.customers && state.customers.length > 0 ? (repeatCustomers / state.customers.length) * 100 : 0;

  // --- 0. Trailer Operating Status ---
  const trailerStatus = getTrailerOperatingStatus();
  const trailerBadgeEl = document.getElementById('dash-trailer-status-badge');
  const trailerTextEl = document.getElementById('dash-trailer-status-text');
  if (trailerTextEl) trailerTextEl.textContent = trailerStatus.text;
  if (trailerBadgeEl) {
    const dot = trailerBadgeEl.querySelector('.flat-status-dot');
    if (dot) {
      dot.className = \`flat-status-dot \${trailerStatus.stateClass}\`;
      if (trailerStatus.stateClass === 'open') {
        trailerBadgeEl.style.background = 'rgba(16,185,129,0.1)';
        trailerBadgeEl.style.borderColor = 'rgba(16,185,129,0.3)';
        trailerBadgeEl.style.color = '#10b981';
      } else if (trailerStatus.stateClass === 'busy') {
        trailerBadgeEl.style.background = 'rgba(245,158,11,0.1)';
        trailerBadgeEl.style.borderColor = 'rgba(245,158,11,0.3)';
        trailerBadgeEl.style.color = '#f59e0b';
      } else {
        trailerBadgeEl.style.background = 'rgba(100,116,139,0.1)';
        trailerBadgeEl.style.borderColor = 'rgba(100,116,139,0.3)';
        trailerBadgeEl.style.color = '#94a3b8';
      }
    }
  }

  // --- 1. Today's Executive Pulse ---
  const todayStr = new Date().toLocaleDateString();
  const todayOrders = (state.orders || []).filter(o => o.date && o.date.toLocaleDateString() === todayStr);
  const todayCompleted = todayOrders.filter(o => o.status === 'completed' || o.status === 'partially_refunded');
  const todayPending = todayOrders.filter(o => o.status === 'pending');
  const todayCancelled = todayOrders.filter(o => o.status === 'cancelled' || o.status === 'canceled' || o.status === 'refunded');
  const todayActive = todayOrders.filter(o => o.status !== 'cancelled' && o.status !== 'canceled' && o.status !== 'refunded');

  const todayRevenue = todayCompleted.reduce((sum, o) => {
    const refund = o.refundedAmount || (o.refundedAmountCents ? o.refundedAmountCents / 100 : 0) || 0;
    const gross = typeof o.total === 'number' ? o.total : (parseFloat(o.total) || 0);
    return sum + Math.max(0, gross - refund);
  }, 0);
  const todayRefunds = todayOrders.reduce((sum, o) => {
    const refund = o.refundedAmount || (o.refundedAmountCents ? o.refundedAmountCents / 100 : 0) || 0;
    return sum + refund;
  }, 0);
  let todayItemsSold = 0;
  todayCompleted.forEach(o => {
    (o.items || []).forEach(i => { todayItemsSold += (i.qty || i.quantity || 1); });
  });

  const todayRevEl = document.getElementById('today-revenue');
  const todayRevSubtext = document.getElementById('today-revenue-subtext');
  if (todayRevEl) todayRevEl.textContent = '$' + todayRevenue.toFixed(2);
  if (todayRevSubtext) {
    if (todayRefunds > 0) {
      todayRevSubtext.textContent = \`Gross: $\${(todayRevenue + todayRefunds).toFixed(2)} · Refunds: -$\${todayRefunds.toFixed(2)}\`;
    } else {
      todayRevSubtext.textContent = 'Net receipts after refunds';
    }
  }

  const todayOrdEl = document.getElementById('today-orders');
  if (todayOrdEl) {
    if (todayCancelled.length > 0) {
      todayOrdEl.innerHTML = \`\${todayActive.length} <small style="font-size: 12px; font-weight: normal; color: #ef4444;">(\${todayCancelled.length} ref)</small>\`;
    } else {
      todayOrdEl.textContent = todayOrders.length;
    }
  }

  const todayItemsEl = document.getElementById('today-items-sold');
  if (todayItemsEl) todayItemsEl.textContent = todayItemsSold;

  const todayPendEl = document.getElementById('today-pending');
  if (todayPendEl) {
    todayPendEl.textContent = todayPending.length;
    todayPendEl.style.color = todayPending.length > 0 ? '#f59e0b' : '#10b981';
  }

  // --- 2. Cross-Department Pulse: Catering ---
  const activeInquiries = (state.catering || []).filter(c => c.status === 'new' || c.status === 'contacted').length;
  const activeQuotes = (state.quotes || []).filter(q => q.status === 'sent' || q.status === 'viewed' || q.status === 'draft').length;
  const activeWaivers = (state.agreements || []).filter(a => a.status === 'sent' || a.status === 'signed_cash_pending').length;
  const quotePipe = (state.quotes || []).filter(q => q.status !== 'declined' && q.status !== 'expired' && q.status !== 'canceled').reduce((sum, q) => sum + (Number(q.pricing?.total) || 0), 0);
  const waiverPipe = (state.agreements || []).filter(a => a.status !== 'cancelled').reduce((sum, a) => sum + (Number(a.pricing?.estimatedTotal) || 0), 0);
  const totalCateringPipeline = quotePipe + waiverPipe;

  const inqEl = document.getElementById('dash-cat-inquiries');
  if (inqEl) inqEl.textContent = activeInquiries;
  const qtsEl = document.getElementById('dash-cat-quotes');
  if (qtsEl) qtsEl.textContent = activeQuotes;
  const wvsEl = document.getElementById('dash-cat-waivers');
  if (wvsEl) wvsEl.textContent = activeWaivers;
  const pipEl = document.getElementById('dash-cat-pipeline');
  if (pipEl) pipEl.textContent = \`$\${totalCateringPipeline.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}\`;

  // --- 3. Cross-Department Pulse: Retail & Operations ---
  const pendingShipments = (state.retailOrders || []).filter(r => r.status === 'paid' || r.status === 'processing' || r.status === 'pending').length;
  const retailSales = (state.retailOrders || []).filter(r => r.status !== 'cancelled' && r.status !== 'refunded').reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const pickupCount = todayOrders.filter(o => o.fulfillmentType === 'pickup' || o.fulfillment === 'pickup').length;

  const shipEl = document.getElementById('dash-pending-shipments');
  if (shipEl) shipEl.textContent = pendingShipments;
  const retEl = document.getElementById('dash-retail-sales');
  if (retEl) retEl.textContent = \`$\${retailSales.toFixed(2)}\`;
  const pickEl = document.getElementById('dash-pickup-orders');
  if (pickEl) pickEl.textContent = pickupCount;

  // --- 4. Cross-Department Pulse: Reviews & Loyalty ---
  const reviews = state.reviews || [];
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1) : '5.0';
  const loyaltyMembers = (state.customers || []).filter(c => (c.loyaltyPoints && c.loyaltyPoints > 0) || (c.totalOrders && c.totalOrders > 1)).length;

  const rateEl = document.getElementById('dash-avg-rating');
  if (rateEl) rateEl.textContent = \`\${avgRating} ★\`;
  const revCountEl = document.getElementById('dash-review-count');
  if (revCountEl) revCountEl.textContent = reviews.length;
  const loyEl = document.getElementById('dash-loyalty-members');
  if (loyEl) loyEl.textContent = loyaltyMembers;
  const rrEl = document.getElementById('dash-repeat-rate');
  if (rrEl) rrEl.textContent = \`\${Math.round(repeatRate)}%\`;

  // --- 5. Cross-Department Pulse: Economics & Volume ---
  const revEl = document.getElementById('dash-total-revenue');
  if (revEl) revEl.textContent = \`$\${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
  const aovEl = document.getElementById('dash-aov');
  if (aovEl) aovEl.textContent = \`$\${aov.toFixed(2)}\`;
  const custEl = document.getElementById('dash-total-customers');
  if (custEl) custEl.textContent = (state.customers || []).length;
  const ordEl = document.getElementById('dash-total-orders');
  if (ordEl) ordEl.textContent = (state.orders || []).length;

  // --- 6. Flat Charts: 30-Day Revenue Trend ---
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCompleted = completedOrders.filter(o => o.date >= thirtyDaysAgo);
  const salesByDate = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    salesByDate[d.toLocaleDateString()] = 0;
  }
  recentCompleted.forEach(o => {
    const dStr = o.date.toLocaleDateString();
    if (salesByDate[dStr] !== undefined) {
      salesByDate[dStr] += o.total;
    }
  });

  const revLabels = Object.keys(salesByDate);
  const revData = Object.values(salesByDate);

  const revCtx = document.getElementById('revenueChart');
  if (revCtx) {
    if (window.overviewRevenueChart) window.overviewRevenueChart.destroy();
    window.overviewRevenueChart = new Chart(revCtx, {
      type: 'line',
      data: {
        labels: revLabels,
        datasets: [{
          label: 'Daily Net Revenue ($)',
          data: revData,
          borderColor: '#e11d48',
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#18181b',
            titleColor: '#fafafa',
            bodyColor: '#10b981',
            borderColor: '#27272a',
            borderWidth: 1,
            padding: 10,
            displayColors: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#a1a1aa', font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#a1a1aa', maxTicksLimit: 10, font: { size: 11 } }
          }
        }
      }
    });
  }

  // --- 7. Flat Charts: Top Items Sold ---
  const itemCounts = {};
  completedOrders.forEach(o => {
    if (!o.items) return;
    o.items.forEach(i => {
      if (i.price === 0 || i.basePriceMoney === 0) return;
      const cleanName = (i.name || 'Unknown').trim().toLowerCase().replace(/(^|\\s)\\S/g, l => l.toUpperCase());
      itemCounts[cleanName] = (itemCounts[cleanName] || 0) + (i.qty || i.quantity || 1);
    });
  });
  const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const topCtx = document.getElementById('topItemsChart');
  if (topCtx) {
    if (window.overviewTopItemsChart) window.overviewTopItemsChart.destroy();
    const flatColors = ['#e11d48', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    window.overviewTopItemsChart = new Chart(topCtx, {
      type: 'bar',
      data: {
        labels: sortedItems.map(i => i[0].substring(0, 15) + (i[0].length > 15 ? '...' : '')),
        datasets: [{
          label: 'Quantity Sold',
          data: sortedItems.map(i => i[1]),
          backgroundColor: flatColors.slice(0, sortedItems.length),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#a1a1aa', stepSize: 1, font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#a1a1aa', font: { size: 11 } }
          }
        }
      }
    });
  }

  // --- 8. Unified Live Operations Feed ---
  const feedEl = document.getElementById('dash-activity-feed');
  if (feedEl) {
    feedEl.innerHTML = '';
    const events = [];

    (state.orders || []).slice(0, 8).forEach(o => {
      events.push({
        type: 'order',
        date: o.date || new Date(),
        title: o.customerName || 'Guest Order',
        detail: \`$\${(o.total || 0).toFixed(2)} · \${(o.items || []).length} items\`,
        badge: o.status === 'completed' ? 'Completed' : (o.status === 'pending' ? 'Kitchen Queue' : o.status),
        badgeColor: o.status === 'completed' ? '#10b981' : '#f59e0b'
      });
    });

    (state.agreements || []).slice(0, 4).forEach(a => {
      events.push({
        type: 'waiver',
        date: a.createdAtDate || new Date(),
        title: \`\${a.client?.name || 'Client'} (Catering)\`,
        detail: \`\${a.agreementNumber} · $\${(Number(a.pricing?.estimatedTotal) || 0).toFixed(2)}\`,
        badge: a.status === 'deposit_paid' ? 'Deposit Paid' : (a.status === 'signed_cash_pending' ? 'Signed Cash' : 'Waiver Sent'),
        badgeColor: a.status === 'deposit_paid' ? '#10b981' : '#3b82f6'
      });
    });

    (state.reviews || []).slice(0, 3).forEach(r => {
      events.push({
        type: 'review',
        date: r.date || new Date(),
        title: \`\${r.name || 'Verified Customer'}\`,
        detail: \`\${'★'.repeat(Math.min(5, Math.max(1, Number(r.rating) || 5)))} "\${(r.comment || 'Authentic Afghan food').substring(0, 40)}..."\`,
        badge: 'Review',
        badgeColor: '#f59e0b'
      });
    });

    events.sort((a, b) => b.date - a.date);

    if (events.length === 0) {
      feedEl.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">No recent activity logged yet.</div>';
    } else {
      events.slice(0, 6).forEach(ev => {
        const div = document.createElement('div');
        div.className = 'crm-feed-item';
        div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border-admin); gap: 10px;';
        div.innerHTML = \`
          <div style="min-width: 0;">
            <div style="font-weight: 700; font-size: 12.5px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${escapeHtml(ev.title)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">\${escapeHtml(ev.detail)}</div>
          </div>
          <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: \${ev.badgeColor}22; color: \${ev.badgeColor}; border: 1px solid \${ev.badgeColor}44; white-space: nowrap;">
            \${escapeHtml(ev.badge)}
          </span>
        \`;
        feedEl.appendChild(div);
      });
    }
  }

  // --- 9. Top VIP Guests Leaderboard ---
  const spendersEl = document.getElementById('dash-top-spenders');
  if (spendersEl) {
    spendersEl.innerHTML = '';
    const topSpenders = (state.customers || []).slice(0, 5);
    if (topSpenders.length === 0) {
      spendersEl.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">No customer order records yet.</div>';
    } else {
      topSpenders.forEach((c, idx) => {
        const tier = getTier(c.totalSpent);
        const tierColor = getTierColor(tier);
        const d = document.createElement('div');
        d.className = 'crm-list-item';
        d.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border-admin); cursor: pointer; transition: background 0.15s ease;';
        d.title = 'Click to open customer CRM record';
        d.onclick = () => {
          if (window.openCustomerDetails) window.openCustomerDetails(c.phone);
          else document.querySelector('[data-target="customers-view"]').click();
        };
        d.innerHTML = \`
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <span style="width: 18px; font-size: 11px; font-weight: 800; color: var(--text-dim); text-align: center;">#\${idx + 1}</span>
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 12.5px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${escapeHtml(c.name || 'Valued Guest')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">\${c.totalOrders || 1} orders · \${escapeHtml(c.phone || '')}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px; background: \${tierColor}22; color: \${tierColor}; border: 1px solid \${tierColor}44;">\${tier}</span>
            <strong style="color: #10b981; font-weight: 800; font-size: 13px;">$\${(c.totalSpent || 0).toFixed(2)}</strong>
          </div>
        \`;
        spendersEl.appendChild(d);
      });
    }
  }
}
`;

const updatedContent = content.slice(0, startIndex) + newRenderDashboard + content.slice(endIndex);
fs.writeFileSync(sharedPath, updatedContent, 'utf8');
console.log('Successfully updated renderDashboard in src/admin/shared.js!');
