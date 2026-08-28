import { initCRMData } from './index.js';
import { loadMenuAdmin } from './menu.js';
import { showToast } from './orders.js';
import { app, auth, db, storage } from '../firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, getDocs, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp, limit, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { t, getLang, setLang, toggleLang, applyTranslations } from '../i18n/index.js';
import Chart from 'chart.js/auto';

export const loginSection = document.getElementById('login-section');
export const dashboardSection = document.getElementById('dashboard-section');
export const loginForm = document.getElementById('login-form');
export const crmNavLinks = document.querySelectorAll('.crm-nav-item');
export const logoutBtn = document.getElementById('logout-btn');
export const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
export const langToggle = document.getElementById('lang-toggle');
export const mobileLangToggle = document.getElementById('mobile-lang-toggle');
export const mobileMenuBtn = document.getElementById('mobile-menu-btn');
export const navOverlay = document.getElementById('crm-nav-overlay');
export const crmNav = document.querySelector('.crm-nav');
export const errorEl = document.getElementById('login-error');
export const ordersList = document.getElementById('orders-list');
export const pwaInstallBtn = document.getElementById('pwa-install-btn');
export const iosInstallHint = document.getElementById('ios-install-hint');
export const langToggleBtn = document.getElementById('lang-toggle');

// Chart instances
window.profitChartInst = null;
window.profitChartInst = null;

// Init Language
setLang(getLang());
applyTranslations();
if (langToggleBtn) {
  langToggleBtn.addEventListener('click', () => {
    toggleLang();
    applyTranslations();
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });
}

// Global escapeHtml utility
export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
window.escapeHtml = escapeHtml;

// PWA Installation Logic
window.quill = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  if (pwaInstallBtn) pwaInstallBtn.style.display = 'block';
});

if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener('click', async () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        pwaInstallBtn.style.display = 'none';
      }
      window.deferredPrompt = null;
    }
  });
}

window.addEventListener('appinstalled', () => {
  if (pwaInstallBtn) pwaInstallBtn.style.display = 'none';
  console.log('PWA was installed');
});

// iOS Detection & Hint
export const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};
export const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

if (isIos() && !isInStandaloneMode() && iosInstallHint) {
  iosInstallHint.style.display = 'block';
}

// Mobile Nav Logic
export function toggleMobileMenu() {
  const isOpen = crmNav.classList.contains('open');
  if (isOpen) {
    crmNav.classList.remove('open');
    navOverlay.style.display = 'none';
    navOverlay.style.opacity = '0';
  } else {
    crmNav.classList.add('open');
    navOverlay.style.display = 'block';
    // Small delay to allow display: block to apply before opacity transition
    setTimeout(() => navOverlay.style.opacity = '1', 10);
  }
}

mobileMenuBtn.addEventListener('click', toggleMobileMenu);
navOverlay.addEventListener('click', toggleMobileMenu);

export let state = {
  customers: [],
  orders: [],
  reviews: [],
  catering: [],
  tiers: { silver: 100, gold: 300 },
  ingredients: [],
  events: [],
  unitSettings: { foodCostWarningThreshold: 30, foodCostDangerThreshold: 35, primeCostThreshold: 65 },
  unitPlatforms: { doordash: 30, ubereats: 30, grubhub: 30 }
};

window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;
window.profitChartInst = null;

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    logoutBtn.style.display = 'block';
    const currentEmailEl = document.getElementById('settings-current-email');
    const currentUidEl = document.getElementById('settings-current-uid');
    if (currentEmailEl) currentEmailEl.textContent = user.email || 'N/A';
    if (currentUidEl) currentUidEl.textContent = user.uid || 'N/A';
    
    initCRMData();
    loadMenuAdmin();
  } else {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    logoutBtn.style.display = 'none';

    
    if (window.ordersUnsub) window.ordersUnsub();
    if (window.reviewsUnsub) window.reviewsUnsub();
    if (window.settingsUnsub) window.settingsUnsub();
    if (window.cateringUnsub) window.cateringUnsub();
    if (window.dealsUnsub) window.dealsUnsub();
    if (window.ingredientsUnsub) window.ingredientsUnsub();
    if (window.eventsUnsub) window.eventsUnsub();
    if (window.unitSettingsUnsub) window.unitSettingsUnsub();
    if (window.unitPlatformsUnsub) window.unitPlatformsUnsub();
    if (window.analyticsUnsub) window.analyticsUnsub();
    if (window.expensesUnsub) window.expensesUnsub();
    if (window.inventoryUnsub) window.inventoryUnsub();
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;
  
  try {
    errorEl.textContent = 'Logging in...';
    await signInWithEmailAndPassword(auth, email, password);
    errorEl.textContent = '';
  } catch (error) {
    errorEl.textContent = 'Invalid credentials. Please try again.';
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});





export function getTier(spent) {
  if (spent >= state.tiers.gold) return 'Gold';
  if (spent >= state.tiers.silver) return 'Silver';
  return 'Bronze';
}

export function getTierColor(tier) {
  if (tier === 'Gold') return '#FFD700';
  if (tier === 'Silver') return '#C0C0C0';
  return '#CD7F32';
}

export function renderDashboard() {
  const completedOrders = state.orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const aov = completedOrders.length > 0 ? (totalRevenue / completedOrders.length) : 0;
  const repeatCustomers = state.customers.filter(c => c.totalOrders > 1).length;
  const repeatRate = state.customers.length > 0 ? (repeatCustomers / state.customers.length) * 100 : 0;

  const revEl = document.getElementById('dash-total-revenue');
  if (revEl) revEl.textContent = `$${totalRevenue.toFixed(2)}`;
  
  document.getElementById('dash-total-customers').textContent = state.customers.length;
  document.getElementById('dash-total-orders').textContent = state.orders.length;
  document.getElementById('dash-aov').textContent = `$${aov.toFixed(2)}`;
  document.getElementById('dash-repeat-rate').textContent = `${Math.round(repeatRate)}%`;

  // --- Today at a Glance ---
  const todayStr = new Date().toLocaleDateString();
  const todayOrders = state.orders.filter(o => o.date.toLocaleDateString() === todayStr);
  const todayCompleted = todayOrders.filter(o => o.status === 'completed');
  const todayPending = todayOrders.filter(o => o.status === 'pending');
  const todayRevenue = todayCompleted.reduce((sum, o) => sum + o.total, 0);
  let todayItemsSold = 0;
  todayCompleted.forEach(o => {
    (o.items || []).forEach(i => { todayItemsSold += (i.qty || 1); });
  });

  const todayRevEl = document.getElementById('today-revenue');
  if (todayRevEl) todayRevEl.textContent = '$' + todayRevenue.toFixed(2);
  const todayOrdEl = document.getElementById('today-orders');
  if (todayOrdEl) todayOrdEl.textContent = todayOrders.length;
  const todayItemsEl = document.getElementById('today-items-sold');
  if (todayItemsEl) todayItemsEl.textContent = todayItemsSold;
  const todayPendEl = document.getElementById('today-pending');
  if (todayPendEl) {
    todayPendEl.textContent = todayPending.length;
    todayPendEl.style.color = todayPending.length > 0 ? '#ff9800' : '#4caf50';
  }

  // --- Charts Rendering ---
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // 1. Revenue Over Time (Last 30 Days)
  const recentCompleted = completedOrders.filter(o => o.date >= thirtyDaysAgo);
  const salesByDate = {};
  for(let i=29; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    salesByDate[d.toLocaleDateString()] = 0;
  }
  recentCompleted.forEach(o => {
    const dStr = o.date.toLocaleDateString();
    if(salesByDate[dStr] !== undefined) {
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
          label: 'Daily Revenue ($)',
          data: revData,
          borderColor: '#FF4500',
          backgroundColor: 'rgba(255, 69, 0, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888' } },
          x: { grid: { display: false }, ticks: { color: '#888', maxTicksLimit: 10 } }
        }
      }
    });
  }

  // 2. Top Items Sold
  const itemCounts = {};
  completedOrders.forEach(o => {
    if(!o.items) return;
    o.items.forEach(i => {
      if (i.price === 0 || i.basePriceMoney === 0) return; // skip free modifiers
      const cleanName = (i.name || 'Unknown').trim().toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
      itemCounts[cleanName] = (itemCounts[cleanName] || 0) + (i.qty || 1);
    });
  });
  const sortedItems = Object.entries(itemCounts).sort((a,b) => b[1] - a[1]).slice(0, 7);
  
  const topCtx = document.getElementById('topItemsChart');
  if (topCtx) {
    if (window.overviewTopItemsChart) window.overviewTopItemsChart.destroy();
    window.overviewTopItemsChart = new Chart(topCtx, {
      type: 'bar',
      data: {
        labels: sortedItems.map(i => i[0].substring(0, 15) + (i[0].length > 15 ? '...' : '')),
        datasets: [{
          label: 'Quantity Sold',
          data: sortedItems.map(i => i[1]),
          backgroundColor: '#FF4500',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888', stepSize: 1 } },
          x: { grid: { display: false }, ticks: { color: '#888' } }
        }
      }
    });
  }


  const feedEl = document.getElementById('dash-activity-feed');
  feedEl.innerHTML = '';
  const recentOrders = state.orders.slice(0, 5);
  recentOrders.forEach(o => {
    const d = document.createElement('div');
    d.className = 'crm-feed-item';
    d.innerHTML = `<strong>${o.customerName || 'Unknown'}</strong> placed an order for $${o.total.toFixed(2)}`;
    feedEl.appendChild(d);
  });

  const spendersEl = document.getElementById('dash-top-spenders');
  spendersEl.innerHTML = '';
  const topSpenders = state.customers.slice(0, 5);
  topSpenders.forEach(c => {
    const d = document.createElement('div');
    d.className = 'crm-list-item';
    d.innerHTML = `
      <span>${c.name}</span>
      <span style="color: var(--accent); font-weight: 600;">$${c.totalSpent.toFixed(2)}</span>
    `;
    spendersEl.appendChild(d);
  });
}

export function renderCustomers() {
  const tbody = document.getElementById('customers-table-body');
  if(!tbody) return;
  const term = document.getElementById('customer-search').value.toLowerCase();
  const tierFilter = document.getElementById('customer-tier-filter');
  const selectedTier = tierFilter ? tierFilter.value : 'all';
  
  tbody.innerHTML = '';
  state.customers
    .filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term))
    .filter(c => {
      if (selectedTier === 'all') return true;
      return getTier(c.totalSpent) === selectedTier;
    })
    .forEach(c => {
      const tier = getTier(c.totalSpent);
      const color = getTierColor(tier);
      
      // Last ordered + at-risk calculation
      let lastOrderedStr = 'Never';
      let lastOrderBadgeColor = 'var(--gray)';
      if (c.lastVisit) {
        const daysSince = Math.floor((Date.now() - c.lastVisit.getTime()) / (1000 * 60 * 60 * 24));
        lastOrderedStr = c.lastVisit.toLocaleDateString();
        if (daysSince <= 14) lastOrderBadgeColor = '#4caf50';
        else if (daysSince <= 30) lastOrderBadgeColor = '#ff9800';
        else lastOrderBadgeColor = '#f44336';
        if (daysSince > 30) lastOrderedStr += ' ⚠️';
      }
      
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td data-label="Name"><strong>${c.name}</strong></td>
        <td data-label="Phone">${c.phone}</td>
        <td data-label="Spent">$${c.totalSpent.toFixed(2)}</td>
        <td data-label="Orders">${c.totalOrders}</td>
        <td data-label="Last Ordered"><span style="color: ${lastOrderBadgeColor};">${lastOrderedStr}</span></td>
        <td data-label="Tier"><span class="crm-badge" style="background: ${color}33; color: ${color}; border-color: ${color};">${tier}</span></td>
      `;
      tr.addEventListener('click', () => window.openCustomerDetail(c));
      tbody.appendChild(tr);
    });
}

window.openCustomerDetail = (cust) => {
  document.getElementById('slide-cust-name').textContent = cust.name;
  const content = document.getElementById('slide-cust-content');
  const tier = getTier(cust.totalSpent);
  const tierColor = getTierColor(tier);
  
  // Get customer's orders from state
  const custOrders = state.orders
    .filter(o => (o.customerPhone || 'Unknown') === cust.phone)
    .sort((a, b) => b.date - a.date);
  
  // Calculate stats
  const completedOrders = custOrders.filter(o => o.status === 'completed');
  const avgOrderValue = completedOrders.length > 0 
    ? completedOrders.reduce((sum, o) => sum + o.total, 0) / completedOrders.length 
    : 0;
  
  // Most ordered item
  const itemFreq = {};
  completedOrders.forEach(o => {
    (o.items || []).forEach(i => {
      const name = (i.name || 'Unknown').trim();
      itemFreq[name] = (itemFreq[name] || 0) + (i.qty || i.quantity || 1);
    });
  });
  const topItem = Object.entries(itemFreq).sort((a,b) => b[1] - a[1])[0];
  
  // Days since last visit
  const daysSince = cust.lastVisit 
    ? Math.floor((Date.now() - cust.lastVisit.getTime()) / (1000 * 60 * 60 * 24)) 
    : null;
  
  let html = `
    <div style="margin-bottom: 24px; display: flex; gap: 10px;">
      <a href="tel:${cust.phone.replace(/\D/g,'')}" class="btn-primary btn-small" style="text-decoration: none;">Send Message / Call</a>
    </div>
    
    <div class="crm-panel mb-m">
      <h3 style="margin-bottom: 12px;">Customer Summary</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Phone</div>
          <div style="font-weight: bold;">${cust.phone}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Tier</div>
          <div><span class="crm-badge" style="background: ${tierColor}33; color: ${tierColor}; border-color: ${tierColor};">${tier}</span></div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Total Spent</div>
          <div style="font-weight: bold; color: var(--accent);">$${cust.totalSpent.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Loyalty Points</div>
          <div style="font-weight: bold; color: var(--accent);">${(cust.loyaltyPoints || 0).toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Avg Order Value</div>
          <div style="font-weight: bold;">$${avgOrderValue.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Favorite Item</div>
          <div style="font-weight: bold;">${topItem ? topItem[0] + ' (' + topItem[1] + 'x)' : 'N/A'}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Last Visit</div>
          <div>${cust.lastVisit ? cust.lastVisit.toLocaleDateString() : 'N/A'}${daysSince !== null ? ` <span style="font-size: 11px; color: ${daysSince > 30 ? '#f44336' : daysSince > 14 ? '#ff9800' : '#4caf50'};">(${daysSince}d ago)</span>` : ''}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--gray); text-transform: uppercase;">Total Orders</div>
          <div style="font-weight: bold;">${cust.totalOrders}</div>
        </div>
      </div>
    </div>

    <div class="crm-panel">
      <h3 style="margin-bottom: 12px;">Order History (${custOrders.length})</h3>
  `;
  
  if (custOrders.length === 0) {
    html += '<p style="color: var(--gray); text-align: center; padding: 16px;">No orders found.</p>';
  } else {
    custOrders.forEach(o => {
      const statusColor = o.status === 'completed' ? '#4caf50' : o.status === 'cancelled' ? '#f44336' : '#ff9800';
      html += `
        <div style="border-bottom: 1px solid var(--border); padding: 12px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 13px; color: var(--gray);">${o.date.toLocaleDateString()} ${o.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${statusColor}22; color: ${statusColor}; text-transform: uppercase; font-weight: bold;">${o.status}</span>
          </div>
          <div style="font-size: 13px;">
            ${(o.items || []).map(i => `<div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>${(i.qty || i.quantity || 1)}x ${escapeHtml(i.name)}</span>
              <span style="color: var(--gray);">$${((i.price || 0) * (i.qty || i.quantity || 1)).toFixed(2)}</span>
            </div>`).join('')}
          </div>
          <div style="text-align: right; font-weight: bold; margin-top: 4px; color: var(--accent);">$${o.total.toFixed(2)}</div>
        </div>`;
    });
  }
  
  html += '</div>';
  content.innerHTML = html;
  document.getElementById('customer-slide-over').classList.add('open');
};

window.closeCustomerSlideOver = () => {
  document.getElementById('customer-slide-over').classList.remove('open');
};

export function renderAllOrders() {
  const tbody = document.getElementById('orders-table-body');
  if(!tbody) return;
  const term = document.getElementById('order-search').value.toLowerCase();
  const statusFilter = document.getElementById('order-status-filter').value;

  tbody.innerHTML = '';
  state.orders
    .filter(o => o.id.toLowerCase().includes(term) || (o.customerName && o.customerName.toLowerCase().includes(term)))
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .forEach(o => {
      let statusClass = 'status-pending';
      if(o.status === 'completed') statusClass = 'status-completed';
      if(o.status === 'cancelled') statusClass = 'status-cancelled';

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td data-label="ID">${o.id.substring(0,8)}</td>
        <td data-label="Customer"><strong>${o.customerName}</strong></td>
        <td data-label="Date">${o.date.toLocaleDateString()}</td>
        <td data-label="Total">$${o.total.toFixed(2)}</td>
        <td data-label="Status"><span class="status-badge ${statusClass}">${o.status}</span></td>
      `;
      tr.addEventListener('click', () => window.openMockOrderDetail(o));
      tbody.appendChild(tr);
    });
}

// CSV Export for Orders
export const exportOrdersBtn = document.getElementById('export-orders-btn');
if (exportOrdersBtn) {
  exportOrdersBtn.addEventListener('click', () => {
    if (state.orders.length === 0) return alert('No orders to export.');
    
    const headers = ['Order ID', 'Customer', 'Date', 'Status', 'Total', 'Items'];
    const rows = state.orders.map(o => {
      const itemsStr = (o.items || []).map(i => `${i.qty}x ${i.name}`).join('; ');
      return [
        o.id,
        o.customerName || 'Unknown',
        o.date.toISOString(),
        o.status,
        o.total.toFixed(2),
        `"${itemsStr}"`
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

window.openMockOrderDetail = (order) => {
  document.getElementById('modal-order-title').textContent = `Order ${order.id}`;
  const content = document.getElementById('modal-order-content');
  
  const itemsHtml = (order.items || []).map(i => `
    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 8px 0;">
      <span>${i.qty}x ${i.name}</span>
      <span>$${(i.price * i.qty).toFixed(2)}</span>
    </div>
  `).join('');

  content.innerHTML = `
    <p style="color: var(--gray); margin-bottom: 16px;">Placed by <strong>${order.customerName}</strong> on ${order.date.toLocaleString()}</p>
    <div style="margin-bottom: 16px;">
      ${itemsHtml}
    </div>
    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px;">
      <span>Total</span>
      <span style="color: var(--accent);">$${order.total.toFixed(2)}</span>
    </div>
  `;
  document.getElementById('order-modal').classList.add('open');
};

window.closeOrderModal = () => {
  document.getElementById('order-modal').classList.remove('open');
};

export function renderReviews() {
  const container = document.getElementById('reviews-container');
  if(!container) return;

// Review stats
const avgRatingEl = document.getElementById('review-avg-rating');
if (avgRatingEl && state.reviews.length > 0) {
  const avgRating = state.reviews.reduce((sum, r) => sum + parseInt(r.stars), 0) / state.reviews.length;
  avgRatingEl.textContent = avgRating.toFixed(1) + ' ★';
  document.getElementById('review-total-count').textContent = state.reviews.length;
  document.getElementById('review-5star-count').textContent = state.reviews.filter(r => parseInt(r.stars) === 5).length;
  document.getElementById('review-unresponded-count').textContent = state.reviews.filter(r => !r.responded).length;
} else if (avgRatingEl) {
  avgRatingEl.textContent = '0.0 ★';
  document.getElementById('review-total-count').textContent = '0';
  document.getElementById('review-5star-count').textContent = '0';
  document.getElementById('review-unresponded-count').textContent = '0';
}

  const statusFilter = document.getElementById('review-status-filter').value;
  
  container.innerHTML = '';
  
  let sortedReviews = [...state.reviews];
  if(statusFilter === 'unresponded') {
    sortedReviews.sort((a,b) => (a.responded === b.responded ? 0 : a.responded ? 1 : -1));
  }
  
  if (sortedReviews.length === 0) {
    container.innerHTML = '<p style="color: var(--gray);">No reviews added yet.</p>';
    return;
  }
  
  sortedReviews.forEach(r => {
    const card = document.createElement('div');
    card.className = 'crm-panel';
    card.style.opacity = r.responded ? '0.6' : '1';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <div>
          <strong style="font-size: 16px;">${r.customerName}</strong>
          <span style="color: var(--gray); font-size: 12px; margin-left: 8px;">via ${r.platform}</span>
        </div>
        <div style="color: #FFD700; letter-spacing: 2px;">${'★'.repeat(parseInt(r.stars))}${'☆'.repeat(5-parseInt(r.stars))}</div>
      </div>
      <p style="margin-bottom: 16px; font-style: italic;">"${r.text}"</p>
      <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
        <input type="checkbox" ${r.responded ? 'checked' : ''} onchange="toggleReviewResponse('${r.id}', this.checked)">
        Mark as Responded
      </label>
    `;
    container.appendChild(card);
  });
}

// Add Review Manual Submit
export const addReviewForm = document.getElementById('add-review-form');
if (addReviewForm) {
  addReviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('review-customer').value;
    const stars = parseInt(document.getElementById('review-stars').value);
    const platform = document.getElementById('review-platform').value;
    const text = document.getElementById('review-text').value;

    try {
      await addDoc(collection(db, 'reviews'), {
        customerName,
        stars,
        platform,
        text,
        responded: false,
        date: serverTimestamp()
      });
      addReviewForm.reset();
      showToast('Review added successfully!');
    } catch (error) {
      console.error("Error adding review:", error);
      alert('Failed to add review');
    }
  });
}

window.toggleReviewResponse = async (id, isResponded) => {
  try {
    await updateDoc(doc(db, 'reviews', id), {
      responded: isResponded
    });
  } catch (error) {
    console.error("Error updating review:", error);
  }
};

export function renderLoyalty() {
  const grid = document.getElementById('loyalty-tiers-grid');
  if(!grid) return;
  let bronze = 0, silver = 0, gold = 0, totalPoints = 0;
  state.customers.forEach(c => {
    const tier = getTier(c.totalSpent);
    if(tier === 'Gold') gold++;
    else if(tier === 'Silver') silver++;
    else bronze++;
    totalPoints += (c.loyaltyPoints || 0);
  });

  // Top 10 loyal customers
  const top10 = [...state.customers]
    .sort((a,b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0))
    .slice(0, 10);

  grid.innerHTML = `
    <div class="crm-stat-card" style="border-top: 3px solid #CD7F32;">
      <div class="stat-title">Bronze Customers</div>
      <div class="stat-value">${bronze}</div>
    </div>
    <div class="crm-stat-card" style="border-top: 3px solid #C0C0C0;">
      <div class="stat-title">Silver Customers</div>
      <div class="stat-value">${silver}</div>
    </div>
    <div class="crm-stat-card" style="border-top: 3px solid #FFD700;">
      <div class="stat-title">Gold Customers</div>
      <div class="stat-value">${gold}</div>
    </div>
    <div class="crm-stat-card" style="border-top: 3px solid var(--accent);">
      <div class="stat-title">Total Points Earned</div>
      <div class="stat-value" style="color: var(--accent);">${totalPoints.toLocaleString()}</div>
    </div>
  `;

  // Leaderboard
  let leaderboardEl = document.getElementById('loyalty-leaderboard');
  if (!leaderboardEl) {
    leaderboardEl = document.createElement('div');
    leaderboardEl.id = 'loyalty-leaderboard';
    leaderboardEl.className = 'crm-panel mt-m';
    grid.insertAdjacentElement('afterend', leaderboardEl);
    // Insert before the Tier Settings panel
    const tierPanel = grid.nextElementSibling?.nextElementSibling;
    if (tierPanel) grid.parentElement.insertBefore(leaderboardEl, tierPanel);
  }

  leaderboardEl.innerHTML = `
    <h2 class="crm-panel-title" style="margin-bottom: 16px;">🏆 Top Loyal Customers</h2>
    <table class="crm-table" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border); color: var(--gray);">
          <th style="padding: 8px; text-align: left;">#</th>
          <th style="padding: 8px; text-align: left;">Customer</th>
          <th style="padding: 8px; text-align: center;">Orders</th>
          <th style="padding: 8px; text-align: right;">Points</th>
          <th style="padding: 8px; text-align: right;">Tier</th>
        </tr>
      </thead>
      <tbody>
        ${top10.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--gray);">No customers yet</td></tr>' :
          top10.map((c, i) => {
            const tier = getTier(c.totalSpent);
            const color = getTierColor(tier);
            return `<tr style="border-bottom: 1px solid var(--border);">
              <td style="padding: 10px 8px; font-weight: bold; color: ${i < 3 ? 'var(--accent)' : 'var(--gray)'};">${i + 1}</td>
              <td style="padding: 10px 8px;"><strong>${escapeHtml(c.name)}</strong><br><span style="font-size: 12px; color: var(--gray);">${c.phone}</span></td>
              <td style="padding: 10px 8px; text-align: center;">${c.totalOrders}</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: var(--accent);">${(c.loyaltyPoints || 0).toLocaleString()}</td>
              <td style="padding: 10px 8px; text-align: right;"><span class="crm-badge" style="background: ${color}33; color: ${color}; border-color: ${color};">${tier}</span></td>
            </tr>`;
          }).join('')}
      </tbody>
    </table>
  `;
}

export const saveTiersBtn = document.getElementById('btn-save-tiers');
if (saveTiersBtn) {
  saveTiersBtn.addEventListener('click', async () => {
    const s = parseInt(document.getElementById('tier-silver').value) || 100;
    const g = parseInt(document.getElementById('tier-gold').value) || 300;
    
    try {
      await setDoc(doc(db, 'settings', 'loyalty'), {
        silver: s,
        gold: g
      });
      showToast('Loyalty thresholds updated!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Failed to save settings');
    }
  });
}

// Event Listeners for Filters
export const customerSearch = document.getElementById('customer-search');
if (customerSearch) customerSearch.addEventListener('input', renderCustomers);

export const customerTierFilter = document.getElementById('customer-tier-filter');
if (customerTierFilter) customerTierFilter.addEventListener('change', renderCustomers);

export const exportCustomersBtn = document.getElementById('btn-export-customers');
if (exportCustomersBtn) {
  exportCustomersBtn.addEventListener('click', () => {
    if (state.customers.length === 0) return alert('No customers to export.');
    const headers = ['Name', 'Phone', 'Email', 'Total Spent', 'Orders', 'Loyalty Points', 'Tier'];
    const rows = state.customers.map(c => [
      `"${c.name || ''}"`, 
      c.phone || '', 
      c.email || '', 
      c.totalSpent.toFixed(2), 
      c.totalOrders, 
      c.loyaltyPoints, 
      getTier(c.totalSpent)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  });
}

export const orderSearch = document.getElementById('order-search');
if (orderSearch) orderSearch.addEventListener('input', renderAllOrders);

export const orderStatusFilter = document.getElementById('order-status-filter');
if (orderStatusFilter) orderStatusFilter.addEventListener('change', renderAllOrders);

export const reviewStatusFilter = document.getElementById('review-status-filter');
if (reviewStatusFilter) reviewStatusFilter.addEventListener('change', renderReviews);

