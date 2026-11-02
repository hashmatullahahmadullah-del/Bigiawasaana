const fs = require('fs');

// 1. Patch src/admin/index.js
let indexContent = fs.readFileSync('src/admin/index.js', 'utf8');

// settings loyalty
indexContent = indexContent.replace(
  `  window.settingsUnsub = onSnapshot(doc(db, 'settings', 'loyalty'), (docSnap) => {
    if (docSnap.exists()) {
      state.tiers = docSnap.data();
      document.getElementById('tier-silver').value = state.tiers.silver || 100;
      document.getElementById('tier-gold').value = state.tiers.gold || 300;
    }
    renderLoyalty();
    renderCustomers();
  });`,
  `  window.settingsUnsub = onSnapshot(doc(db, 'settings', 'loyalty'), (docSnap) => {
    if (docSnap.exists()) {
      state.tiers = docSnap.data();
      document.getElementById('tier-silver').value = state.tiers.silver || 100;
      document.getElementById('tier-gold').value = state.tiers.gold || 300;
    }
    renderLoyalty();
    renderCustomers();
  }, (err) => {
    console.warn('Loyalty settings listener error:', err);
  });`
);

// reviews
indexContent = indexContent.replace(
  `  const rq = query(collection(db, 'reviews'), orderBy('date', 'desc'));
  window.reviewsUnsub = onSnapshot(rq, (snapshot) => {
    state.reviews = [];
    snapshot.forEach(d => {
      state.reviews.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() });
    });
    renderReviews();
  });`,
  `  const rq = query(collection(db, 'reviews'), orderBy('date', 'desc'));
  window.reviewsUnsub = onSnapshot(rq, (snapshot) => {
    state.reviews = [];
    snapshot.forEach(d => {
      state.reviews.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() });
    });
    renderReviews();
  }, (err) => {
    console.warn('Reviews listener error:', err);
  });`
);

// catering
indexContent = indexContent.replace(
  `  const cq = query(collection(db, 'catering_inquiries'), orderBy('createdAt', 'desc'));
  window.cateringUnsub = onSnapshot(cq, (snapshot) => {
    state.catering = [];
    snapshot.forEach(d => {
      state.catering.push({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date() });
    });
    renderCatering();
  });`,
  `  const cq = query(collection(db, 'catering_inquiries'), orderBy('createdAt', 'desc'));
  window.cateringUnsub = onSnapshot(cq, (snapshot) => {
    state.catering = [];
    snapshot.forEach(d => {
      state.catering.push({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date() });
    });
    renderCatering();
  }, (err) => {
    console.warn('Catering listener error:', err);
  });`
);

// unitSettings
indexContent = indexContent.replace(
  `  window.unitSettingsUnsub = onSnapshot(doc(db, 'unitEconomics_settings', 'config'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitSettings = { ...state.unitSettings, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });`,
  `  window.unitSettingsUnsub = onSnapshot(doc(db, 'unitEconomics_settings', 'config'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitSettings = { ...state.unitSettings, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Unit economics settings listener error:', err);
  });`
);

// unitPlatforms
indexContent = indexContent.replace(
  `  window.unitPlatformsUnsub = onSnapshot(doc(db, 'unitEconomics_platforms', 'rates'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitPlatforms = { ...state.unitPlatforms, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });`,
  `  window.unitPlatformsUnsub = onSnapshot(doc(db, 'unitEconomics_platforms', 'rates'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitPlatforms = { ...state.unitPlatforms, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Unit economics platforms listener error:', err);
  });`
);

// ingredients
indexContent = indexContent.replace(
  `  const ingredientsQuery = query(collection(db, 'unitEconomics_ingredients'), orderBy('name', 'asc'));
  window.ingredientsUnsub = onSnapshot(ingredientsQuery, (snapshot) => {
    state.ingredients = [];
    snapshot.forEach(d => state.ingredients.push({ id: d.id, ...d.data() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });`,
  `  const ingredientsQuery = query(collection(db, 'unitEconomics_ingredients'), orderBy('name', 'asc'));
  window.ingredientsUnsub = onSnapshot(ingredientsQuery, (snapshot) => {
    state.ingredients = [];
    snapshot.forEach(d => state.ingredients.push({ id: d.id, ...d.data() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Ingredients listener error:', err);
  });`
);

// events
indexContent = indexContent.replace(
  `  const eventsQuery = query(collection(db, 'unitEconomics_events'), orderBy('date', 'desc'));
  window.eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
    state.events = [];
    snapshot.forEach(d => state.events.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });`,
  `  const eventsQuery = query(collection(db, 'unitEconomics_events'), orderBy('date', 'desc'));
  window.eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
    state.events = [];
    snapshot.forEach(d => state.events.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Events listener error:', err);
  });`
);

// tv_promo
indexContent = indexContent.replace(
  `export async function loadTvPromoSettings() {
  onSnapshot(doc(db, 'settings', 'tv_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('tv-promo-active').checked = data.active || false;
      document.getElementById('tv-promo-text').value = data.text || '';
      toggleTvPromoEditor(data.active);
    }
  });
}`,
  `export async function loadTvPromoSettings() {
  onSnapshot(doc(db, 'settings', 'tv_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('tv-promo-active').checked = data.active || false;
      document.getElementById('tv-promo-text').value = data.text || '';
      toggleTvPromoEditor(data.active);
    }
  }, (err) => {
    console.warn('TV promo listener error:', err);
  });
}`
);

// cart_promo
indexContent = indexContent.replace(
  `export async function loadCartPromoSettings() {
  onSnapshot(doc(db, 'settings', 'cart_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('cart-promo-active').checked = data.active || false;
      document.getElementById('cart-promo-html').value = data.html || '';
      toggleCartPromoEditor(data.active);
    }
  });
}`,
  `export async function loadCartPromoSettings() {
  onSnapshot(doc(db, 'settings', 'cart_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('cart-promo-active').checked = data.active || false;
      document.getElementById('cart-promo-html').value = data.html || '';
      toggleCartPromoEditor(data.active);
    }
  }, (err) => {
    console.warn('Cart promo listener error:', err);
  });
}`
);

// popup
indexContent = indexContent.replace(
  `export async function loadPopupSettings() {
  onSnapshot(doc(db, 'settings', 'popup'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('popup-active').checked = data.active || false;
      document.getElementById('popup-title').value = data.title || '';
      document.getElementById('popup-message').value = data.message || '';
      document.getElementById('popup-btn-text').value = data.buttonText || '';
      document.getElementById('popup-btn-url').value = data.buttonUrl || '';
      togglePopupEditor(data.active);
    }
  });
}`,
  `export async function loadPopupSettings() {
  onSnapshot(doc(db, 'settings', 'popup'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('popup-active').checked = data.active || false;
      document.getElementById('popup-title').value = data.title || '';
      document.getElementById('popup-message').value = data.message || '';
      document.getElementById('popup-btn-text').value = data.buttonText || '';
      document.getElementById('popup-btn-url').value = data.buttonUrl || '';
      togglePopupEditor(data.active);
    }
  }, (err) => {
    console.warn('Popup listener error:', err);
  });
}`
);

fs.writeFileSync('src/admin/index.js', indexContent, 'utf8');
console.log('src/admin/index.js patched.');

// 2. Patch src/admin/analytics.js
let analyticsContent = fs.readFileSync('src/admin/analytics.js', 'utf8');
analyticsContent = analyticsContent.replace(
  `export async function loadProfitData() {
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
}`,
  `let salesProfitUnsub = null;
let expProfitUnsub = null;

export async function loadProfitData() {
  try {
    // Load Fixed Costs
    const fcSnap = await getDoc(doc(db, 'settings', 'fixed_costs'));
    if (fcSnap.exists()) {
      profitDataCache.fixedCosts = fcSnap.data();
      if (document.getElementById('fc-home-rent')) document.getElementById('fc-home-rent').value = profitDataCache.fixedCosts.rent || 0;
      if (document.getElementById('fc-commissary-rent')) document.getElementById('fc-commissary-rent').value = profitDataCache.fixedCosts.commissaryRent || 0;
      if (document.getElementById('fc-insurance')) document.getElementById('fc-insurance').value = profitDataCache.fixedCosts.insurance || 0;
      if (document.getElementById('fc-other')) document.getElementById('fc-other').value = profitDataCache.fixedCosts.other || 0;
    }
  } catch (err) {
    console.warn('Fixed costs fetch notice:', err);
  }
  updateFixedCostsSummaryUI();

  // Set default date for sales entry
  const today = new Date().toISOString().split('T')[0];
  const dsDate = document.getElementById('ds-date');
  if (dsDate) dsDate.value = today;

  // Listen for Sales Logs
  if (salesProfitUnsub) salesProfitUnsub();
  const salesQ = query(collection(db, 'sales_logs'), orderBy('date', 'desc'));
  salesProfitUnsub = onSnapshot(salesQ, (snapshot) => {
    profitDataCache.sales = [];
    snapshot.forEach(docSnap => {
      profitDataCache.sales.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Sort ascending for chart after fetching descending (so we have most recent first in table but chronologically sorted for chart)
    profitDataCache.sales.sort((a, b) => a.date.localeCompare(b.date));
    updateProfitDashboard();
    renderRecentDailySales();
  }, (err) => {
    console.warn('Sales logs listener notice:', err);
  });

  // Fetch expenses (from receipts)
  if (expProfitUnsub) expProfitUnsub();
  const expQ = query(collection(db, 'expenses'), where('status', '==', 'confirmed'));
  expProfitUnsub = onSnapshot(expQ, (snapshot) => {
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
  }, (err) => {
    console.warn('Expenses profit listener notice:', err);
  });
}`
);
fs.writeFileSync('src/admin/analytics.js', analyticsContent, 'utf8');
console.log('src/admin/analytics.js patched.');

// 3. Patch src/admin/expenses.js
let expContent = fs.readFileSync('src/admin/expenses.js', 'utf8');
expContent = expContent.replace(
  `  window.analyticsUnsub = onSnapshot(aq, (snapshot) => {`,
  `  window.analyticsUnsub = onSnapshot(aq, (snapshot) => {`
);
expContent = expContent.replace(
  `  window.analyticsUnsub = onSnapshot(aq, (snapshot) => {
    let totalViews = 0;`,
  `  window.analyticsUnsub = onSnapshot(aq, (snapshot) => {
    let totalViews = 0;`
);

// In expenses.js lines 1458-1460:
expContent = expContent.replace(
  `      window.expensesUnsub = onSnapshot(expensesQuery, (snapshot) => {
        try {`,
  `      window.expensesUnsub = onSnapshot(expensesQuery, (snapshot) => {
        try {`
);

// 4. Patch src/admin/menu.js
let menuContent = fs.readFileSync('src/admin/menu.js', 'utf8');
menuContent = menuContent.replace(
  `export function loadTvDisplaySettings() {
  onSnapshot(doc(db, 'settings', 'tv_display'), (docSnap) => {
    if (!docSnap.exists()) return;`,
  `export function loadTvDisplaySettings() {
  onSnapshot(doc(db, 'settings', 'tv_display'), (docSnap) => {
    if (!docSnap.exists()) return;`,
);

// 5. Patch admin.html isIgnorableError
let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.replace(
  `    if (str.includes('no supported source') || str.includes('the play() request was interrupted') || str.includes('audiocontext') || str.includes('resizeobserver loop limit exceeded')) return true;`,
  `    if (str.includes('no supported source') || str.includes('the play() request was interrupted') || str.includes('audiocontext') || str.includes('resizeobserver loop limit exceeded') || str.includes('missing or insufficient permissions')) return true;`
);
fs.writeFileSync('admin.html', adminHtml, 'utf8');
console.log('admin.html patched.');
