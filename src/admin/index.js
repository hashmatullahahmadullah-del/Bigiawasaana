import { loadAnalytics } from './expenses.js';
import { renderLiveOrders, renderCatering, showToast, playFloorChime } from './orders.js';
import { loadPickupSettings, renderUpcomingScheduledOrders } from './settings.js';
import { fetchRetailOrders } from './shipping.js';
import { loadTvDisplaySettings } from './menu.js';
import { toggleMobileMenu, state, renderDashboard, renderCustomers, renderAllOrders, renderReviews, renderLoyalty } from './shared.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { iconSun, iconMoon } from '../icons.js';
import { initRewardsListener } from './rewards.js';

export function initCRMData() {
  // 0. Listen to Rewards & Redemptions Catalog
  try {
    initRewardsListener();
  } catch (err) {
    console.error('Error initializing rewards listener:', err);
  }

  // 1. Listen to Settings
  window.settingsUnsub = onSnapshot(doc(db, 'settings', 'loyalty'), (docSnap) => {
    if (docSnap.exists()) {
      state.tiers = docSnap.data();
      document.getElementById('tier-silver').value = state.tiers.silver || 100;
      document.getElementById('tier-gold').value = state.tiers.gold || 300;
    }
    renderLoyalty();
    renderCustomers();
  }, (err) => {
    console.warn('Loyalty settings listener notice:', err);
  });

  // 2. Listen to Reviews
  const rq = query(collection(db, 'reviews'), orderBy('date', 'desc'));
  window.reviewsUnsub = onSnapshot(rq, (snapshot) => {
    state.reviews = [];
    snapshot.forEach(d => {
      state.reviews.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() });
    });
    renderReviews();
  }, (err) => {
    console.warn('Reviews listener notice:', err);
  });

  // 3. Listen to Orders (builds state.orders and state.customers)
  let firstOrdersLoad = true;
  const oq = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  window.ordersUnsub = onSnapshot(oq, (snapshot) => {
    
    // Play sound on new incoming orders
    if (!firstOrdersLoad) {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          try {
            playFloorChime();

            showToast('New Order Received!', 'success');
          } catch (e) {
            console.log('Audio playback failed', e);
          }
        }
      });
    }
    firstOrdersLoad = false;

    state.orders = [];
    const custMap = {};

    snapshot.forEach(d => {
      const o = d.data();
      const oDate = (o.createdAt && typeof o.createdAt.toDate === 'function') 
        ? o.createdAt.toDate() 
        : (o.createdAt ? new Date(o.createdAt) : new Date());
      
      let parsedTotal = typeof o.total === 'string' ? parseFloat(o.total.replace('$', '')) : (typeof o.total === 'number' ? o.total : 0);
      const refundAmt = typeof o.refundedAmount === 'number' ? o.refundedAmount : (parseFloat(o.refundedAmount) || (o.refundedAmountCents ? o.refundedAmountCents / 100 : 0) || 0);
      const netTotal = typeof o.netTotal === 'number' ? o.netTotal : Math.max(0, parsedTotal - refundAmt);
      
      const order = {
        id: d.id,
        ...o,
        total: parsedTotal,
        refundedAmount: refundAmt,
        netTotal: netTotal,
        date: oDate
      };
      
      state.orders.push(order);

      const phone = o.customerPhone || 'Unknown';
      if (!custMap[phone]) {
        custMap[phone] = {
          id: phone,
          name: o.customerName || 'Unknown',
          phone: phone,
          totalSpent: 0,
          totalOrders: 0,
          lastVisit: null,
          loyaltyPoints: 0,
          notes: ""
        };
      }
      
      // We take the most recent name if there are multiple orders for the same phone
      if (!custMap[phone].lastVisit || oDate > custMap[phone].lastVisit) {
        custMap[phone].name = o.customerName || custMap[phone].name;
      }

      if (o.status === 'completed' || o.status === 'partially_refunded') {
        const spentToAdd = Math.max(0, parsedTotal - refundAmt);
        custMap[phone].totalSpent += spentToAdd;
        custMap[phone].totalOrders += 1;
        custMap[phone].loyaltyPoints += Math.floor(spentToAdd); // 1 point per $1 spent
        if (!custMap[phone].lastVisit || oDate > custMap[phone].lastVisit) {
          custMap[phone].lastVisit = oDate;
        }
      }
    });

    state.customers = Object.values(custMap).sort((a,b) => b.totalSpent - a.totalSpent);
    
    // Render everything dependent on Orders
    renderLiveOrders(snapshot);
    renderDashboard();
    renderCustomers();
    renderAllOrders();
    renderUpcomingScheduledOrders();
    renderLoyalty();
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Orders listener notice:', err);
  });

  // 4. Listen to Catering Inquiries
  const cq = query(collection(db, 'catering_inquiries'), orderBy('createdAt', 'desc'));
  window.cateringUnsub = onSnapshot(cq, (snapshot) => {
    state.catering = [];
    snapshot.forEach(d => {
      state.catering.push({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date() });
    });
    renderCatering();
  }, (err) => {
    console.warn('Catering inquiries listener notice:', err);
  });
  window.unitSettingsUnsub = onSnapshot(doc(db, 'unitEconomics_settings', 'config'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitSettings = { ...state.unitSettings, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Unit economics settings notice:', err);
  });

  // 9. Listen to Unit Economics Platforms
  window.unitPlatformsUnsub = onSnapshot(doc(db, 'unitEconomics_platforms', 'rates'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitPlatforms = { ...state.unitPlatforms, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Unit economics platforms notice:', err);
  });

  // 10. Listen to Unit Economics Ingredients
  const ingredientsQuery = query(collection(db, 'unitEconomics_ingredients'), orderBy('name', 'asc'));
  window.ingredientsUnsub = onSnapshot(ingredientsQuery, (snapshot) => {
    state.ingredients = [];
    snapshot.forEach(d => state.ingredients.push({ id: d.id, ...d.data() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Ingredients notice:', err);
  });

  // 11. Listen to Unit Economics Events
  const eventsQuery = query(collection(db, 'unitEconomics_events'), orderBy('date', 'desc'));
  window.eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
    state.events = [];
    snapshot.forEach(d => state.events.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Events notice:', err);
  });

  loadAnalytics();
  if (typeof window.initEconomicsListeners === 'function') window.initEconomicsListeners();
  if (typeof window.initDealsListener === 'function') window.dealsUnsub = window.initDealsListener();
  loadPickupSettings();
  fetchRetailOrders();
  loadCartPromoSettings();
  loadTvPromoSettings();
  loadTvDisplaySettings();
  loadPopupSettings();
}

export async function loadTvPromoSettings() {
  onSnapshot(doc(db, 'settings', 'tv_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('tv-promo-active').checked = data.active || false;
      document.getElementById('tv-promo-text').value = data.text || '';
      toggleTvPromoEditor(data.active);
    }
  }, (err) => {
    console.warn('tv_promo notice:', err);
  });
}

export function toggleTvPromoEditor(isActive) {
  const editor = document.getElementById('tv-promo-editor');
  if (isActive) {
    editor.style.opacity = '1';
    editor.style.pointerEvents = 'auto';
  } else {
    editor.style.opacity = '0.5';
    editor.style.pointerEvents = 'none';
  }
}

export const tvPromoCheckbox = document.getElementById('tv-promo-active');
export const btnSaveTvPromo = document.getElementById('btn-save-tv-promo');

if (tvPromoCheckbox) {
  tvPromoCheckbox.addEventListener('change', (e) => {
    toggleTvPromoEditor(e.target.checked);
  });
}

if (btnSaveTvPromo) {
  btnSaveTvPromo.addEventListener('click', async () => {
    btnSaveTvPromo.textContent = 'Saving...';
    try {
      await setDoc(doc(db, 'settings', 'tv_promo'), {
        active: tvPromoCheckbox.checked,
        text: document.getElementById('tv-promo-text').value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('TV Promo saved successfully');
    } catch (e) {
      console.error('Error saving TV promo:', e);
      showToast('Error saving TV promo', true);
    }
    btnSaveTvPromo.textContent = 'Save TV Promo';
  });
}

export async function loadCartPromoSettings() {
  onSnapshot(doc(db, 'settings', 'cart_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('cart-promo-active').checked = data.active || false;
      document.getElementById('cart-promo-html').value = data.html || '';
      toggleCartPromoEditor(data.active);
    }
  }, (err) => {
    console.warn('cart_promo notice:', err);
  });
}

export function toggleCartPromoEditor(isActive) {
  const editor = document.getElementById('cart-promo-editor');
  if (editor) {
    if (isActive) {
      editor.style.opacity = '1';
      editor.style.pointerEvents = 'auto';
    } else {
      editor.style.opacity = '0.5';
      editor.style.pointerEvents = 'none';
    }
  }
}

const cartPromoCheckbox = document.getElementById('cart-promo-active');
const btnSaveCartPromo = document.getElementById('btn-save-cart-promo');

if (cartPromoCheckbox) {
  cartPromoCheckbox.addEventListener('change', (e) => {
    toggleCartPromoEditor(e.target.checked);
  });
}

if (btnSaveCartPromo) {
  btnSaveCartPromo.addEventListener('click', async () => {
    btnSaveCartPromo.textContent = 'Saving...';
    try {
      await setDoc(doc(db, 'settings', 'cart_promo'), {
        active: cartPromoCheckbox.checked,
        html: document.getElementById('cart-promo-html').value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('Cart Promo saved successfully');
    } catch (e) {
      console.error('Error saving cart promo:', e);
      showToast('Error saving cart promo', true);
    }
    btnSaveCartPromo.textContent = 'Save Cart Promo';
  });
}

export async function loadPopupSettings() {
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
    console.warn('popup notice:', err);
  });
}

export const popupActiveCheckbox = document.getElementById('popup-active');
export const popupEditor = document.getElementById('popup-editor');
export const btnSavePopup = document.getElementById('btn-save-popup');

export function togglePopupEditor(isActive) {
  if (isActive) {
    popupEditor.style.opacity = '1';
    popupEditor.style.pointerEvents = 'auto';
  } else {
    popupEditor.style.opacity = '0.5';
    popupEditor.style.pointerEvents = 'none';
  }
}

if (popupActiveCheckbox) {
  popupActiveCheckbox.addEventListener('change', (e) => {
    togglePopupEditor(e.target.checked);
  });
}

if (btnSavePopup) {
  btnSavePopup.addEventListener('click', async () => {
    btnSavePopup.textContent = 'Saving...';
    try {
      await setDoc(doc(db, 'settings', 'popup'), {
        active: popupActiveCheckbox.checked,
        title: document.getElementById('popup-title').value,
        message: document.getElementById('popup-message').value,
        buttonText: document.getElementById('popup-btn-text').value,
        buttonUrl: document.getElementById('popup-btn-url').value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('Pop-Up settings saved successfully');
    } catch (e) {
      console.error('Error saving popup settings:', e);
      showToast('Error saving settings', true);
    }
    btnSavePopup.textContent = 'Save Pop-Up Settings';
  });
}





// Marketing & Promotions Tab Switching
window.switchMarketingTab = function(tab) {
  const dealsTab = document.getElementById('mkt-tab-deals');
  const bannersTab = document.getElementById('mkt-tab-banners');
  const btnDeals = document.getElementById('btn-mkt-deals');
  const btnBanners = document.getElementById('btn-mkt-banners');

  if (tab === 'deals') {
    if (dealsTab) dealsTab.style.display = 'block';
    if (bannersTab) bannersTab.style.display = 'none';
    btnDeals?.classList.add('active');
    btnBanners?.classList.remove('active');
  } else if (tab === 'banners') {
    if (dealsTab) dealsTab.style.display = 'none';
    if (bannersTab) bannersTab.style.display = 'block';
    btnBanners?.classList.add('active');
    btnDeals?.classList.remove('active');
  }
};

export function switchAdminView(targetId) {
  if (!targetId) return;

  // Seamless redirection from legacy deals-view / marketing hash targets
  if (targetId === 'deals-view' || targetId === 'deals') {
    targetId = 'marketing-view';
    if (typeof window.switchMarketingTab === 'function') {
      window.switchMarketingTab('deals');
    }
  } else if (targetId === 'marketing') {
    targetId = 'marketing-view';
  }

  const navBtns = document.querySelectorAll('.crm-nav-item');
  const views = document.querySelectorAll('.crm-view');

  navBtns.forEach(b => b.classList.remove('active'));
  views.forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });

  const targetBtn = document.querySelector(`.crm-nav-item[data-target="${targetId}"]`);
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
}
window.switchAdminView = switchAdminView;

window.addEventListener('resize', () => {
  if (window.pageViewsChartInst && document.getElementById('analytics-view')?.classList.contains('active')) {
    window.pageViewsChartInst.resize();
  }
});

document.querySelectorAll('.crm-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    switchAdminView(targetId);
    
    // Close mobile menu if open
    if (window.innerWidth <= 768 && typeof toggleMobileMenu === 'function') {
      const crmNav = document.querySelector('.crm-nav');
      if (crmNav && crmNav.classList.contains('open')) {
        toggleMobileMenu();
      }
    }
  });
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) {
    switchAdminView(hash);
  }
});

// Mobile Quick Orders Button listener
const quickOrdersBtn = document.getElementById('mobile-quick-orders-btn');
if (quickOrdersBtn) {
  quickOrdersBtn.addEventListener('click', () => {
    switchAdminView('live-orders-view');
  });
}

// Theme Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
  const currentTheme = localStorage.getItem('adminTheme') || 'dark';
  if (themeIcon) themeIcon.innerHTML = currentTheme === 'light' ? iconSun(16, 'ui-icon ui-icon-no-margin') : iconMoon(16, 'ui-icon ui-icon-no-margin');
  const themeText = document.getElementById('theme-text');
  if (themeText) themeText.textContent = currentTheme === 'light' ? 'Light' : 'Dark';
  const toggleTheme = () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('adminTheme', newTheme);
    if (themeIcon) themeIcon.innerHTML = newTheme === 'light' ? iconSun(16, 'ui-icon ui-icon-no-margin') : iconMoon(16, 'ui-icon ui-icon-no-margin');
    if (themeText) themeText.textContent = newTheme === 'light' ? 'Light' : 'Dark';
  };
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  if (mobileThemeToggle) mobileThemeToggle.addEventListener('click', toggleTheme);

  // Sync active view from URL hash on initial load
  if (window.location.hash) {
    const initialHash = window.location.hash.replace('#', '');
    if (document.getElementById(initialHash)) {
      switchAdminView(initialHash);
    }
  }
});

// Auto-inject data-labels for mobile responsive tables
function injectTableLabels() {
  document.querySelectorAll('table.crm-table').forEach(table => {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    if (headers.length === 0) return;
    table.querySelectorAll('tbody tr').forEach(tr => {
      if (tr.children.length === 1 || tr.querySelector('td[colspan]')) {
        const singleTd = tr.querySelector('td');
        if (singleTd) singleTd.classList.add('table-empty-cell');
        return;
      }
      Array.from(tr.querySelectorAll('td')).forEach((td, i) => {
        if (!td.hasAttribute('data-label') && headers[i]) {
          td.setAttribute('data-label', headers[i]);
        }
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  injectTableLabels();
  // Also observe for dynamically injected tables
  const observer = new MutationObserver(() => injectTableLabels());
  observer.observe(document.body, { childList: true, subtree: true });
});
