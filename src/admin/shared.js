import { initCRMData } from './index.js';
import { loadMenuAdmin } from './menu.js';
import { showToast } from './orders.js';
import { db, app } from '../firebase.js';
import { auth } from '../auth.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, updateDoc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getLang, setLang, toggleLang, applyTranslations } from '../i18n/index.js';
import Chart from 'chart.js/auto';
import { iconStar } from '../icons.js';

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

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
if (navOverlay) navOverlay.addEventListener('click', toggleMobileMenu);

window.toggleMobileMenu = toggleMobileMenu;
const mobileCloseBtn = document.getElementById('mobile-close-btn');
if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', toggleMobileMenu);

export let state = {
  customers: [],
  orders: [],
  reviews: [],
  catering: [],
  quotes: [],
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

    // Preserve and switch to target view requested via deep link (?view=... or #...)
    if (typeof window.resolveInitialView === 'function') {
      window.resolveInitialView();
    } else {
      setTimeout(() => {
        if (typeof window.resolveInitialView === 'function') {
          window.resolveInitialView();
        }
      }, 50);
    }
  } else {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    logoutBtn.style.display = 'none';

    
    if (window.ordersUnsub) window.ordersUnsub();
    if (window.reviewsUnsub) window.reviewsUnsub();
    if (window.settingsUnsub) window.settingsUnsub();
    if (window.cateringUnsub) window.cateringUnsub();
    if (window.cateringQuotesUnsub) window.cateringQuotesUnsub();
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

// Login with progressive rate limiting
let failedAdminAttempts = 0;
let lockoutTimer = null;

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (lockoutTimer) return;

  const email = (document.getElementById('admin-email').value || '').trim();
  const password = document.getElementById('admin-password').value || '';
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  if (failedAdminAttempts >= 5) {
    let remainingSeconds = 60;
    if (submitBtn) submitBtn.disabled = true;
    errorEl.textContent = `Too many failed attempts. Please wait ${remainingSeconds}s.`;
    lockoutTimer = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        clearInterval(lockoutTimer);
        lockoutTimer = null;
        failedAdminAttempts = 0;
        if (submitBtn) submitBtn.disabled = false;
        errorEl.textContent = '';
      } else {
        errorEl.textContent = `Too many failed attempts. Please wait ${remainingSeconds}s.`;
      }
    }, 1000);
    return;
  }
  
  try {
    errorEl.textContent = 'Logging in...';
    if (submitBtn) submitBtn.disabled = true;
    await signInWithEmailAndPassword(auth, email, password);
    errorEl.textContent = '';
    failedAdminAttempts = 0;
  } catch (error) {
    failedAdminAttempts++;
    if (failedAdminAttempts >= 5) {
      errorEl.textContent = 'Too many failed attempts. Locked for 60 seconds.';
    } else {
      errorEl.textContent = 'Invalid credentials. Please try again.';
    }
  } finally {
    if (!lockoutTimer && submitBtn) submitBtn.disabled = false;
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
  const completedOrders = state.orders.filter(o => o.status === 'completed' || o.status === 'partially_refunded');
  const totalRevenue = completedOrders.reduce((sum, o) => {
    const refund = o.refundedAmount || (o.refundedAmountCents ? o.refundedAmountCents / 100 : 0) || 0;
    const gross = typeof o.total === 'number' ? o.total : (parseFloat(o.total) || 0);
    return sum + Math.max(0, gross - refund);
  }, 0);
  const aov = completedOrders.length > 0 ? (totalRevenue / completedOrders.length) : 0;
  const repeatCustomers = state.customers.filter(c => c.totalOrders > 1).length;
  const repeatRate = state.customers.length > 0 ? (repeatCustomers / state.customers.length) * 100 : 0;

  const revEl = document.getElementById('dash-total-revenue');
  if (revEl) revEl.textContent = `$${totalRevenue.toFixed(2)}`;
  
  const custEl = document.getElementById('dash-total-customers');
  if (custEl) custEl.textContent = state.customers.length;
  const ordEl = document.getElementById('dash-total-orders');
  if (ordEl) ordEl.textContent = state.orders.length;
  const aovEl = document.getElementById('dash-aov');
  if (aovEl) aovEl.textContent = `$${aov.toFixed(2)}`;
  const rrEl = document.getElementById('dash-repeat-rate');
  if (rrEl) rrEl.textContent = `${Math.round(repeatRate)}%`;

  // --- Today at a Glance ---
  const todayStr = new Date().toLocaleDateString();
  const todayOrders = state.orders.filter(o => o.date.toLocaleDateString() === todayStr);
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
  if (todayRevEl) {
    todayRevEl.textContent = '$' + todayRevenue.toFixed(2);
    if (todayRefunds > 0) {
      todayRevEl.title = `Net: $${todayRevenue.toFixed(2)} (Gross: $${(todayRevenue + todayRefunds).toFixed(2)}, Refunds: -$${todayRefunds.toFixed(2)})`;
    }
  }
  const todayOrdEl = document.getElementById('today-orders');
  if (todayOrdEl) {
    if (todayCancelled.length > 0) {
      todayOrdEl.innerHTML = `${todayActive.length} <span style="font-size: 13px; font-weight: normal; color: #ef4444;" title="${todayCancelled.length} refunded/cancelled">(${todayCancelled.length} refunded)</span>`;
    } else {
      todayOrdEl.textContent = todayOrders.length;
    }
  }
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
      itemCounts[cleanName] = (itemCounts[cleanName] || 0) + (i.qty || i.quantity || 1);
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
        if (daysSince > 30) lastOrderedStr += ' (At risk)';
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
      const refund = o.refundedAmount || (o.refundedAmountCents ? o.refundedAmountCents / 100 : 0) || 0;
      const gross = typeof o.total === 'number' ? o.total : (parseFloat(o.total) || 0);
      const net = Math.max(0, gross - refund);

      let statusBadgeHtml = `<span class="status-badge status-pending">${escapeHtml(o.status || 'pending')}</span>`;
      if (o.status === 'completed') {
        statusBadgeHtml = `<span class="status-badge status-completed">completed</span>`;
      } else if (o.status === 'cancelled') {
        statusBadgeHtml = `<span class="status-badge status-cancelled">cancelled</span>`;
      } else if (o.status === 'refunded') {
        statusBadgeHtml = `<span class="status-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); font-weight: 700;">REFUNDED</span>`;
      } else if (o.status === 'partially_refunded') {
        statusBadgeHtml = `<span class="status-badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); font-weight: 700;">PARTIAL REFUND</span>`;
      }

      let totalDisplay = `$${gross.toFixed(2)}`;
      if (refund > 0) {
        totalDisplay = `<div><strong style="color: var(--accent-admin);">$${net.toFixed(2)}</strong> <span style="font-size: 11px; color: #ef4444; display: block; text-decoration: line-through;">$${gross.toFixed(2)}</span></div>`;
      }

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td data-label="ID">${o.id.substring(0,8)}</td>
        <td data-label="Customer"><strong>${escapeHtml(o.customerName || 'Guest')}</strong></td>
        <td data-label="Date">${o.date.toLocaleDateString()}</td>
        <td data-label="Total">${totalDisplay}</td>
        <td data-label="Status">${statusBadgeHtml}</td>
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
    
    const headers = ['Order ID', 'Customer', 'Date', 'Status', 'Gross Total', 'Refunded', 'Net Total', 'Items'];
    const rows = state.orders.map(o => {
      const itemsStr = (o.items || []).map(i => `${(i.qty || i.quantity || 1)}x ${i.name}`).join('; ');
      const refund = o.refundedAmount || (o.refundedAmountCents ? o.refundedAmountCents / 100 : 0) || 0;
      const gross = typeof o.total === 'number' ? o.total : (parseFloat(o.total) || 0);
      const net = Math.max(0, gross - refund);
      return [
        o.id,
        o.customerName || 'Unknown',
        o.date.toISOString(),
        o.status,
        gross.toFixed(2),
        refund.toFixed(2),
        net.toFixed(2),
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
  const shortId = order.id ? (order.id.length > 8 ? order.id.slice(0, 8).toUpperCase() : order.id) : '...';
  const orderTitleEl = document.getElementById('modal-order-title');
  if (orderTitleEl) {
    orderTitleEl.textContent = `Order #${shortId}`;
    orderTitleEl.title = `Full ID: ${order.id}`;
  }
  const content = document.getElementById('modal-order-content');
  if (!content) return;
  
  const itemsHtml = (order.items || []).map(i => {
    const qty = i.quantity || i.qty || 1;
    const price = parseFloat(i.price) || 0;
    return `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-admin); padding: 10px 0; gap: 12px;">
      <span style="font-weight: 500; font-size: 14px; min-width: 0; word-break: break-word;"><strong style="color: var(--accent-admin);">${qty}x</strong> ${escapeHtml(i.name)}</span>
      <span style="font-weight: 600; font-size: 14px; flex-shrink: 0;">$${(price * qty).toFixed(2)}</span>
    </div>
  `}).join('');

  const dateStr = order.date ? (order.date.toLocaleString ? order.date.toLocaleString() : new Date(order.date).toLocaleString()) : 'Unknown';

  const refund = order.refundedAmount || (order.refundedAmountCents ? order.refundedAmountCents / 100 : 0) || 0;
  const gross = typeof order.total === 'number' ? order.total : (parseFloat(order.total) || 0);
  const net = Math.max(0, gross - refund);

  let statusBadgeHtml = `<span class="status-badge status-pending">${escapeHtml(order.status || 'pending')}</span>`;
  if (order.status === 'completed') {
    statusBadgeHtml = `<span class="status-badge status-completed">Completed</span>`;
  } else if (order.status === 'cancelled') {
    statusBadgeHtml = `<span class="status-badge status-cancelled">Cancelled</span>`;
  } else if (order.status === 'refunded') {
    statusBadgeHtml = `<span class="status-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); font-weight: 700;">REFUNDED</span>`;
  } else if (order.status === 'partially_refunded') {
    statusBadgeHtml = `<span class="status-badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); font-weight: 700;">PARTIAL REFUND</span>`;
  }

  const returnsHtml = (order.returns && order.returns.length > 0) ? `
    <div style="margin-top: 16px; background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 12px;">
      <div style="font-size: 12px; font-weight: 700; color: #ef4444; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
        <span>↩️</span>
        <span>Returned / Refunded Items</span>
      </div>
      ${order.returns.map(r => `
        <div style="font-size: 13px; color: var(--text-main);">
          ${(r.returnLineItems || []).map(rli => `
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed rgba(239, 68, 68, 0.2);">
              <span>${escapeHtml(rli.quantity || 1)}x ${escapeHtml(rli.name)}</span>
              <span style="color: #ef4444; font-weight: 600;">-$${Number(rli.amount || 0).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  ` : '';

  content.innerHTML = `
    <!-- Order ID info banner -->
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-admin); border-radius: 8px; padding: 8px 12px; margin-bottom: 16px;">
      <div style="min-width: 0; flex: 1; overflow: hidden;">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px;">Order ID</div>
        <div style="font-family: monospace; font-size: 13px; color: var(--text-main); word-break: break-all; user-select: all;">${escapeHtml(order.id)}</div>
      </div>
      <button type="button" class="btn-outline btn-small" style="padding: 4px 10px; font-size: 12px; flex-shrink: 0;" onclick="navigator.clipboard && navigator.clipboard.writeText('${escapeHtml(order.id)}'); window.showToast && window.showToast('Order ID copied!');">Copy</button>
    </div>

    <!-- Customer and Date Meta -->
    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-admin); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="color: var(--text-muted); margin-bottom: 4px;">Customer: <strong style="color: var(--text-main);">${escapeHtml(order.customerName || 'Walk-in / Guest')}</strong></div>
        <div style="color: var(--text-muted); font-size: 13px;">Placed on: <span style="color: var(--text-main);">${dateStr}</span></div>
      </div>
      <div>${statusBadgeHtml}</div>
    </div>

    ${(order.cancellationReason || order.refundReason) ? `
    <!-- Cancellation / Refund Reason Banner -->
    <div style="margin-bottom: 16px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.35); border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px 14px;">
      <div style="font-size: 11px; font-weight: 700; color: #ef4444; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <span>${order.cancellationReason ? 'Cancellation Reason' : 'Refund Reason'}</span>
      </div>
      <div style="font-size: 14px; color: var(--text-main); font-weight: 500; line-height: 1.4;">
        "${escapeHtml(order.cancellationReason || order.refundReason)}"
      </div>
      ${order.cardBrand ? `
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; display: flex; align-items: center; gap: 6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Refunded to: ${escapeHtml(order.cardBrand)} ending in •••• ${escapeHtml(order.cardLast4 || '')}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Items List -->
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; letter-spacing: 0.5px;">Ordered Items</div>
      ${itemsHtml || '<div style="color: var(--text-muted); font-size: 14px;">No item details available.</div>'}
    </div>

    <!-- Returns if any -->
    ${returnsHtml}

    <!-- Financial Breakdown -->
    <div style="border-top: 2px solid var(--border-admin); padding-top: 12px; margin-top: 16px; font-size: 14px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: var(--text-muted);">
        <span>Original Total:</span>
        <span>$${gross.toFixed(2)}</span>
      </div>
      ${refund > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #ef4444; font-weight: 600;">
        <span>Refunded:</span>
        <span>-$${refund.toFixed(2)}</span>
      </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 18px; margin-top: 6px; border-top: 1px dashed var(--border-admin); padding-top: 8px;">
        <span style="color: var(--text-main);">${refund > 0 ? 'Net Total' : 'Total'}</span>
        <span style="color: var(--accent-admin); font-size: 20px;">$${net.toFixed(2)}</span>
      </div>
    </div>

    ${net > 0 && order.status !== 'cancelled' ? `
    <!-- Refund & Order Actions -->
    <div style="margin-top: 20px; padding: 14px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #ef4444; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px;">Refund Actions</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="btn-outline btn-small" onclick="window.issueAdminRefund('${escapeHtml(order.id)}', true, ${net})" style="flex: 1; min-width: 140px; padding: 8px 12px; font-weight: 600; font-size: 13px; border-color: rgba(239, 68, 68, 0.5); color: #ef4444;">
          ↩️ Refund Full ($${net.toFixed(2)})
        </button>
        <button type="button" class="btn-outline btn-small" onclick="window.issueAdminRefund('${escapeHtml(order.id)}', false, ${net})" style="flex: 1; min-width: 140px; padding: 8px 12px; font-weight: 600; font-size: 13px; border-color: rgba(245, 158, 11, 0.5); color: #f59e0b;">
          ↩️ Partial Item Refund
        </button>
      </div>
    </div>
    ` : ''}

    <!-- Prominent Bottom Close Button for Mobile -->
    <button type="button" class="btn-outline modal-bottom-close-btn" onclick="closeOrderModal()" style="width: 100%; margin-top: 24px; padding: 12px; font-weight: 600; font-size: 15px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
      Close
    </button>
  `;
  document.getElementById('order-modal').classList.add('open');
};

window.issueAdminRefund = async (orderId, isFull, availableAmount) => {
  let refundAmt = availableAmount;
  let reason = '';

  if (isFull) {
    const inputReason = prompt(`Are you sure you want to issue a full refund of $${availableAmount.toFixed(2)} and cancel this order?\n\nIf the order was charged via Square, this will automatically refund the customer's card and update revenue totals.\n\nEnter reason (visible to customer and synced to Square):`, 'Customer requested cancellation / Item unavailable');
    if (inputReason === null) return;
    reason = inputReason.trim() || 'Full refund requested via admin';
  } else {
    const input = prompt(`Enter dollar amount to refund (max $${availableAmount.toFixed(2)}):`, availableAmount.toFixed(2));
    if (!input) return;
    refundAmt = parseFloat(input);
    if (isNaN(refundAmt) || refundAmt <= 0 || refundAmt > availableAmount) {
      alert(`Please enter a valid amount between $0.01 and $${availableAmount.toFixed(2)}`);
      return;
    }
    const inputReason = prompt('Reason or items being refunded (visible to customer and synced to Square):', 'Item return / customer request');
    if (inputReason === null) return;
    reason = inputReason.trim() || 'Item refund';
  }

  showToast('Processing refund...');
  try {
    const refundCallable = httpsCallable(getFunctions(app), 'refundSquarePayment');
    const result = await refundCallable({
      orderId,
      amount: refundAmt,
      reason,
      cancelOrder: isFull
    });

    if (result && result.data && result.data.success) {
      showToast(`Refund of $${result.data.refundedAmount.toFixed(2)} completed!`);
      closeOrderModal();
    } else {
      showToast('Refund processed.');
      closeOrderModal();
    }
  } catch (err) {
    console.error('Refund failed:', err);
    alert('Refund failed: ' + (err.message || 'Unknown error'));
  }
};

window.closeOrderModal = () => {
  const modal = document.getElementById('order-modal');
  if (modal) modal.classList.remove('open');
};

// Universal Modal Dismissal: Backdrop Tap & Escape Key
export function initModalDismissHandlers() {
  document.addEventListener('click', (e) => {
    // Backdrop click on .crm-modal
    if (e.target && e.target.classList.contains('crm-modal')) {
      e.target.classList.remove('open');
      if (e.target.style.display === 'flex') {
        e.target.style.display = 'none';
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      document.querySelectorAll('.crm-modal.open').forEach(m => {
        m.classList.remove('open');
        if (m.style.display === 'flex') m.style.display = 'none';
      });
      const slideOver = document.getElementById('customer-slide-over');
      if (slideOver && slideOver.classList.contains('open')) {
        slideOver.classList.remove('open');
      }
    }
  });
}
initModalDismissHandlers();

export function renderReviews() {
  const container = document.getElementById('reviews-container');
  if(!container) return;

// Review stats
const avgRatingEl = document.getElementById('review-avg-rating');
if (avgRatingEl && state.reviews.length > 0) {
  const avgRating = state.reviews.reduce((sum, r) => sum + parseInt(r.stars), 0) / state.reviews.length;
  avgRatingEl.innerHTML = `${avgRating.toFixed(1)} ${iconStar(18, 'ui-icon ui-icon-no-margin', '#FFD700')}`;
  const rtcEl = document.getElementById('review-total-count'); if (rtcEl) rtcEl.textContent = state.reviews.length;
  const r5El = document.getElementById('review-5star-count'); if (r5El) r5El.textContent = state.reviews.filter(r => parseInt(r.stars) === 5).length;
  const ruEl = document.getElementById('review-unresponded-count'); if (ruEl) ruEl.textContent = state.reviews.filter(r => !r.responded).length;
} else if (avgRatingEl) {
  avgRatingEl.innerHTML = `0.0 ${iconStar(18, 'ui-icon ui-icon-no-margin', '#FFD700')}`;
  const rtcEl0 = document.getElementById('review-total-count'); if (rtcEl0) rtcEl0.textContent = '0';
  const r5El0 = document.getElementById('review-5star-count'); if (r5El0) r5El0.textContent = '0';
  const ruEl0 = document.getElementById('review-unresponded-count'); if (ruEl0) ruEl0.textContent = '0';
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
    
    const stars = Math.max(0, Math.min(5, parseInt(r.stars) || 5));
    const cleanId = escapeHtml(r.id || '');
    const starSvgs = Array.from({ length: 5 }, (_, i) => 
      iconStar(14, 'ui-icon ui-icon-no-margin', i < stars ? '#FFD700' : 'none')
    ).join(' ');
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <div>
          <strong style="font-size: 16px;">${escapeHtml(r.customerName || 'Anonymous')}</strong>
          <span style="color: var(--gray); font-size: 12px; margin-left: 8px;">via ${escapeHtml(r.platform || 'Direct')}</span>
        </div>
        <div style="color: #FFD700; display: flex; align-items: center; gap: 2px;">${starSvgs}</div>
      </div>
      <p style="margin-bottom: 16px; font-style: italic;">"${escapeHtml(r.text || '')}"</p>
      <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
        <input type="checkbox" ${r.responded ? 'checked' : ''} onchange="toggleReviewResponse('${cleanId}', this.checked)">
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
    <h2 class="crm-panel-title" style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin" style="color: var(--accent);"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> Top Loyal Customers</h2>
    <div class="crm-table-container"><table class="crm-table" style="width: 100%; border-collapse: collapse;">
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
              <td style="padding: 10px 8px;"><strong>${escapeHtml(c.name || 'Customer')}</strong><br><span style="font-size: 12px; color: var(--gray);">${escapeHtml(c.phone || '')}</span></td>
              <td style="padding: 10px 8px; text-align: center;">${c.totalOrders}</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: var(--accent);">${(c.loyaltyPoints || 0).toLocaleString()}</td>
              <td style="padding: 10px 8px; text-align: right;"><span class="crm-badge" style="background: ${color}33; color: ${color}; border-color: ${color};">${tier}</span></td>
            </tr>`;
          }).join('')}
      </tbody>
    </table></div>
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

export const syncSquareBtn = document.getElementById('sync-square-btn');
if (syncSquareBtn) {
  syncSquareBtn.addEventListener('click', async () => {
    const origHtml = syncSquareBtn.innerHTML;
    syncSquareBtn.disabled = true;
    syncSquareBtn.innerHTML = '⏳ Syncing...';
    try {
      const resp = await fetch('https://us-central1-bigi-awasaana-7b3ce.cloudfunctions.net/syncSquareOrders');
      const data = await resp.json();
      if (data && data.success) {
        showToast(`Synced ${data.synced || 0} order(s) from Square`);
      } else {
        showToast('Square sync completed');
      }
    } catch (err) {
      console.error('Square sync error:', err);
      showToast('Square sync failed: ' + (err.message || 'Network error'), true);
    } finally {
      syncSquareBtn.disabled = false;
      syncSquareBtn.innerHTML = origHtml;
    }
  });
}

