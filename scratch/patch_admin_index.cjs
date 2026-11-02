const fs = require('fs');
let code = fs.readFileSync('src/admin/index.js', 'utf8');

// Define normalizeAdminViewId and resolveInitialView
const newViewLogic = `export function normalizeAdminViewId(rawId) {
  if (!rawId) return null;
  const clean = String(rawId).trim().replace(/^[#?]+/, '').replace(/^view=/, '').toLowerCase();

  // Live order manager mappings
  if (['live-orders', 'live-orders-view', 'live', 'liveorders', 'order-manager', 'ordermanager', 'orders.html'].includes(clean)) {
    return 'live-orders-view';
  }
  // Order history mappings
  if (['orders', 'orders-view', 'all-orders', 'allorders', 'order-history'].includes(clean)) {
    return 'orders-view';
  }
  // Marketing & deals mappings
  if (['deals', 'deals-view', 'marketing', 'marketing-view', 'promotions'].includes(clean)) {
    return 'marketing-view';
  }
  // Menu manager mappings
  if (['menu', 'menu-manage', 'menu-manage-view', 'menu-management'].includes(clean)) {
    return 'menu-manage-view';
  }
  // TV layout mappings
  if (['tv', 'tv-layout', 'tv-layout-view', 'tv1', 'tv2'].includes(clean)) {
    return 'tv-layout-view';
  }
  // Retail / spices
  if (['retail', 'retail-manage-view', 'spices'].includes(clean)) {
    return 'retail-manage-view';
  }
  // Shipping
  if (['shipping', 'shipping-manage-view', 'retail-shipping'].includes(clean)) {
    return 'shipping-manage-view';
  }
  // Customers / CRM
  if (['customers', 'customers-view', 'crm'].includes(clean)) {
    return 'customers-view';
  }
  // Catering
  if (['catering', 'catering-view'].includes(clean)) {
    return 'catering-view';
  }
  // Settings
  if (['settings', 'settings-view'].includes(clean)) {
    return 'settings-view';
  }
  // Inventory
  if (['inventory', 'inventory-view'].includes(clean)) {
    return 'inventory-view';
  }
  // Analytics
  if (['analytics', 'analytics-view', 'traffic'].includes(clean)) {
    return 'analytics-view';
  }
  // Expenses
  if (['expenses', 'expense-view', 'receipts'].includes(clean)) {
    return 'expense-view';
  }
  // Reviews
  if (['reviews', 'reviews-view'].includes(clean)) {
    return 'reviews-view';
  }
  // Loyalty
  if (['loyalty', 'loyalty-view', 'rewards'].includes(clean)) {
    return 'loyalty-view';
  }
  // Pickup
  if (['pickup', 'pickup-view'].includes(clean)) {
    return 'pickup-view';
  }
  // Economics
  if (['economics', 'economics-view'].includes(clean)) {
    return 'economics-view';
  }
  // Blog
  if (['blog', 'blog-management', 'blogs'].includes(clean)) {
    return 'blog-management';
  }
  // Overview / Dashboard
  if (['dashboard', 'dashboard-view', 'overview'].includes(clean)) {
    return 'dashboard-view';
  }

  if (document.getElementById(clean)) {
    return clean;
  }
  return null;
}
window.normalizeAdminViewId = normalizeAdminViewId;

export function resolveInitialView() {
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view') || urlParams.get('tab') || urlParams.get('page');
  const hashParam = window.location.hash ? window.location.hash.replace(/^#/, '') : null;
  const rawTarget = viewParam || hashParam;

  if (rawTarget) {
    const target = normalizeAdminViewId(rawTarget);
    if (target) {
      switchAdminView(target);
      return;
    }
  }

  const pathname = window.location.pathname.replace(/\\/+$/, '');
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length > 1 && pathParts[0] === 'admin') {
    const target = normalizeAdminViewId(pathParts[1]);
    if (target) {
      switchAdminView(target);
    }
  }
}
window.resolveInitialView = resolveInitialView;

export function switchAdminView(targetId) {
  if (!targetId) return;

  const normalized = normalizeAdminViewId(targetId) || targetId;
  targetId = normalized;

  // Seamless redirection from legacy deals-view / marketing hash targets
  if (targetId === 'marketing-view' && (String(targetId).includes('deal') || window.location.hash.includes('deal'))) {
    if (typeof window.switchMarketingTab === 'function') {
      window.switchMarketingTab('deals');
    }
  }

  const navBtns = document.querySelectorAll('.crm-nav-item');
  const views = document.querySelectorAll('.crm-view');

  navBtns.forEach(b => b.classList.remove('active'));
  views.forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });

  const targetBtn = document.querySelector(\`.crm-nav-item[data-target="\${targetId}"]\`);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }

  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.style.display = 'block';
    targetView.classList.add('active');
  }

  // Update mobile active view title
  const activeHeaderTitle = document.getElementById('mobile-active-view-title');
  if (activeHeaderTitle) {
    let titleText = '';
    if (targetBtn) {
      const activeLabel = targetBtn.querySelector('.label');
      if (activeLabel) titleText = activeLabel.textContent.trim();
    }
    if (!titleText && targetView) {
      const heading = targetView.querySelector('.crm-view-title');
      if (heading) titleText = heading.textContent.trim();
    }
    if (titleText) activeHeaderTitle.textContent = titleText;
  }

  if (targetId === 'tv-layout-view') {
    if (typeof window.renderTvLayout === 'function') window.renderTvLayout();
    if (typeof window.setupTvLayoutListeners === 'function') window.setupTvLayoutListeners();
  }

  if (targetId === 'analytics-view') {
    if (typeof window.loadAnalytics === 'function') {
      window.loadAnalytics();
    }
  }
}`;

// Replace original switchAdminView implementation
const oldSwitchRegex = /export function switchAdminView\(targetId\) \{[\s\S]*?\}\s*window\.switchAdminView = switchAdminView;/;
code = code.replace(oldSwitchRegex, () => newViewLogic);

// Replace hashchange listener
const oldHashRegex = /window\.addEventListener\('hashchange', \(\) => \{[\s\S]*?\}\);/;
const newHashLogic = `window.addEventListener('hashchange', () => {
  resolveInitialView();
});`;
code = code.replace(oldHashRegex, () => newHashLogic);

// Replace initial hash sync inside DOMContentLoaded
const oldInitialSyncRegex = /\/\/ Sync active view from URL hash on initial load[\s\S]*?if \(window\.location\.hash\) \{[\s\S]*?switchAdminView\(initialHash\);[\s\S]*?\}\s*\}/;
const newInitialSync = `// Sync active view from URL query (?view=...) or hash on initial load
  resolveInitialView();
}`;
code = code.replace(oldInitialSyncRegex, () => newInitialSync);

fs.writeFileSync('src/admin/index.js', code, 'utf8');
console.log('src/admin/index.js updated successfully.');
