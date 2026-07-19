import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db, storage } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, getDocs, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { t, getLang, setLang, toggleLang, applyTranslations } from './i18n/index.js';

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const crmNavLinks = document.querySelectorAll('.crm-nav-item');
const logoutBtn = document.getElementById('logout-btn');
const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
const langToggle = document.getElementById('lang-toggle');
const mobileLangToggle = document.getElementById('mobile-lang-toggle');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navOverlay = document.getElementById('crm-nav-overlay');
const crmNav = document.querySelector('.crm-nav');
const errorEl = document.getElementById('login-error');
const ordersList = document.getElementById('orders-list');
const pwaInstallBtn = document.getElementById('pwa-install-btn');
const iosInstallHint = document.getElementById('ios-install-hint');
const langToggleBtn = document.getElementById('lang-toggle');

// Init Language
setLang(getLang());
applyTranslations();
if (langToggleBtn) {
  langToggleBtn.addEventListener('click', () => {
    toggleLang();
    applyTranslations();
    if (typeof renderEconomics === 'function') renderEconomics();
  });
}

// Global escapeHtml utility
window.escapeHtml = function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};
function escapeHtml(str) {
  return window.escapeHtml(str);
}

// PWA Installation Logic
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (pwaInstallBtn) pwaInstallBtn.style.display = 'block';
});

if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        pwaInstallBtn.style.display = 'none';
      }
      deferredPrompt = null;
    }
  });
}

window.addEventListener('appinstalled', () => {
  if (pwaInstallBtn) pwaInstallBtn.style.display = 'none';
  console.log('PWA was installed');
});

// iOS Detection & Hint
const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

if (isIos() && !isInStandaloneMode() && iosInstallHint) {
  iosInstallHint.style.display = 'block';
}

// Mobile Nav Logic
function toggleMobileMenu() {
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

let state = {
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

let ordersUnsub = null;
let reviewsUnsub = null;
let settingsUnsub = null;
let cateringUnsub = null;
let dealsUnsub = null;
let ingredientsUnsub = null;
let eventsUnsub = null;
let unitSettingsUnsub = null;
let unitPlatformsUnsub = null;
let analyticsUnsub = null;
let expensesUnsub = null;
let inventoryUnsub = null;

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

    
    if (ordersUnsub) ordersUnsub();
    if (reviewsUnsub) reviewsUnsub();
    if (settingsUnsub) settingsUnsub();
    if (cateringUnsub) cateringUnsub();
    if (dealsUnsub) dealsUnsub();
    if (ingredientsUnsub) ingredientsUnsub();
    if (eventsUnsub) eventsUnsub();
    if (unitSettingsUnsub) unitSettingsUnsub();
    if (unitPlatformsUnsub) unitPlatformsUnsub();
    if (analyticsUnsub) analyticsUnsub();
    if (expensesUnsub) expensesUnsub();
    if (inventoryUnsub) inventoryUnsub();
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

// ==========================================
// SETTINGS LOGIC
// ==========================================

const settingsEmailForm = document.getElementById('settings-email-form');
const settingsPwdForm = document.getElementById('settings-password-form');
const reauthForm = document.getElementById('reauth-form');

// Keep track of the pending action that requires re-auth
let pendingReauthAction = null;

if (settingsEmailForm) {
  settingsEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const newEmail = document.getElementById('settings-new-email').value.trim();
    
    const action = async () => {
      const btn = document.getElementById('btn-settings-email');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
        showToast('Verification link sent. Please check your new email to confirm.');
        document.getElementById('settings-new-email').value = '';
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          pendingReauthAction = action;
          document.getElementById('reauth-modal').classList.add('open');
        } else {
          showToast('Error: ' + err.message, true);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Verification Link';
      }
    };
    
    await action();
  });
}

if (settingsPwdForm) {
  settingsPwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const newPwd = document.getElementById('settings-new-password').value;
    const confirmPwd = document.getElementById('settings-confirm-password').value;
    const errorEl = document.getElementById('settings-password-error');
    errorEl.style.display = 'none';

    if (newPwd !== confirmPwd) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.style.display = 'block';
      return;
    }
    
    const action = async () => {
      const btn = document.getElementById('btn-settings-password');
      btn.disabled = true;
      btn.textContent = 'Updating...';
      try {
        await updatePassword(auth.currentUser, newPwd);
        showToast('Password updated successfully.');
        document.getElementById('settings-new-password').value = '';
        document.getElementById('settings-confirm-password').value = '';
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          pendingReauthAction = action;
          document.getElementById('reauth-modal').classList.add('open');
        } else {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    };
    
    await action();
  });
}

if (reauthForm) {
  reauthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwdInput = document.getElementById('reauth-password-input');
    const errorEl = document.getElementById('reauth-error');
    const btn = document.getElementById('btn-reauth-submit');
    
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, pwdInput.value);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      document.getElementById('reauth-modal').classList.remove('open');
      pwdInput.value = '';
      
      if (pendingReauthAction) {
        await pendingReauthAction();
        pendingReauthAction = null;
      }
    } catch (err) {
      errorEl.textContent = 'Incorrect password. Please try again.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify';
    }
  });
}


// ==========================================
// DATA INITIALIZATION & LISTENERS
// ==========================================

function initCRMData() {
  // 1. Listen to Settings
  settingsUnsub = onSnapshot(doc(db, 'settings', 'loyalty'), (docSnap) => {
    if (docSnap.exists()) {
      state.tiers = docSnap.data();
      document.getElementById('tier-silver').value = state.tiers.silver || 100;
      document.getElementById('tier-gold').value = state.tiers.gold || 300;
    }
    renderLoyalty();
    renderCustomers();
  });

  // 2. Listen to Reviews
  const rq = query(collection(db, 'reviews'), orderBy('date', 'desc'));
  reviewsUnsub = onSnapshot(rq, (snapshot) => {
    state.reviews = [];
    snapshot.forEach(d => {
      state.reviews.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() });
    });
    renderReviews();
  });

  // 3. Listen to Orders (builds state.orders and state.customers)
  const oq = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  ordersUnsub = onSnapshot(oq, (snapshot) => {
    state.orders = [];
    const custMap = {};

    snapshot.forEach(d => {
      const o = d.data();
      const oDate = o.createdAt?.toDate() || new Date();
      
      let parsedTotal = typeof o.total === 'string' ? parseFloat(o.total.replace('$', '')) : o.total;
      
      const order = {
        id: d.id,
        ...o,
        total: parsedTotal,
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

      if (o.status === 'completed') {
        custMap[phone].totalSpent += parsedTotal;
        custMap[phone].totalOrders += 1;
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
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  // 4. Listen to Catering Inquiries
  const cq = query(collection(db, 'catering_inquiries'), orderBy('createdAt', 'desc'));
  cateringUnsub = onSnapshot(cq, (snapshot) => {
    state.catering = [];
    snapshot.forEach(d => {
      state.catering.push({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date() });
    });
    renderCatering();
  });

  // 5. Load Pop-up Settings & TV Promo Settings
  loadPopupSettings();
  loadTvPromoSettings();

  // 6. Listen to Deals
  if (typeof initDealsListener === 'function') {
    dealsUnsub = initDealsListener();
  }

  // 7. Load Pickup Settings
  loadPickupSettings();

  // 8. Listen to Unit Economics Settings
  unitSettingsUnsub = onSnapshot(doc(db, 'unitEconomics_settings', 'config'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitSettings = { ...state.unitSettings, ...docSnap.data() };
    }
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  // 9. Listen to Unit Economics Platforms
  unitPlatformsUnsub = onSnapshot(doc(db, 'unitEconomics_platforms', 'rates'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitPlatforms = { ...state.unitPlatforms, ...docSnap.data() };
    }
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  // 10. Listen to Unit Economics Ingredients
  const ingredientsQuery = query(collection(db, 'unitEconomics_ingredients'), orderBy('name', 'asc'));
  ingredientsUnsub = onSnapshot(ingredientsQuery, (snapshot) => {
    state.ingredients = [];
    snapshot.forEach(d => state.ingredients.push({ id: d.id, ...d.data() }));
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  // 11. Listen to Unit Economics Events
  const eventsQuery = query(collection(db, 'unitEconomics_events'), orderBy('date', 'desc'));
  eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
    state.events = [];
    snapshot.forEach(d => state.events.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() }));
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  loadAnalytics();
  initEconomicsListeners();
}

async function loadTvPromoSettings() {
  onSnapshot(doc(db, 'settings', 'tv_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('tv-promo-active').checked = data.active || false;
      document.getElementById('tv-promo-text').value = data.text || '';
      toggleTvPromoEditor(data.active);
    }
  });
}

function toggleTvPromoEditor(isActive) {
  const editor = document.getElementById('tv-promo-editor');
  if (isActive) {
    editor.style.opacity = '1';
    editor.style.pointerEvents = 'auto';
  } else {
    editor.style.opacity = '0.5';
    editor.style.pointerEvents = 'none';
  }
}

const tvPromoCheckbox = document.getElementById('tv-promo-active');
const btnSaveTvPromo = document.getElementById('btn-save-tv-promo');

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

async function loadPopupSettings() {
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
}

const popupActiveCheckbox = document.getElementById('popup-active');
const popupEditor = document.getElementById('popup-editor');
const btnSavePopup = document.getElementById('btn-save-popup');

function togglePopupEditor(isActive) {
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

// ==========================================
// PICKUP SETTINGS & SCHEDULED ORDERS
// ==========================================
function loadPickupSettings() {
  onSnapshot(doc(db, 'settings', 'pickupConfig'), (docSnap) => {
    if (docSnap.exists()) {
      const config = docSnap.data();
      document.getElementById('pickup-base-prep').value = config.basePrepTimeMinutes || 15;
      document.getElementById('pickup-per-order').value = config.perOrderIncrementMinutes || 3;
      document.getElementById('pickup-max-wait').value = config.maxWaitMinutes || 60;
      document.getElementById('pickup-busy-offset').value = config.busyModeOffsetMinutes || 0;
      document.getElementById('pickup-min-lead').value = config.minLeadTimeMinutes || 20;
      document.getElementById('pickup-max-days').value = config.maxScheduleDaysAhead || 3;
      document.getElementById('pickup-slot-interval').value = config.slotIntervalMinutes || 15;
      document.getElementById('pickup-prep-buffer').value = config.prepBufferBeforeCloseMinutes || 30;
      if (config.businessHours) {
        document.getElementById('pickup-open-time').value = config.businessHours.open || '12:00';
        document.getElementById('pickup-close-time').value = config.businessHours.close || '22:30';
      }
    }
  });
}

document.getElementById('pickup-config-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Saving...';
  
  const config = {
    basePrepTimeMinutes: parseInt(document.getElementById('pickup-base-prep').value, 10),
    perOrderIncrementMinutes: parseInt(document.getElementById('pickup-per-order').value, 10),
    maxWaitMinutes: parseInt(document.getElementById('pickup-max-wait').value, 10),
    busyModeOffsetMinutes: parseInt(document.getElementById('pickup-busy-offset').value, 10) || 0,
    minLeadTimeMinutes: parseInt(document.getElementById('pickup-min-lead').value, 10),
    maxScheduleDaysAhead: parseInt(document.getElementById('pickup-max-days').value, 10),
    slotIntervalMinutes: parseInt(document.getElementById('pickup-slot-interval').value, 10),
    prepBufferBeforeCloseMinutes: parseInt(document.getElementById('pickup-prep-buffer').value, 10),
    businessHours: {
      open: document.getElementById('pickup-open-time').value,
      close: document.getElementById('pickup-close-time').value
    },
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'settings', 'pickupConfig'), config, { merge: true });
    showToast('Pickup settings saved!');
  } catch (err) {
    console.error('Error saving pickup settings', err);
    showToast('Error saving pickup settings', true);
  }
  btn.textContent = 'Save Pickup Settings';
});

function renderUpcomingScheduledOrders() {
  const tbody = document.getElementById('upcoming-scheduled-list');
  if (!tbody) return;

  // Filter orders
  const upcoming = state.orders.filter(o => 
    o.pickup && 
    o.pickup.type === 'scheduled' && 
    o.pickup.releasedToKitchen === false &&
    ['pending', 'preparing', 'RESERVED', 'PREPARED'].includes(o.status)
  );

  // Sort by requestedTime ascending
  upcoming.sort((a, b) => {
    const tA = a.pickup.requestedTime?.toDate() || new Date(9999,11,31);
    const tB = b.pickup.requestedTime?.toDate() || new Date(9999,11,31);
    return tA - tB;
  });

  if (upcoming.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--gray);">No upcoming scheduled orders.</td></tr>';
    return;
  }

  tbody.innerHTML = upcoming.map(o => {
    const requestedTimeStr = o.pickup.requestedTime?.toDate()
      ? o.pickup.requestedTime.toDate().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : 'N/A';
    
    const qty = o.items ? o.items.reduce((sum, item) => sum + item.qty, 0) : 0;
    
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td data-label="Requested Time" style="padding: 12px; font-weight: 600; color: var(--accent);">${requestedTimeStr}</td>
        <td data-label="Customer" style="padding: 12px; font-weight: 500;">${o.customerName || 'N/A'}</td>
        <td data-label="Total" style="padding: 12px;">$${o.total.toFixed(2)}</td>
        <td data-label="Items" style="padding: 12px;">${qty} items</td>
        <td data-label="Status" style="padding: 12px;">
          <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; background: rgba(255,255,255,0.1); color: var(--white); text-transform: uppercase;">
            ${o.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// FIREBASE LIVE ORDERS TAB
// ==========================================

function renderLiveOrders(snapshot) {
  ordersList.innerHTML = '';
  if (snapshot.empty) {
    ordersList.innerHTML = '<p style="color: var(--gray);">No orders found.</p>';
    return;
  }
  
  snapshot.forEach((docSnap) => {
    const order = docSnap.data();
    const orderId = docSnap.id;
    const date = order.createdAt ? order.createdAt.toDate().toLocaleString() : 'Just now';
    
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const statusClass = order.status === 'completed' ? 'status-completed' : (order.status === 'cancelled' ? 'status-cancelled' : 'status-pending');
    
    const itemsHtml = (order.items || []).map(item => `
      <div style="display: flex; justify-content: space-between;">
        <span>${item.qty}x ${item.name}</span>
        <span>$${(item.price * item.qty).toFixed(2)}</span>
      </div>
    `).join('');
    
    card.innerHTML = `
      <div class="order-header">
        <div>
          <div class="order-title">${order.customerName} <span style="font-size: 12px; color: var(--gray); font-weight: normal; margin-left: 8px;">${order.customerPhone || ''}</span></div>
          <div class="order-meta">${date} &middot; via ${order.method || 'Web'}</div>
        </div>
        <div class="status-badge ${statusClass}">${order.status}</div>
      </div>
      <div class="order-items">
        ${itemsHtml}
      </div>
      <div class="order-total">
        Total: ${typeof order.total === 'number' ? '$' + order.total.toFixed(2) : order.total}
      </div>
      <div class="order-actions">
        ${order.status === 'pending' ? `<button class="btn-outline btn-small" onclick="updateOrderStatus('${orderId}', 'completed')">Mark Completed</button>
                                        <button class="btn-outline btn-small" onclick="updateOrderStatus('${orderId}', 'cancelled')" style="border-color: var(--accent); color: var(--accent);">Cancel</button>` : ''}
      </div>
    `;
    ordersList.appendChild(card);
  });
}

window.updateOrderStatus = async (id, newStatus) => {
  try {
    await updateDoc(doc(db, 'orders', id), {
      status: newStatus
    });
    showToast(`Order marked as ${newStatus}`);
  } catch (error) {
    console.error("Error updating order:", error);
    alert('Failed to update order status.');
  }
};


// ==========================================
// FIREBASE MENU MANAGEMENT
// ==========================================

const addMenuForm = document.getElementById("add-menu-form");
const adminMenuList = document.getElementById("admin-menu-list");
const editMenuModal = document.getElementById("edit-menu-modal");
const editMenuForm = document.getElementById("edit-menu-form");

// Image upload label listeners
const addMenuUploadInput = document.getElementById('menu-img-upload');
const addMenuFilename = document.getElementById('menu-img-filename');
if (addMenuUploadInput && addMenuFilename) {
  addMenuUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      addMenuFilename.textContent = e.target.files[0].name;
    } else {
      addMenuFilename.textContent = 'No file chosen';
    }
  });
}

const editMenuUploadInput = document.getElementById('edit-menu-img-upload');
const editMenuFilename = document.getElementById('edit-menu-img-filename');
if (editMenuUploadInput && editMenuFilename) {
  editMenuUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      editMenuFilename.textContent = e.target.files[0].name;
    } else {
      editMenuFilename.textContent = 'No file chosen';
    }
  });
}

// Compress and resize image to exactly 800x450 (16:9) with padding
async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const targetWidth = 800;
    const targetHeight = 450;
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // Calculate scaling factor to fit within 1200x675
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
        
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        
        const offsetX = (targetWidth - scaledWidth) / 2;
        const offsetY = (targetHeight - scaledHeight) / 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        // Fill background with dark theme color
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Draw the image centered
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/webp', quality);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

// Upload helper function
async function uploadImageFile(file) {
  try {
    const optimizedFile = await compressImage(file);
    const storageRef = ref(storage, `menu-images/${Date.now()}_${optimizedFile.name}`);
    const snapshot = await uploadBytes(storageRef, optimizedFile);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.error("Image compression failed, falling back to original:", err);
    const storageRef = ref(storage, `menu-images/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  }
}

// Options Builder Helpers
function getBuilderOptions(prefix) {
  const options = [];
  const container = document.getElementById(`${prefix}-container`);
  if (!container) return options;
  const rows = container.querySelectorAll('.option-row');
  rows.forEach(row => {
    const name = row.querySelector('.opt-name').value.trim();
    const price = parseFloat(row.querySelector('.opt-price').value);
    if (name) {
      options.push({ name, price: isNaN(price) ? 0 : price });
    }
  });
  return options;
}

function createOptionRow(prefix, type, name = '', price = '') {
  const container = document.getElementById(`${prefix}-container`);
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'option-row';
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.innerHTML = `
    <input type="text" class="opt-name" placeholder="${type} Name" value="${name}" style="flex: 2; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
    <input type="number" step="0.01" class="opt-price" placeholder="Price ($)" value="${price}" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
    <button type="button" class="btn-outline" onclick="this.parentElement.remove()" style="padding: 0 12px; color: #ff5252; border-color: #ff5252;">×</button>
  `;
  container.appendChild(div);
}

document.getElementById('add-variant-btn')?.addEventListener('click', () => createOptionRow('variants', 'Variant'));
document.getElementById('add-addon-btn')?.addEventListener('click', () => createOptionRow('addons', 'Add-On'));
document.getElementById('edit-variant-btn')?.addEventListener('click', () => createOptionRow('edit-variants', 'Variant'));
document.getElementById('edit-addon-btn')?.addEventListener('click', () => createOptionRow('edit-addons', 'Add-On'));

if (addMenuForm) {
  addMenuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = addMenuForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;

    const name = document.getElementById("menu-name").value;
    const name_fa = document.getElementById("menu-name_fa").value;
    const price = parseFloat(document.getElementById("menu-price").value);
    const desc = document.getElementById("menu-desc").value;
    const desc_fa = document.getElementById("menu-desc_fa").value;
    const category = document.getElementById("menu-category").value;
    const mealLinkId = document.getElementById("menu-meal-link").value;
    let img = document.getElementById("menu-img").value;
    const featured = document.getElementById("menu-featured").checked;
    
    try {
      const fileInput = document.getElementById('menu-img-upload');
      if (fileInput.files.length > 0) {
        submitBtn.textContent = 'Uploading Image...';
        img = await uploadImageFile(fileInput.files[0]);
      }

      const variants = getBuilderOptions('variants');
      const addOns = getBuilderOptions('addons');

      await addDoc(collection(db, "menu"), { name, name_fa, price, desc, desc_fa, category, img, featured: !!featured, variants, addOns });
      document.getElementById("menu-status").style.display = "block";
      addMenuForm.reset();
      document.getElementById('variants-container').innerHTML = '';
      document.getElementById('addons-container').innerHTML = '';
      if (addMenuFilename) addMenuFilename.textContent = 'No file chosen';
      setTimeout(() => { document.getElementById("menu-status").style.display = "none"; }, 3000);
      loadMenuAdmin();
    } catch (err) {
      console.error("Error adding menu item: ", err);
      alert("Failed to add menu item.");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

async function populateMealLinks() {
  const addSelect = document.getElementById('menu-meal-link');
  const editSelect = document.getElementById('edit-menu-meal-link');
  if (!addSelect && !editSelect) return;
  
  const q = query(collection(db, "menu"));
  const snapshot = await getDocs(q);
  const meals = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.category === 'bigi street meals') {
      meals.push({ id: doc.id, name: data.name });
    }
  });
  
  meals.sort((a, b) => a.name.localeCompare(b.name));
  
  const optionsHtml = '<option value="">No Meal Upgrade (or auto-match)</option>' + 
    meals.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    
  if (addSelect) addSelect.innerHTML = optionsHtml;
  if (editSelect) editSelect.innerHTML = optionsHtml;
}

document.addEventListener("DOMContentLoaded", () => {
  populateMealLinks();
});

async function loadMenuAdmin() {
  if (!adminMenuList) return;
  adminMenuList.innerHTML = `
    <tr>
      <td colspan="5">
        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
          <div style="height: 48px; width: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--bg) 8%, var(--border) 18%, var(--bg) 33%); background-size: 1000px 100%; animation: skeleton-shimmer 2s infinite linear;"></div>
          <div style="height: 48px; width: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--bg) 8%, var(--border) 18%, var(--bg) 33%); background-size: 1000px 100%; animation: skeleton-shimmer 2s infinite linear;"></div>
          <div style="height: 48px; width: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--bg) 8%, var(--border) 18%, var(--bg) 33%); background-size: 1000px 100%; animation: skeleton-shimmer 2s infinite linear;"></div>
        </div>
      </td>
    </tr>
  `;
  try {
    const snapshot = await getDocs(collection(db, "menu"));
    if (snapshot.empty) {
      adminMenuList.innerHTML = "<p style=\"color: var(--gray);\">No menu items found.</p>";
      return;
    }
    let html = "";
    window.adminMenuData = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const itemId = docSnap.id;
      window.adminMenuData[itemId] = data;
      const descText = data.desc || data.description || '';
      
      html += `
        <div style="background: var(--bg); border: 1px solid var(--border); padding: 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 16px; color: var(--white);">${data.name}</strong>
              ${data.featured ? '<span style="background: rgba(255,215,0,0.15); color: #FFD700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,215,0,0.3); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Featured</span>' : ''}
            </div>
            <div style="color: var(--gray); font-size: 12px; margin-bottom: 6px;">
              $${typeof data.price === "number" ? data.price.toFixed(2) : data.price} • <span style="text-transform: capitalize;">${data.category}</span>
            </div>
            <div style="color: #888; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${descText}
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-outline btn-small" onclick="openEditMenuModal('${itemId}')" style="padding: 6px 12px; font-size: 12px;">Edit</button>
            <button class="btn-outline btn-small" onclick="deleteMenuItem('${itemId}')" style="padding: 6px 12px; font-size: 12px; border-color: rgba(255,69,0,0.4); color: var(--accent);">Delete</button>
          </div>
        </div>
      `;
    });
    adminMenuList.innerHTML = html;
    if (typeof populateDealSelects === 'function') populateDealSelects();
    if (typeof renderEconomics === 'function') renderEconomics();
  } catch (err) {
    console.error("Error loading menu: ", err);
    adminMenuList.innerHTML = "<p style=\"color: var(--accent);\">Failed to load menu.</p>";
  }
}

// Global Edit/Delete Functions for Menu
window.openEditMenuModal = (id) => {
  const data = window.adminMenuData[id];
  if (!editMenuModal || !data) return;
  document.getElementById("edit-menu-id").value = id;
  document.getElementById("edit-menu-name").value = data.name || "";
  document.getElementById("edit-menu-name_fa").value = data.name_fa || "";
  document.getElementById("edit-menu-price").value = data.price || "";
  document.getElementById("edit-menu-category").value = data.category || "platters";
  if (document.getElementById("edit-menu-meal-link")) {
    document.getElementById("edit-menu-meal-link").value = data.mealLinkId || "";
  }
  document.getElementById("edit-menu-img").value = data.img || data.image || data.imageUrl || "";
  document.getElementById("edit-menu-desc").value = data.desc || data.description || "";
  document.getElementById("edit-menu-desc_fa").value = data.desc_fa || "";
  document.getElementById("edit-menu-featured").checked = !!data.featured;
  
  const vContainer = document.getElementById('edit-variants-container');
  if (vContainer) {
    vContainer.innerHTML = '';
    (data.variants || []).forEach(v => createOptionRow('edit-variants', 'Variant', v.name, v.price));
  }
  
  const aContainer = document.getElementById('edit-addons-container');
  if (aContainer) {
    aContainer.innerHTML = '';
    (data.addOns || []).forEach(a => createOptionRow('edit-addons', 'Add-On', a.name, a.price));
  }
  
  editMenuModal.classList.add("open");
};

window.closeEditMenuModal = () => {
  if (editMenuModal) {
    editMenuModal.classList.remove("open");
  }
};

window.deleteMenuItem = async (id) => {
  const data = window.adminMenuData[id];
  if (!data) return;
  if (confirm(`Are you sure you want to delete "${data.name}" from the menu?`)) {
    try {
      await deleteDoc(doc(db, "menu", id));
      loadMenuAdmin();
    } catch (err) {
      console.error("Error deleting menu item: ", err);
      alert("Failed to delete menu item.");
    }
  }
};

if (editMenuForm) {
  editMenuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = editMenuForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    const id = document.getElementById("edit-menu-id").value;
    const name = document.getElementById("edit-menu-name").value;
    const name_fa = document.getElementById("edit-menu-name_fa").value;
    const price = parseFloat(document.getElementById("edit-menu-price").value);
    const category = document.getElementById("edit-menu-category").value;
    const mealLinkId = document.getElementById("edit-menu-meal-link").value;
    let img = document.getElementById("edit-menu-img").value;
    const desc = document.getElementById("edit-menu-desc").value;
    const desc_fa = document.getElementById("edit-menu-desc_fa").value;
    const featured = document.getElementById("edit-menu-featured").checked;
    
    try {
      const fileInput = document.getElementById('edit-menu-img-upload');
      if (fileInput.files.length > 0) {
        submitBtn.textContent = 'Uploading Image...';
        img = await uploadImageFile(fileInput.files[0]);
      }

      const variants = getBuilderOptions('edit-variants');
      const addOns = getBuilderOptions('edit-addons');

      await updateDoc(doc(db, "menu", id), {
        name,
        name_fa,
        price,
        category,
        mealLinkId,
        img,
        desc,
        desc_fa,
        featured: !!featured,
        variants,
        addOns
      });
      closeEditMenuModal();
      loadMenuAdmin();
    } catch (err) {
      console.error("Error updating menu item: ", err);
      alert("Failed to update menu item.");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ==========================================
// CRM UI RENDERS & HELPERS
// ==========================================

function getTier(spent) {
  if (spent >= state.tiers.gold) return 'Gold';
  if (spent >= state.tiers.silver) return 'Silver';
  return 'Bronze';
}

function getTierColor(tier) {
  if (tier === 'Gold') return '#FFD700';
  if (tier === 'Silver') return '#C0C0C0';
  return '#CD7F32';
}

function renderDashboard() {
  const completedOrders = state.orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const aov = completedOrders.length > 0 ? (totalRevenue / completedOrders.length) : 0;
  const repeatCustomers = state.customers.filter(c => c.totalOrders > 1).length;
  const repeatRate = state.customers.length > 0 ? (repeatCustomers / state.customers.length) * 100 : 0;

  document.getElementById('dash-total-customers').textContent = state.customers.length;
  document.getElementById('dash-total-orders').textContent = state.orders.length;
  document.getElementById('dash-aov').textContent = `$${aov.toFixed(2)}`;
  document.getElementById('dash-repeat-rate').textContent = `${Math.round(repeatRate)}%`;

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

function renderCustomers() {
  const tbody = document.getElementById('customers-table-body');
  if(!tbody) return;
  const term = document.getElementById('customer-search').value.toLowerCase();
  
  tbody.innerHTML = '';
  state.customers
    .filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term))
    .forEach(c => {
      const tier = getTier(c.totalSpent);
      const color = getTierColor(tier);
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td data-label="Name"><strong>${c.name}</strong></td>
        <td data-label="Phone">${c.phone}</td>
        <td data-label="Spent">$${c.totalSpent.toFixed(2)}</td>
        <td data-label="Orders">${c.totalOrders}</td>
        <td data-label="Tier"><span class="crm-badge" style="background: ${color}33; color: ${color}; border-color: ${color};">${tier}</span></td>
      `;
      tr.addEventListener('click', () => openCustomerDetail(c));
      tbody.appendChild(tr);
    });
}

window.openCustomerDetail = (cust) => {
  document.getElementById('slide-cust-name').textContent = cust.name;
  const content = document.getElementById('slide-cust-content');
  const tier = getTier(cust.totalSpent);
  
  content.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; gap: 10px;">
      <a href="tel:${cust.phone.replace(/\D/g,'')}" class="btn-primary btn-small" style="text-decoration: none;">Send Message / Call</a>
    </div>
    
    <div class="crm-panel mb-m">
      <h3 style="margin-bottom: 12px;">Details</h3>
      <p><strong>Phone:</strong> ${cust.phone}</p>
      <p><strong>Total Spent:</strong> $${cust.totalSpent.toFixed(2)}</p>
      <p><strong>Tier:</strong> ${tier}</p>
      <p><strong>Last Visit:</strong> ${cust.lastVisit ? cust.lastVisit.toLocaleDateString() : 'N/A'}</p>
    </div>
  `;
  document.getElementById('customer-slide-over').classList.add('open');
};

window.closeCustomerSlideOver = () => {
  document.getElementById('customer-slide-over').classList.remove('open');
};

function renderAllOrders() {
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
      tr.addEventListener('click', () => openMockOrderDetail(o));
      tbody.appendChild(tr);
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

function renderReviews() {
  const container = document.getElementById('reviews-container');
  if(!container) return;
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
const addReviewForm = document.getElementById('add-review-form');
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

function renderLoyalty() {
  const grid = document.getElementById('loyalty-tiers-grid');
  if(!grid) return;
  let bronze = 0, silver = 0, gold = 0;
  state.customers.forEach(c => {
    const tier = getTier(c.totalSpent);
    if(tier === 'Gold') gold++;
    else if(tier === 'Silver') silver++;
    else bronze++;
  });

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
  `;
}

const saveTiersBtn = document.getElementById('btn-save-tiers');
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
const customerSearch = document.getElementById('customer-search');
if (customerSearch) customerSearch.addEventListener('input', renderCustomers);

const orderSearch = document.getElementById('order-search');
if (orderSearch) orderSearch.addEventListener('input', renderAllOrders);

const orderStatusFilter = document.getElementById('order-status-filter');
if (orderStatusFilter) orderStatusFilter.addEventListener('change', renderAllOrders);

const reviewStatusFilter = document.getElementById('review-status-filter');
if (reviewStatusFilter) reviewStatusFilter.addEventListener('change', renderReviews);

// ==========================================
// CATERING
// ==========================================
function renderCatering() {
  const tbody = document.getElementById('catering-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (state.catering.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray);">No catering inquiries yet.</td></tr>';
    return;
  }
  
  state.catering.forEach(inquiry => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => showCateringDetails(inquiry);
    
    tr.innerHTML = `
      <td data-label="Added">${inquiry.createdAt.toLocaleDateString()}</td>
      <td data-label="Customer"><strong>${inquiry.name}</strong><br><small style="color: var(--gray);">${inquiry.phone}</small></td>
      <td data-label="Event Date">${inquiry.date}</td>
      <td data-label="Guests">${inquiry.guests}</td>
      <td data-label="Status"><span class="status-badge ${inquiry.status === 'new' ? 'status-pending' : 'status-completed'}">${inquiry.status.toUpperCase()}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

window.showCateringDetails = (inquiry) => {
  const modal = document.getElementById('catering-modal');
  const title = document.getElementById('modal-catering-title');
  const content = document.getElementById('modal-catering-content');
  
  if (!modal || !title || !content) return;
  
  title.textContent = `Inquiry: ${inquiry.name}`;
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
      <div>
        <div style="font-size: 11px; color: var(--gray); text-transform: uppercase;">Event Date</div>
        <div>${inquiry.date}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--gray); text-transform: uppercase;">Guests</div>
        <div>${inquiry.guests}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--gray); text-transform: uppercase;">Email</div>
        <div><a href="mailto:${inquiry.email}" style="color: var(--accent);">${inquiry.email}</a></div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--gray); text-transform: uppercase;">Phone</div>
        <div><a href="tel:${inquiry.phone}" style="color: var(--accent);">${inquiry.phone}</a></div>
      </div>
    </div>
    <div style="margin-bottom: 24px;">
      <div style="font-size: 11px; color: var(--gray); text-transform: uppercase; margin-bottom: 4px;">Details</div>
      <div style="background: var(--surface); padding: 12px; border-radius: 4px;">${inquiry.details}</div>
    </div>
    <div style="display: flex; gap: 12px; margin-top: 24px; border-top: 1px solid var(--border); padding-top: 16px;">
      <button class="btn-primary" onclick="updateCateringStatus('${inquiry.id}', 'contacted')">Mark as Contacted</button>
      <button class="btn-outline" onclick="updateCateringStatus('${inquiry.id}', 'resolved')">Mark as Resolved</button>
    </div>
  `;
  modal.style.display = 'flex';
};

window.closeCateringModal = () => {
  const modal = document.getElementById('catering-modal');
  if (modal) modal.style.display = 'none';
};

window.updateCateringStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, 'catering_inquiries', id), { status });
    showToast('Inquiry status updated.');
    closeCateringModal();
  } catch (error) {
    console.error("Error updating catering status", error);
    showToast('Failed to update status.');
  }
};

function showToast(message) {
  const container = document.getElementById('crm-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================
// UNIFIED NAVIGATION
// ==========================================

document.querySelectorAll('.crm-nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.crm-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.crm-view').forEach(p => p.style.display = 'none');
    
    const targetId = btn.dataset.target;
    btn.classList.add('active');
    document.getElementById(targetId).style.display = 'block';
    
    // Close mobile menu if open
    if (window.innerWidth <= 768 && typeof toggleMobileMenu === 'function') {
      const crmNav = document.querySelector('.crm-nav');
      if (crmNav && crmNav.classList.contains('open')) {
        toggleMobileMenu();
      }
    }
  });
});

// ==========================================
// DEALS & COMBOS MANAGER
// ==========================================

window.populateDealSelects = () => {
  const condItemsDiv = document.getElementById('deal-cond-items');
  const condCatsDiv = document.getElementById('deal-cond-categories');
  const rewardItemsDiv = document.getElementById('deal-reward-items');
  
  if (!condItemsDiv || !condCatsDiv || !rewardItemsDiv) return;
  if (!window.adminMenuData) return;

  const items = Object.entries(window.adminMenuData).map(([id, data]) => ({ id, name: data.name, category: data.category }));
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  // Condition Items Checklist
  condItemsDiv.innerHTML = items.map(item => `
    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--gray); user-select: none;">
      <input type="checkbox" name="cond-item-checkbox" value="${item.id}" style="accent-color: var(--accent);">
      <span>${item.name}</span>
    </label>
  `).join('');

  // Reward Items Checklist
  rewardItemsDiv.innerHTML = items.map(item => `
    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--gray); user-select: none;">
      <input type="checkbox" name="reward-item-checkbox" value="${item.id}" style="accent-color: var(--accent);">
      <span>${item.name}</span>
    </label>
  `).join('');

  // Condition Categories Checklist
  condCatsDiv.innerHTML = categories.map(cat => `
    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--gray); user-select: none;">
      <input type="checkbox" name="cond-cat-checkbox" value="${cat}" style="accent-color: var(--accent);">
      <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
    </label>
  `).join('');
};

function formatDateForDatetimeLocal(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

window.initDealsListener = () => {
  const container = document.getElementById('admin-deals-list');
  const filterSelect = document.getElementById('deal-filter');
  
  const unsub = onSnapshot(collection(db, 'deals'), (snapshot) => {
    state.deals = [];
    snapshot.forEach(d => {
      state.deals.push({ id: d.id, ...d.data() });
    });
    
    // Sort by priority desc, then title asc
    state.deals.sort((a, b) => {
      const pDiff = (b.priority || 0) - (a.priority || 0);
      if (pDiff !== 0) return pDiff;
      return (a.title || '').localeCompare(b.title || '');
    });
    
    renderDealsList();
  });

  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      renderDealsList();
    });
  }

  return unsub;
};

function renderDealsList() {
  const container = document.getElementById('admin-deals-list');
  const filter = document.getElementById('deal-filter')?.value || 'all';
  if (!container) return;

  const filteredDeals = state.deals.filter(deal => {
    if (filter === 'all') return true;
    
    // Check timing/active status
    const now = new Date();
    const start = deal.startDate ? deal.startDate.toDate() : null;
    const end = deal.endDate ? deal.endDate.toDate() : null;
    const isScheduled = start && now < start;
    const isExpired = end && now > end;
    const isCurrentlyActive = deal.active && !isScheduled && !isExpired;

    if (filter === 'active') return isCurrentlyActive;
    if (filter === 'inactive') return !isCurrentlyActive;
    return true;
  });

  if (filteredDeals.length === 0) {
    container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px 0;">No promotions found.</p>';
    return;
  }

  container.innerHTML = filteredDeals.map(deal => {
    const now = new Date();
    const start = deal.startDate ? deal.startDate.toDate() : null;
    const end = deal.endDate ? deal.endDate.toDate() : null;
    const isScheduled = start && now < start;
    const isExpired = end && now > end;
    
    let statusBadge = '';
    if (!deal.active) {
      statusBadge = '<span class="status-badge" style="background: rgba(244,67,54,0.15); color: #f44336; border: 1px solid rgba(244,67,54,0.3);">Inactive</span>';
    } else if (isScheduled) {
      statusBadge = '<span class="status-badge" style="background: rgba(255,193,7,0.15); color: #ffc107; border: 1px solid rgba(255,193,7,0.3);">Scheduled</span>';
    } else if (isExpired) {
      statusBadge = '<span class="status-badge" style="background: rgba(158,158,158,0.15); color: #9e9e9e; border: 1px solid rgba(158,158,158,0.3);">Expired</span>';
    } else {
      statusBadge = '<span class="status-badge" style="background: rgba(76,175,80,0.15); color: #4caf50; border: 1px solid rgba(76,175,80,0.3);">Active</span>';
    }

    const typeLabels = {
      percent_off: 'Percent Off',
      fixed_off: 'Fixed Off',
      bogo: 'BOGO (Buy X Get Y)',
      free_item: 'Free Item',
      bundle_price: 'Bundle Price',
      combo: 'Combo Deal'
    };

    // Format conditions
    let condHtml = '';
    if (deal.conditions?.appliesToWholeOrder) {
      condHtml += '<li>Applies to entire order</li>';
      if (deal.conditions?.minQty > 0) {
        condHtml += `<li>Min order amount: $${deal.conditions.minQty.toFixed(2)}</li>`;
      }
    } else {
      if (deal.conditions?.minQty > 0) {
        condHtml += `<li>Min items required: ${deal.conditions.minQty}</li>`;
      }
      if (deal.conditions?.itemIds?.length > 0) {
        const names = deal.conditions.itemIds.map(id => window.adminMenuData?.[id]?.name || id);
        condHtml += `<li>Req. items: ${names.join(', ')}</li>`;
      }
      if (deal.conditions?.categoryIds?.length > 0) {
        condHtml += `<li>Req. categories: ${deal.conditions.categoryIds.join(', ')}</li>`;
      }
    }

    // Format rewards
    let rewardHtml = '';
    if (deal.reward?.discountType === 'percent') {
      rewardHtml = `${deal.reward.value}% off`;
    } else if (deal.reward?.discountType === 'fixed') {
      rewardHtml = `$${deal.reward.value.toFixed(2)} off`;
    } else if (deal.reward?.discountType === 'freeItem') {
      const names = deal.reward.rewardItemIds?.map(id => window.adminMenuData?.[id]?.name || id) || [];
      rewardHtml = `Free ${deal.reward.rewardQty}x ${names.join(', ') || 'item'}`;
    } else if (deal.reward?.discountType === 'fixedBundlePrice') {
      rewardHtml = `Bundle package price: $${deal.reward.value.toFixed(2)}`;
    }

    return `
      <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 16px; color: var(--white);">${deal.title}</strong>
              ${statusBadge}
            </div>
            <span style="font-size: 12px; color: var(--gray); text-transform: uppercase; font-family: 'Barlow Condensed'; font-weight: 600; letter-spacing: 0.5px;">
              ${typeLabels[deal.type] || deal.type}
              ${deal.badge ? ` • Badge: "${deal.badge}"` : ''}
            </span>
          </div>
          <span style="font-size: 12px; background: var(--surface); color: var(--gray); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; font-weight: 600;">
            Priority: ${deal.priority || 0}
          </span>
        </div>

        <p style="color: var(--white); font-size: 13px; line-height: 1.4; margin: 0;">${deal.description}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--surface); border: 1px solid var(--border); padding: 10px; border-radius: 4px; font-size: 12px;">
          <div>
            <span style="color: var(--accent); font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase; font-family: 'Barlow Condensed';">Conditions</span>
            <ul style="margin: 0; padding-left: 16px; color: var(--gray); display: flex; flex-direction: column; gap: 2px;">
              ${condHtml || '<li>No specific conditions</li>'}
            </ul>
          </div>
          <div>
            <span style="color: var(--accent); font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase; font-family: 'Barlow Condensed';">Reward</span>
            <span style="color: var(--white); font-weight: 600; font-size: 13px;">${rewardHtml}</span>
            <div style="color: var(--gray); font-size: 11px; margin-top: 4px;">
              Stackable: ${deal.stackable ? 'Yes' : 'No'}
              ${deal.usageLimitPerOrder ? ` • Limit: ${deal.usageLimitPerOrder} per order` : ''}
            </div>
          </div>
        </div>

        <div style="font-size: 11px; color: var(--gray);">
          ${start || end ? `⏰ Scheduled: ${start ? start.toLocaleString() : 'Anytime'} to ${end ? end.toLocaleString() : 'Forever'}` : '⏰ Always active'}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 4px;">
          <button class="btn-outline btn-small" onclick="toggleDealActive('${deal.id}', ${deal.active})" style="padding: 6px 12px; font-size: 11px;">
            ${deal.active ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-outline btn-small" onclick="editDeal('${deal.id}')" style="padding: 6px 12px; font-size: 11px;">Edit</button>
          <button class="btn-outline btn-small" onclick="deleteDeal('${deal.id}')" style="padding: 6px 12px; font-size: 11px; border-color: rgba(255,69,0,0.4); color: var(--accent);">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleDealActive = async (id, currentActive) => {
  try {
    await updateDoc(doc(db, 'deals', id), { active: !currentActive });
    showToast('Promotion status updated.');
  } catch (error) {
    console.error("Error toggling deal status", error);
    showToast('Failed to update promotion status.', true);
  }
};

window.deleteDeal = async (id) => {
  if (!confirm('Are you sure you want to delete this promotion? This action cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'deals', id));
    showToast('Promotion deleted successfully.');
  } catch (error) {
    console.error("Error deleting deal", error);
    showToast('Failed to delete promotion.', true);
  }
};

window.editDeal = (id) => {
  const deal = state.deals.find(d => d.id === id);
  if (!deal) return;
  
  // Set basic form values
  document.getElementById('deal-id').value = deal.id;
  document.getElementById('deal-title').value = deal.title || '';
    document.getElementById('deal-promo-code').value = deal.promoCode || '';
  document.getElementById('deal-badge').value = deal.badge || '';
  document.getElementById('deal-desc').value = deal.description || '';
  document.getElementById('deal-type').value = deal.type || 'percent_off';
  document.getElementById('deal-priority').value = deal.priority || 0;
  document.getElementById('deal-limit').value = deal.usageLimitPerOrder || '';
  
  document.getElementById('deal-active').checked = !!deal.active;
  document.getElementById('deal-showonsite').checked = !!deal.showOnSite;
  document.getElementById('deal-stackable').checked = !!deal.stackable;

  document.getElementById('deal-start').value = formatDateForDatetimeLocal(deal.startDate);
  document.getElementById('deal-end').value = formatDateForDatetimeLocal(deal.endDate);

  // Set Conditions
  document.getElementById('deal-cond-order').checked = !!deal.conditions?.appliesToWholeOrder;
  document.getElementById('deal-cond-qty').value = deal.conditions?.minQty || 0;

  // Set checkbox lists
  const condItemCheckboxes = document.querySelectorAll('input[name="cond-item-checkbox"]');
  const condCatCheckboxes = document.querySelectorAll('input[name="cond-cat-checkbox"]');
  const rewardItemCheckboxes = document.querySelectorAll('input[name="reward-item-checkbox"]');

  const condItemIds = deal.conditions?.itemIds || [];
  condItemCheckboxes.forEach(cb => {
    cb.checked = condItemIds.includes(cb.value);
  });

  const condCategoryIds = deal.conditions?.categoryIds || [];
  condCatCheckboxes.forEach(cb => {
    cb.checked = condCategoryIds.includes(cb.value);
  });

  // Set Rewards
  document.getElementById('deal-reward-type').value = deal.reward?.discountType || 'percent';
  document.getElementById('deal-reward-val').value = deal.reward?.value || 0;
  document.getElementById('deal-reward-qty').value = deal.reward?.rewardQty || 1;

  const rewardItemIds = deal.reward?.rewardItemIds || [];
  rewardItemCheckboxes.forEach(cb => {
    cb.checked = rewardItemIds.includes(cb.value);
  });

  // Toggle buttons
  document.getElementById('deal-form-title').textContent = `Edit Deal: ${deal.title}`;
  document.getElementById('deal-save-btn').textContent = 'Update Promotion';
  document.getElementById('deal-cancel-btn').style.display = 'block';

  // Scroll to form
  document.getElementById('deals-view').scrollIntoView({ behavior: 'smooth' });
};

// Form Reset / Cancel Edit
const dealForm = document.getElementById('deal-form');
const dealCancelBtn = document.getElementById('deal-cancel-btn');

const resetDealForm = () => {
  if (dealForm) dealForm.reset();
  document.getElementById('deal-id').value = '';
  document.getElementById('deal-form-title').textContent = 'Create New Deal';
  document.getElementById('deal-save-btn').textContent = 'Save Promotion';
  if (dealCancelBtn) dealCancelBtn.style.display = 'none';

  // Clear checkboxes
  document.querySelectorAll('input[name="cond-item-checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="cond-cat-checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="reward-item-checkbox"]').forEach(cb => cb.checked = false);
};

if (dealCancelBtn) {
  dealCancelBtn.addEventListener('click', resetDealForm);
}

// Deal Form Submit
if (dealForm) {
  dealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dealId = document.getElementById('deal-id').value;
    const saveBtn = document.getElementById('deal-save-btn');
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    // Parse input fields
    const title = document.getElementById('deal-title').value;
    const badge = document.getElementById('deal-badge').value;
    const description = document.getElementById('deal-desc').value;
    const type = document.getElementById('deal-type').value;
    const priority = parseInt(document.getElementById('deal-priority').value) || 0;
    const limitVal = document.getElementById('deal-limit').value;
    const usageLimitPerOrder = limitVal ? parseInt(limitVal) : null;
    
    const active = document.getElementById('deal-active').checked;
    const showOnSite = document.getElementById('deal-showonsite').checked;
    const stackable = document.getElementById('deal-stackable').checked;

    const startVal = document.getElementById('deal-start').value;
    const startDate = startVal ? Timestamp.fromDate(new Date(startVal)) : null;
    
    const endVal = document.getElementById('deal-end').value;
    const endDate = endVal ? Timestamp.fromDate(new Date(endVal)) : null;

    // Parse conditions
    const appliesToWholeOrder = document.getElementById('deal-cond-order').checked;
    const minQty = parseFloat(document.getElementById('deal-cond-qty').value) || 0;
    
    const condItemIds = [];
    document.querySelectorAll('input[name="cond-item-checkbox"]:checked').forEach(cb => {
      condItemIds.push(cb.value);
    });

    const condCategoryIds = [];
    document.querySelectorAll('input[name="cond-cat-checkbox"]:checked').forEach(cb => {
      condCategoryIds.push(cb.value);
    });

    // Parse rewards
    const discountType = document.getElementById('deal-reward-type').value;
    const value = parseFloat(document.getElementById('deal-reward-val').value) || 0;
    const rewardQty = parseInt(document.getElementById('deal-reward-qty').value) || 1;

    const rewardItemIds = [];
    document.querySelectorAll('input[name="reward-item-checkbox"]:checked').forEach(cb => {
      rewardItemIds.push(cb.value);
    });

    const dealDoc = {
      title: title.trim(),
      badge: badge.trim(),
      description: description.trim(),
      type,
      active,
      showOnSite,
      startDate,
      endDate,
      priority,
      stackable,
      usageLimitPerOrder,
      conditions: {
        appliesToWholeOrder,
        minQty,
        itemIds: condItemIds,
        categoryIds: condCategoryIds
      },
      reward: {
        discountType,
        value,
        rewardQty,
        rewardItemIds
      },
      updatedAt: serverTimestamp()
    };

    try {
      if (dealId) {
        await setDoc(doc(db, 'deals', dealId), dealDoc, { merge: true });
        showToast('Promotion updated successfully!');
      } else {
        await addDoc(collection(db, 'deals'), dealDoc);
        showToast('Promotion created successfully!');
      }
      resetDealForm();
    } catch (err) {
      console.error('Error saving deal:', err);
      showToast('Failed to save promotion.', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = dealId ? 'Update Promotion' : 'Save Promotion';
    }
  });
}

// ==========================================
// UNIT ECONOMICS & PROFITABILITY
// ==========================================

window.switchEconomicsTab = (tabId) => {
  ['menu', 'profit', 'ingredients', 'labor', 'delivery'].forEach(id => {
    document.getElementById(`eco-tab-${id}`).style.display = 'none';
    document.getElementById(`btn-eco-${id}`).classList.remove('active');
  });
  document.getElementById(`eco-tab-${tabId}`).style.display = 'block';
  document.getElementById(`btn-eco-${tabId}`).classList.add('active');
  
  if (tabId === 'profit') {
    renderEconomicsProfit();
  }
};

window.renderEconomics = () => {
  if (!window.adminMenuData) return; // Wait for menu to load
  
  renderEconomicsDashboardAlert();
  renderEconomicsMenu();
  renderEconomicsProfit();
  renderEconomicsIngredients();
  renderEconomicsLaborEvents();
  renderEconomicsDelivery();
};

function calculateItemEconomics(itemData) {
  let totalCost = 0;
  
  // 1. Ingredients Cost
  const eco = itemData.economics || {};
  const itemIngredients = eco.ingredients || [];
  
  itemIngredients.forEach(i => {
    const dbIng = state.ingredients.find(ing => ing.id === i.ingredientId);
    if (dbIng) {
      totalCost += (dbIng.costPerUnit || 0) * (i.quantity || 0);
    }
  });

  // 2. Fixed per-item Costs
  totalCost += parseFloat(eco.packagingCost || 0);
  totalCost += parseFloat(eco.miscCost || 0);

  // 3. Margin & %
  const priceStr = String(itemData.price || 0).replace('$', '');
  const price = parseFloat(priceStr) || 0;
  const contributionMargin = price - totalCost;
  const foodCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return { totalCost, contributionMargin, foodCostPercent };
}

function getFoodCostColor(percent) {
  const w = state.unitSettings.foodCostWarningThreshold || 30;
  const d = state.unitSettings.foodCostDangerThreshold || 35;
  if (percent <= w) return '#4caf50'; // Green
  if (percent <= d) return '#ffeb3b'; // Yellow
  return '#f44336'; // Red
}

function renderEconomicsDashboardAlert() {
  const container = document.getElementById('food-cost-alert-container');
  if (!container) return;
  
  let flaggedItems = [];
  Object.entries(window.adminMenuData || {}).forEach(([id, item]) => {
    const eco = calculateItemEconomics(item);
    if (eco.foodCostPercent > (state.unitSettings.foodCostWarningThreshold || 30)) {
      flaggedItems.push({ name: item.name, percent: eco.foodCostPercent });
    }
  });

  if (flaggedItems.length > 0) {
    let alertHtml = `<div style="background: rgba(244, 67, 54, 0.1); border-left: 4px solid #f44336; padding: 16px; border-radius: 4px;">`;
    alertHtml += `<h3 style="color: #f44336; margin: 0 0 8px 0; font-family: 'Barlow Condensed'; font-size: 18px; letter-spacing: 1px;">⚠️ High Food Cost Alert</h3>`;
    alertHtml += `<ul style="margin: 0; padding-left: 20px; color: var(--gray); font-size: 14px;">`;
    flaggedItems.forEach(i => {
      alertHtml += `<li><strong>${i.name}</strong> is running at <span style="color: #f44336; font-weight: bold;">${i.percent.toFixed(1)}%</span> food cost.</li>`;
    });
    alertHtml += `</ul></div>`;
    container.innerHTML = alertHtml;
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

function renderEconomicsMenu() {
  const container = document.getElementById('eco-tab-menu');
  if (!container) return;

  const items = Object.entries(window.adminMenuData || {}).map(([id, item]) => {
    return { id, item, ...calculateItemEconomics(item) };
  }).sort((a, b) => b.contributionMargin - a.contributionMargin);

  let html = `<table class="crm-table" style="width: 100%; text-align: left; border-collapse: collapse;">
    <thead>
      <tr>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.menuItem')}</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.price')}</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.foodCost')}</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.marginPct')} ($)</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.foodCost')} %</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.actions')}</th>
      </tr>
    </thead>
    <tbody>`;

  items.forEach(i => {
    const color = getFoodCostColor(i.foodCostPercent);
    html += `
      <tr style="border-bottom: 1px solid var(--border);">
        <td data-label="Item" style="padding: 12px; font-weight: 600;">${i.item.name}</td>
        <td data-label="Price" style="padding: 12px;">$${(parseFloat(String(i.item.price || 0).replace('$', '')) || 0).toFixed(2)}</td>
        <td data-label="Total Cost" style="padding: 12px;">$${i.totalCost.toFixed(2)}</td>
        <td data-label="Margin ($)" style="padding: 12px; color: var(--accent); font-weight: bold;">$${i.contributionMargin.toFixed(2)}</td>
        <td data-label="Food Cost %" style="padding: 12px;">
          <span style="background: ${color}22; color: ${color}; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            ${i.foodCostPercent.toFixed(1)}%
          </span>
        </td>
        <td data-label="${t('ue.table.actions')}" style="padding: 12px;">
          <button class="btn-outline btn-small" onclick="openEditRecipeModal('${i.id}')">${t('ue.btn.editRecipe')}</button>
        </td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

window.openEditRecipeModal = (menuId) => {
  const item = window.adminMenuData[menuId];
  if (!item) return;

  const eco = item.economics || {};
  const ingredients = eco.ingredients || [];

  let html = `
    <form id="recipe-form" onsubmit="saveRecipe(event, '${menuId}')" style="display: flex; flex-direction: column; gap: 16px;">
      <h3 style="margin-top: 0; margin-bottom: 8px;">${item.name} Recipe</h3>
      
      <div id="recipe-ingredients-list" style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Ings go here -->
      </div>
      
      <button type="button" class="btn-outline" onclick="addRecipeIngredientRow()" style="align-self: flex-start; font-size: 12px;">+ Add Ingredient</button>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
        <div>
          <label style="font-size: 12px; color: var(--gray);">Packaging Cost ($)</label>
          <input type="number" id="recipe-pack-cost" step="0.01" value="${eco.packagingCost || 0}" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: var(--gray);">Misc Cost ($)</label>
          <input type="number" id="recipe-misc-cost" step="0.01" value="${eco.miscCost || 0}" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button type="submit" class="btn-primary" style="flex: 1;">Save Recipe</button>
      </div>
    </form>
  `;

  document.getElementById('recipe-editor-container').innerHTML = html;
  
  window._tempRecipeIngredients = [...ingredients];
  renderRecipeIngredientRows();

  document.getElementById('edit-recipe-modal').classList.add('open');
};

window.closeEditRecipeModal = () => {
  document.getElementById('edit-recipe-modal').classList.remove('open');
};

function renderRecipeIngredientRows() {
  const container = document.getElementById('recipe-ingredients-list');
  if (!container) return;

  if (window._tempRecipeIngredients.length === 0) {
    container.innerHTML = `<p style="color: var(--gray); font-size: 13px;">No ingredients added.</p>`;
    return;
  }

  let html = '';
  window._tempRecipeIngredients.forEach((ing, idx) => {
    html += `
      <div style="display: flex; gap: 8px; align-items: center;">
        <select onchange="updateTempRecipeIng(${idx}, 'id', this.value)" style="flex: 2; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
          <option value="">Select Ingredient...</option>
          ${state.ingredients.map(dbIng => `
            <option value="${dbIng.id}" ${dbIng.id === ing.ingredientId ? 'selected' : ''}>${dbIng.name} ($${dbIng.costPerUnit}/${dbIng.unit})</option>
          `).join('')}
        </select>
        <input type="number" step="0.01" value="${ing.quantity || 0}" onchange="updateTempRecipeIng(${idx}, 'qty', this.value)" placeholder="Qty" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        <button type="button" class="btn-outline" onclick="removeRecipeIngredientRow(${idx})" style="padding: 8px; border-color: rgba(255,69,0,0.4); color: var(--accent);">×</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.addRecipeIngredientRow = () => {
  if (window._tempRecipeIngredients.some(i => !i.ingredientId || i.quantity <= 0)) {
    showToast('Please fill out existing ingredient rows first', true);
    return;
  }
  window._tempRecipeIngredients.push({ ingredientId: '', quantity: 0 });
  renderRecipeIngredientRows();
};

window.removeRecipeIngredientRow = (idx) => {
  window._tempRecipeIngredients.splice(idx, 1);
  renderRecipeIngredientRows();
};

window.updateTempRecipeIng = (idx, field, val) => {
  if (field === 'id') window._tempRecipeIngredients[idx].ingredientId = val;
  if (field === 'qty') window._tempRecipeIngredients[idx].quantity = parseFloat(val) || 0;
};

window.saveRecipe = async (e, menuId) => {
  e.preventDefault();
  const packCost = parseFloat(document.getElementById('recipe-pack-cost').value) || 0;
  const miscCost = parseFloat(document.getElementById('recipe-misc-cost').value) || 0;

  const validIngs = window._tempRecipeIngredients.filter(i => i.ingredientId && i.quantity > 0);

  try {
    const ecoUpdate = {
      ingredients: validIngs,
      packagingCost: packCost,
      miscCost: miscCost
    };
    await updateDoc(doc(db, 'menu', menuId), { economics: ecoUpdate });
    
    // Update local cache to reflect changes immediately
    window.adminMenuData[menuId].economics = ecoUpdate;

    showToast('Recipe saved successfully');
    closeEditRecipeModal();
    renderEconomics();
  } catch (err) {
    console.error(err);
    showToast('Error saving recipe', true);
  }
};

// ----------------------------------------------------
// INGREDIENTS TAB
// ----------------------------------------------------
function renderEconomicsIngredients() {
  const container = document.getElementById('eco-tab-ingredients');
  if (!container) return;

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2 style="font-family: 'Barlow Condensed';">${t('ue.tab.ingredients')}</h2>
      <button class="btn-primary btn-small" onclick="addIngredient()">+ ${t('ue.btn.addIngredient')}</button>
    </div>
    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px;">
      <form id="add-ing-form" onsubmit="saveNewIngredient(event)" style="display: none; gap: 8px; margin-bottom: 16px; align-items: center;">
        <input type="text" id="new-ing-name" placeholder="Name (e.g. Lamb)" required style="flex: 2; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        <input type="number" id="new-ing-cost" placeholder="Cost ($)" step="0.001" required style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        <span style="color: var(--gray);">per</span>
        <input type="text" id="new-ing-unit" placeholder="Unit (e.g. oz, piece)" required style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        <button type="submit" class="btn-primary btn-small">${t('btn.save')}</button>
        <button type="button" class="btn-outline btn-small" onclick="document.getElementById('add-ing-form').style.display='none'">${t('btn.cancel')}</button>
      </form>

      <table class="crm-table" style="width: 100%; text-align: left; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.ingredientName')}</th>
            <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.costPerUnit')}</th>
            <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (state.ingredients.length === 0) {
    html += `<tr><td colspan="3" style="padding: 12px; color: var(--gray);">No ingredients added yet.</td></tr>`;
  } else {
    state.ingredients.forEach(ing => {
      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td data-label="Name" style="padding: 12px; font-weight: 600;">${ing.name}</td>
          <td data-label="Cost Per Unit" style="padding: 12px;">$${ing.costPerUnit.toFixed(3)} / ${ing.unit}</td>
          <td data-label="Actions" style="padding: 12px;">
            <button class="btn-outline btn-small" onclick="deleteIngredient('${ing.id}')" style="padding: 4px 8px; border-color: rgba(255,69,0,0.4); color: var(--accent);">Delete</button>
          </td>
        </tr>
      `;
    });
  }

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

window.addIngredient = () => {
  document.getElementById('add-ing-form').style.display = 'flex';
};

window.saveNewIngredient = async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-ing-name').value.trim();
  const costPerUnit = parseFloat(document.getElementById('new-ing-cost').value);
  const unit = document.getElementById('new-ing-unit').value.trim();

  try {
    await addDoc(collection(db, 'unitEconomics_ingredients'), {
      name, costPerUnit, unit
    });
    showToast('Ingredient added');
  } catch (err) {
    console.error(err);
    showToast('Failed to add ingredient', true);
  }
};

window.deleteIngredient = async (id) => {
  if (!confirm('Delete this ingredient? This will affect any menu items using it.')) return;
  try {
    await deleteDoc(doc(db, 'unitEconomics_ingredients', id));
    showToast('Ingredient deleted');
  } catch (err) {
    console.error(err);
    showToast('Failed to delete', true);
  }
};

// ----------------------------------------------------
// LABOR & EVENTS TAB
// ----------------------------------------------------
function getWeightedAverageMargin() {
  // Use last 90 days from state.orders
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const recentOrders = state.orders.filter(o => o.date >= ninetyDaysAgo && o.status === 'completed');
  if (recentOrders.length === 0) return 0;

  const itemCounts = {};
  let totalItemsSold = 0;

  recentOrders.forEach(o => {
    (o.items || []).forEach(item => {
      itemCounts[item.id] = (itemCounts[item.id] || 0) + item.qty;
      totalItemsSold += item.qty;
    });
  });

  if (totalItemsSold === 0) return 0;

  let totalWeightedMargin = 0;
  Object.entries(itemCounts).forEach(([itemId, qty]) => {
    const mItem = window.adminMenuData[itemId];
    if (mItem) {
      const eco = calculateItemEconomics(mItem);
      totalWeightedMargin += (eco.contributionMargin * qty);
    }
  });

  return totalWeightedMargin / totalItemsSold;
}

function renderEconomicsLaborEvents() {
  const container = document.getElementById('eco-tab-labor');
  if (!container) return;

  const avgMargin = getWeightedAverageMargin();

  let html = `
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;">
      
      <!-- Labor Cost Tracker -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
        <h3 style="margin-top: 0; font-family: 'Barlow Condensed';">Labor Cost Tracker</h3>
        <p style="font-size: 12px; color: var(--gray); margin-bottom: 16px;">Calculate Prime Cost % based on selected date range revenue.</p>
        
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="font-size: 12px; color: var(--gray);">Date Range for Revenue</label>
            <div style="display: flex; gap: 8px;">
              <input type="date" id="labor-date-start" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
              <input type="date" id="labor-date-end" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
            </div>
          </div>
          <button class="btn-outline btn-small" onclick="pullLaborRevenue()">Pull Revenue</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 12px; color: var(--gray);">Pulled Revenue ($)</label>
            <input type="number" id="labor-revenue" readonly value="0" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px; opacity: 0.7;">
          </div>
          <div>
            <label style="font-size: 12px; color: var(--gray);">Total Labor Hours</label>
            <input type="number" id="labor-hours" value="0" oninput="calculateLaborCost()" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
          </div>
          <div>
            <label style="font-size: 12px; color: var(--gray);">Avg Hourly Rate ($)</label>
            <input type="number" id="labor-rate" value="20" oninput="calculateLaborCost()" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--gray); font-size: 14px;">Labor Cost %</span>
            <strong id="calc-labor-percent" style="font-size: 16px;">0.0%</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--gray); font-size: 14px;">Prime Cost % <span style="font-size: 10px;">(Labor + Avg Food Cost)</span></span>
            <strong id="calc-prime-percent" style="font-size: 16px;">0.0%</strong>
          </div>
        </div>
      </div>

      <!-- Event Analyzer -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-family: 'Barlow Condensed';">Event Break-Even Analyzer</h3>
          <button class="btn-primary btn-small" onclick="openEditEventModal()">+ New Event</button>
        </div>
        
        <div style="background: rgba(255,69,0,0.1); border: 1px solid var(--accent); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <strong style="color: var(--accent); font-size: 14px;">Weighted Average Contribution Margin: $${avgMargin.toFixed(2)}</strong>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--gray);">Based on order mix from the last 90 days. Break-even calculates how many average orders you need to cover fixed event costs.</p>
        </div>

        <table class="crm-table" style="width: 100%; text-align: left; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.eventName')}</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.date')}</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">Fixed Costs</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">Break-Even Orders</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">Actual Orders</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">Status</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (state.events.length === 0) {
    html += `<tr><td colspan="6" style="padding: 12px; color: var(--gray);">No events saved.</td></tr>`;
  } else {
    state.events.forEach(ev => {
      const fc = ev.fixedCosts || {};
      const totalFixed = (fc.boothFee||0) + (fc.travel||0) + (fc.staff||0) + (fc.permits||0) + (fc.other||0);
      const breakEven = avgMargin > 0 ? Math.ceil(totalFixed / avgMargin) : 0;
      
      let statusHtml = '-';
      if (ev.actualOrders) {
        if (ev.actualOrders >= breakEven) {
          statusHtml = `<span style="color: #4caf50; font-weight: bold;">Profitable</span>`;
        } else {
          statusHtml = `<span style="color: #f44336; font-weight: bold;">Loss</span>`;
        }
      }

      html += `
        <tr style="border-bottom: 1px solid var(--border); cursor: pointer;" onclick="openEditEventModal('${ev.id}')">
          <td data-label="Event Name" style="padding: 12px; font-weight: 600; color: var(--white);">${ev.name}</td>
          <td data-label="Date" style="padding: 12px;">${ev.date.toLocaleDateString()}</td>
          <td data-label="Fixed Costs" style="padding: 12px;">$${totalFixed.toFixed(2)}</td>
          <td data-label="Break-Even Orders" style="padding: 12px; color: var(--accent); font-weight: bold;">${breakEven}</td>
          <td data-label="Actual Orders" style="padding: 12px;">${ev.actualOrders || '-'}</td>
          <td data-label="Status" style="padding: 12px;">${statusHtml}</td>
        </tr>
      `;
    });
  }

  html += `</tbody></table></div></div>`;
  container.innerHTML = html;

  // Set default dates for labor to today
  const todayStr = new Date().toISOString().split('T')[0];
  if(document.getElementById('labor-date-start')) document.getElementById('labor-date-start').value = todayStr;
  if(document.getElementById('labor-date-end')) document.getElementById('labor-date-end').value = todayStr;
}

window.pullLaborRevenue = () => {
  const startVal = document.getElementById('labor-date-start').value;
  const endVal = document.getElementById('labor-date-end').value;
  
  if (!startVal || !endVal) {
    showToast('Please select a valid date range.');
    return;
  }

  const start = new Date(startVal);
  start.setHours(0,0,0,0);
  const end = new Date(endVal);
  end.setHours(23,59,59,999);

  let rev = 0;
  state.orders.forEach(o => {
    if (o.status === 'completed' && o.date >= start && o.date <= end) {
      rev += parseFloat(o.total || 0);
    }
  });

  document.getElementById('labor-revenue').value = rev.toFixed(2);
  calculateLaborCost();
  showToast(`Pulled $${rev.toFixed(2)} in revenue.`);
};

window.calculateLaborCost = () => {
  const rev = parseFloat(document.getElementById('labor-revenue').value) || 0;
  const hours = parseFloat(document.getElementById('labor-hours').value) || 0;
  const rate = parseFloat(document.getElementById('labor-rate').value) || 0;

  const laborCost = hours * rate;
  let laborPercent = 0;
  if (rev > 0) laborPercent = (laborCost / rev) * 100;

  document.getElementById('calc-labor-percent').textContent = laborPercent.toFixed(1) + '%';

  // Approx global food cost % (simple avg of items for prime calculation)
  let sumFc = 0; let count = 0;
  Object.values(window.adminMenuData || {}).forEach(item => {
    const eco = calculateItemEconomics(item);
    sumFc += eco.foodCostPercent;
    count++;
  });
  const avgFc = count > 0 ? (sumFc / count) : 0;
  const primeCost = laborPercent + avgFc;

  const primeEl = document.getElementById('calc-prime-percent');
  primeEl.textContent = primeCost.toFixed(1) + '%';
  
  if (primeCost > (state.unitSettings.primeCostThreshold || 65)) {
    primeEl.style.color = '#f44336';
  } else {
    primeEl.style.color = '#4caf50';
  }
};

window.openEditEventModal = (eventId = null) => {
  let ev = {
    name: '',
    date: new Date().toISOString().split('T')[0],
    fixedCosts: { boothFee: 0, travel: 0, staff: 0, permits: 0, other: 0 },
    actualOrders: ''
  };

  if (eventId) {
    const found = state.events.find(e => e.id === eventId);
    if (found) {
      ev = { ...found, date: found.date.toISOString().split('T')[0] };
    }
  }

  const fc = ev.fixedCosts || {};
  
  let html = `
    <form onsubmit="saveEvent(event, '${eventId || ''}')" style="display: flex; flex-direction: column; gap: 16px;">
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
        <div>
          <label style="font-size: 12px; color: var(--gray);">Event Name</label>
          <input type="text" id="ev-name" value="${ev.name}" required style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: var(--gray);">Date</label>
          <input type="date" id="ev-date" value="${ev.date}" required style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
      </div>

      <h4 style="margin: 8px 0 0 0; color: var(--accent); font-family: 'Barlow Condensed'; letter-spacing: 1px;">FIXED COSTS</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div><label style="font-size: 12px; color: var(--gray);">Booth Fee ($)</label><input type="number" id="ev-booth" value="${fc.boothFee||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
        <div><label style="font-size: 12px; color: var(--gray);">Travel/Fuel ($)</label><input type="number" id="ev-travel" value="${fc.travel||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
        <div><label style="font-size: 12px; color: var(--gray);">Extra Staff ($)</label><input type="number" id="ev-staff" value="${fc.staff||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
        <div><label style="font-size: 12px; color: var(--gray);">Permits ($)</label><input type="number" id="ev-permits" value="${fc.permits||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
        <div><label style="font-size: 12px; color: var(--gray);">Other ($)</label><input type="number" id="ev-other" value="${fc.other||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
      </div>

      <div style="margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--border);">
        <label style="font-size: 12px; color: var(--gray);">Actual Orders (Post-Event)</label>
        <input type="number" id="ev-actual" value="${ev.actualOrders||''}" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
      </div>

      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button type="submit" class="btn-primary" style="flex: 1;">Save Event</button>
        ${eventId ? `<button type="button" class="btn-outline" style="border-color: rgba(255,69,0,0.4); color: var(--accent);" onclick="deleteEvent('${eventId}')">Delete</button>` : ''}
      </div>
    </form>
  `;

  document.getElementById('event-editor-container').innerHTML = html;
  document.getElementById('edit-event-modal').style.display = 'flex';
};

window.closeEditEventModal = () => {
  document.getElementById('edit-event-modal').style.display = 'none';
};

window.saveEvent = async (e, eventId) => {
  e.preventDefault();
  
  const name = document.getElementById('ev-name').value.trim();
  const dateStr = document.getElementById('ev-date').value;
  
  const boothFee = parseFloat(document.getElementById('ev-booth').value) || 0;
  const travel = parseFloat(document.getElementById('ev-travel').value) || 0;
  const staff = parseFloat(document.getElementById('ev-staff').value) || 0;
  const permits = parseFloat(document.getElementById('ev-permits').value) || 0;
  const other = parseFloat(document.getElementById('ev-other').value) || 0;
  
  const actualStr = document.getElementById('ev-actual').value;
  const actualOrders = actualStr ? parseInt(actualStr) : null;

  const payload = {
    name,
    date: Timestamp.fromDate(new Date(dateStr)),
    fixedCosts: { boothFee, travel, staff, permits, other },
    actualOrders
  };

  try {
    if (eventId) {
      await updateDoc(doc(db, 'unitEconomics_events', eventId), payload);
    } else {
      await addDoc(collection(db, 'unitEconomics_events'), payload);
    }
    showToast('Event saved');
    closeEditEventModal();
  } catch (err) {
    console.error(err);
    showToast('Error saving event', true);
  }
};

window.deleteEvent = async (eventId) => {
  if (!confirm('Delete this event?')) return;
  try {
    await deleteDoc(doc(db, 'unitEconomics_events', eventId));
    showToast('Event deleted');
    closeEditEventModal();
  } catch (err) {
    showToast('Error deleting', true);
  }
};

// ----------------------------------------------------
// DELIVERY IMPACT TAB
// ----------------------------------------------------
function renderEconomicsDelivery() {
  const container = document.getElementById('eco-tab-delivery');
  if (!container) return;

  const platforms = state.unitPlatforms || { doordash: 30, ubereats: 30, grubhub: 30 };

  const items = Object.entries(window.adminMenuData || {}).map(([id, item]) => {
    return { id, item, ...calculateItemEconomics(item) };
  }).sort((a, b) => b.contributionMargin - a.contributionMargin);

  let html = `
    <div style="background: var(--surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 24px;">
      <h3 style="margin-top: 0; font-family: 'Barlow Condensed';">Platform Commission Rates (%)</h3>
      <div style="display: flex; gap: 16px; align-items: flex-end;">
        <div>
          <label style="font-size: 12px; color: var(--gray);">DoorDash</label>
          <input type="number" id="plat-dd" value="${platforms.doordash||30}" style="width: 80px; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: var(--gray);">Uber Eats</label>
          <input type="number" id="plat-ue" value="${platforms.ubereats||30}" style="width: 80px; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: var(--gray);">Grubhub</label>
          <input type="number" id="plat-gh" value="${platforms.grubhub||30}" style="width: 80px; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <button class="btn-outline btn-small" onclick="savePlatformRates()">Update Rates</button>
      </div>
    </div>

    <table class="crm-table" style="width: 100%; text-align: left; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="padding: 12px; border-bottom: 1px solid var(--border);">Item</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border);">Price</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border);">In-Store Margin</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border); color: #ff3333;">DoorDash Margin</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border); color: #06c167;">Uber Eats Margin</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border); color: #ff8000;">Grubhub Margin</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach(i => {
    const priceStr = String(i.item.price || 0).replace('$', '');
    const price = parseFloat(priceStr) || 0;
    
    // Calculates margin after taking away the commission % from the revenue
    const ddMargin = price - (price * ((platforms.doordash||0)/100)) - i.totalCost;
    const ueMargin = price - (price * ((platforms.ubereats||0)/100)) - i.totalCost;
    const ghMargin = price - (price * ((platforms.grubhub||0)/100)) - i.totalCost;

    const fmtMargin = (m) => {
      if (m < 0) return `<span style="color: #f44336; font-weight: bold;">-$${Math.abs(m).toFixed(2)}</span>`;
      if (m < 2) return `<span style="color: #ffeb3b;">$${m.toFixed(2)}</span>`;
      return `<span style="color: var(--white);">$${m.toFixed(2)}</span>`;
    };

    html += `
      <tr style="border-bottom: 1px solid var(--border);">
        <td data-label="Item" style="padding: 12px; font-weight: 600;">${i.item.name}</td>
        <td data-label="Price" style="padding: 12px;">$${price.toFixed(2)}</td>
        <td data-label="In-Store Margin" style="padding: 12px; color: var(--accent); font-weight: bold;">$${i.contributionMargin.toFixed(2)}</td>
        <td data-label="DoorDash Margin" style="padding: 12px; background: rgba(255,51,51,0.05);">${fmtMargin(ddMargin)}</td>
        <td data-label="Uber Eats Margin" style="padding: 12px; background: rgba(6,193,103,0.05);">${fmtMargin(ueMargin)}</td>
        <td data-label="Grubhub Margin" style="padding: 12px; background: rgba(255,128,0,0.05);">${fmtMargin(ghMargin)}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

window.savePlatformRates = async () => {
  const doordash = parseFloat(document.getElementById('plat-dd').value) || 0;
  const ubereats = parseFloat(document.getElementById('plat-ue').value) || 0;
  const grubhub = parseFloat(document.getElementById('plat-gh').value) || 0;

  try {
    const newRates = { doordash, ubereats, grubhub };
    await setDoc(doc(db, 'unitEconomics_platforms', 'rates'), newRates, { merge: true });
    
    // Update local cache
    state.unitPlatforms = { ...state.unitPlatforms, ...newRates };
    
    showToast('Platform rates updated');
    renderEconomics();
  } catch(err) {
    console.error(err);
    showToast('Error saving rates', true);
  }
};


// ==========================================
// PROFIT DASHBOARD LOGIC
// ==========================================
let profitChartInst = null;
let profitDataCache = {
  fixedCosts: { rent: 0, commissaryRent: 0, insurance: 0, other: 0 },
  sales: [],
  expenses: []
};

async function loadProfitData() {
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

  const salesQ = query(collection(db, 'sales_logs'), orderBy('date', 'asc'));
  onSnapshot(salesQ, (snapshot) => {
    profitDataCache.sales = [];
    snapshot.forEach(docSnap => {
      profitDataCache.sales.push({ id: docSnap.id, ...docSnap.data() });
    });
    updateProfitDashboard();
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

function updateProfitDashboard() {
  const container = document.getElementById('eco-tab-profit');
  if (!container || container.style.display === 'none') return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Aggregate daily data
  const dailyData = {};
  
  // 1. Map Sales
  profitDataCache.sales.forEach(s => {
    const d = new Date(s.date);
    if (d >= thirtyDaysAgo) {
      if (!dailyData[s.date]) dailyData[s.date] = { sales: 0, expenses: 0 };
      dailyData[s.date].sales += (s.amount || 0);
    }
  });

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

  // Render Chart
  const ctx = document.getElementById('profitChart');
  if (!ctx) return;

  if (profitChartInst) {
    profitChartInst.destroy();
  }

  profitChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sales ($)',
          data: salesDataset,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76,175,80,0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Total Expenses ($)',
          data: expensesDataset,
          borderColor: '#f44336',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4
        },
        {
          label: 'Net Profit ($)',
          data: profitDataset,
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33,150,243,0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3
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
        legend: { labels: { color: '#ccc' } }
      },
      scales: {
        y: { grid: { color: '#333' }, ticks: { color: '#aaa' } },
        x: { grid: { color: '#333' }, ticks: { color: '#aaa' } }
      }
    }
  });
}

window.renderEconomicsProfit = () => {
  const container = document.getElementById('eco-tab-profit');
  if (!container) return;
  loadProfitData(); // Initial load
};

const fixedForm = document.getElementById('fixed-costs-form');
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

const salesForm = document.getElementById('daily-sales-form');
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

// ==========================================
// BLOG MANAGEMENT LOGIC
// ==========================================
let quill;
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Quill to be available
  const initQuill = setInterval(() => {
    if (window.Quill) {
      clearInterval(initQuill);
      quill = new window.Quill('#quill-editor', {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
          ]
        }
      });

      // Custom image handler
      quill.getModule('toolbar').addHandler('image', () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;
          try {
            const altText = prompt("Enter an image description for SEO (e.g. 'Halal chicken tikka kebab'):");
            if (!altText) {
              alert("SEO Warning: Image description is required to rank on Google Images.");
              return; // cancel upload if no alt text to force good SEO habits
            }
            
            // Re-use our compressImage logic
            const compressedFile = await compressImage(file, 1024);
            const storageRef = ref(storage, `img/blog/${Date.now()}_${compressedFile.name}`);
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);
            
            const range = quill.getSelection();
            quill.insertEmbed(range.index, 'image', url);
            
            // Apply alt attribute to the newly inserted image
            setTimeout(() => {
              const images = document.querySelectorAll('#quill-editor img');
              images.forEach(img => {
                if (img.src === url) {
                  img.setAttribute('alt', altText);
                }
              });
            }, 100);
            
          } catch (e) {
            console.error(e);
            showToast('Image upload failed');
          }
        };
      });
    }
  }, 100);



  const addPostBtn = document.getElementById('add-post-btn');
  const cancelPostBtn = document.getElementById('cancel-post-btn');
  const blogForm = document.getElementById('blog-form');
  const blogEditorSection = document.getElementById('blog-editor-section');
  const blogList = document.getElementById('blog-list');
  const postCoverImage = document.getElementById('post-cover-image');
  let currentCoverUrl = '';

  addPostBtn?.addEventListener('click', () => {
    blogForm.reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-keywords').value = '';
    document.getElementById('post-cover-preview').innerHTML = '';
    currentCoverUrl = '';
    if(quill) quill.root.innerHTML = '';
    blogEditorSection.style.display = 'block';
    blogForm.scrollIntoView({ behavior: 'smooth' });
  });

  cancelPostBtn?.addEventListener('click', () => {
    blogEditorSection.style.display = 'none';
  });

  postCoverImage?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('post-cover-preview').innerHTML = 'Compressing & uploading...';
    try {
      const compressedFile = await compressImage(file, 1200);
      const storageRef = ref(storage, `img/blog/${Date.now()}_${compressedFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      currentCoverUrl = await getDownloadURL(storageRef);
      document.getElementById('post-cover-preview').innerHTML = `<img src="${currentCoverUrl}" style="height: 100px; border-radius: 8px;">`;
    } catch (err) {
      console.error(err);
      document.getElementById('post-cover-preview').innerHTML = '<span style="color:red">Upload failed</span>';
    }
  });

  blogForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('post-id').value;
    const title = document.getElementById('post-title').value.trim();
    let slug = document.getElementById('post-slug').value.trim();
    if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const excerpt = document.getElementById('post-excerpt').value.trim();
    const keywords = document.getElementById('post-keywords').value.trim();
    const isPublished = document.getElementById('post-published').checked;
    const editorContent = quill ? quill.root.innerHTML : '';

    const postData = {
      title,
      slug,
      excerpt,
      keywords,
      content: editorContent,
      coverImage: currentCoverUrl,
      isPublished,
      updatedAt: serverTimestamp()
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'posts', id), postData);
        showToast('Post updated!');
      } else {
        postData.publishedAt = isPublished ? serverTimestamp() : null;
        await addDoc(collection(db, 'posts'), postData);
        showToast('Post created!');
      }
      blogEditorSection.style.display = 'none';
      loadBlogPosts();
    } catch (err) {
      console.error(err);
      showToast('Error saving post');
    }
  });

  // Auto-generate slug from title if empty
  document.getElementById('post-title')?.addEventListener('input', (e) => {
    const slugInput = document.getElementById('post-slug');
    if (!document.getElementById('post-id').value && (!slugInput.value || slugInput.dataset.auto === 'true')) {
      slugInput.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      slugInput.dataset.auto = 'true';
    }
  });
  document.getElementById('post-slug')?.addEventListener('input', (e) => {
    e.target.dataset.auto = 'false';
  });

  function loadBlogPosts() {
    if (!blogList) return;
    const q = query(collection(db, 'posts'), orderBy('updatedAt', 'desc'));
    onSnapshot(q, (snapshot) => {
      blogList.innerHTML = '';
      snapshot.forEach(docSnap => {
        const post = docSnap.data();
        const id = docSnap.id;
        
        const card = document.createElement('div');
        card.className = 'crm-card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.innerHTML = `
          ${post.coverImage ? `<img src="${post.coverImage}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;">` : ''}
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <h3 style="margin: 0; font-size: 1.2rem;">${post.title}</h3>
            <span class="crm-badge ${post.isPublished ? 'status-success' : 'status-warning'}">${post.isPublished ? 'Live' : 'Draft'}</span>
          </div>
          <p style="color: var(--gray); font-size: 0.9rem; flex-grow: 1;">${post.excerpt || 'No excerpt'}</p>
          <div style="display: flex; justify-content: space-between; margin-top: 16px; border-top: 1px solid var(--border); padding-top: 16px;">
            <button class="btn-outline edit-post-btn" style="padding: 4px 12px; font-size: 0.9rem;">Edit</button>
            <button class="btn-outline delete-post-btn" style="padding: 4px 12px; font-size: 0.9rem; border-color: #ff4d4d; color: #ff4d4d;">Delete</button>
          </div>
        `;

        card.querySelector('.edit-post-btn').addEventListener('click', () => {
          document.getElementById('post-id').value = id;
          document.getElementById('post-title').value = post.title;
          document.getElementById('post-slug').value = post.slug;
          document.getElementById('post-excerpt').value = post.excerpt || '';
          document.getElementById('post-keywords').value = post.keywords || '';
          document.getElementById('post-published').checked = post.isPublished;
          currentCoverUrl = post.coverImage || '';
          if (currentCoverUrl) {
            document.getElementById('post-cover-preview').innerHTML = `<img src="${currentCoverUrl}" style="height: 100px; border-radius: 8px;">`;
          } else {
            document.getElementById('post-cover-preview').innerHTML = '';
          }
          if(quill) quill.root.innerHTML = post.content || '';
          
          blogEditorSection.style.display = 'block';
          blogForm.scrollIntoView({ behavior: 'smooth' });
        });

        card.querySelector('.delete-post-btn').addEventListener('click', async () => {
          if(confirm('Are you sure you want to delete this post?')) {
            await deleteDoc(doc(db, 'posts', id));
            showToast('Post deleted');
          }
        });

        blogList.appendChild(card);
      });
    });
  }

  // Load blog posts when tab is clicked
  const blogTabBtn = document.querySelector('[data-target="blog-management"]');
  if (blogTabBtn) {
    blogTabBtn.addEventListener('click', () => {
      loadBlogPosts();
    });
  }
});


// ==========================================
// NATIVE ANALYTICS TRACKING
// ==========================================

function loadAnalytics() {
  const aq = query(collection(db, 'page_views'), orderBy('timestamp', 'desc'), limit(5000));
  
  if (analyticsUnsub) analyticsUnsub();
  
  analyticsUnsub = onSnapshot(aq, (snapshot) => {
    let totalViews = 0;
    let blogViews = 0;
    let menuViews = 0;
    
    const pageCounts = {};
    const referrerCounts = {};
    
    snapshot.forEach(d => {
      const data = d.data();
      totalViews++;
      
      const path = data.path || '/';
      const referrer = data.referrer || 'Direct';
      
      // Categorize
      if (path.startsWith('/blog/')) {
        blogViews++;
      }
      if (path.startsWith('/menu')) {
        menuViews++;
      }
      
      // Tally pages
      pageCounts[path] = (pageCounts[path] || 0) + 1;
      
      // Tally referrers (clean up referrers a bit)
      let cleanRef = referrer;
      try {
        if (referrer !== 'Direct' && referrer !== 'Internal') {
          const url = new URL(referrer);
          cleanRef = url.hostname; // e.g. www.google.com
        }
      } catch(e) {}
      
      referrerCounts[cleanRef] = (referrerCounts[cleanRef] || 0) + 1;
    });
    
    // Update Stats
    document.getElementById('analytics-total-views').textContent = totalViews;
    document.getElementById('analytics-blog-views').textContent = blogViews;
    document.getElementById('analytics-menu-views').textContent = menuViews;
    
    // Render Top Pages
    const sortedPages = Object.keys(pageCounts).map(p => ({ path: p, count: pageCounts[p] })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topPagesTbody = document.getElementById('analytics-top-pages');
    if (sortedPages.length === 0) {
      topPagesTbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 16px; color: var(--gray);">No data yet</td></tr>`;
    } else {
      topPagesTbody.innerHTML = sortedPages.map(sp => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td data-label="URL Path" style="padding: 12px 0;">${sp.path}</td>
          <td data-label="Views" style="padding: 12px 0; text-align: right; color: var(--accent); font-weight: 600;">${sp.count}</td>
        </tr>
      `).join('');
    }
    
    // Render Top Referrers
    const sortedRefs = Object.keys(referrerCounts).map(r => ({ ref: r, count: referrerCounts[r] })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topRefsTbody = document.getElementById('analytics-top-sources');
    if (sortedRefs.length === 0) {
      topRefsTbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 16px; color: var(--gray);">No data yet</td></tr>`;
    } else {
      topRefsTbody.innerHTML = sortedRefs.map(sr => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td data-label="Source" style="padding: 12px 0; text-transform: capitalize;">${sr.ref.replace('www.', '')}</td>
          <td data-label="Visits" style="padding: 12px 0; text-align: right; color: var(--accent); font-weight: 600;">${sr.count}</td>
        </tr>
      `).join('');
    }
  });
}

window.loadAnalytics = loadAnalytics;

// Expense Capture Logic
{
  const cameraInput = document.getElementById("receipt-input-camera");
  const galleryInput = document.getElementById("receipt-input-gallery");
  const statusEl = document.getElementById("upload-status");
  const reviewSection = document.getElementById("review-section");
  const reviewMeta = document.getElementById("review-meta");
  const reviewTbody = document.getElementById("review-tbody");
  const confirmBtn = document.getElementById("confirm-expense-btn");
  const receiptActions = document.getElementById("receipt-actions");
  const retakeBtn = document.getElementById("receipt-retake-btn");
  const deleteBtn = document.getElementById("receipt-delete-btn");

  // Compress image client-side before uploading (faster transfer + faster Gemini parsing)
  function compressImage(file, maxWidth = 1600, quality = 0.7) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (cameraInput || galleryInput) {
    let currentExpenseId = null;
    let currentItems = [];
    let currentStoragePath = null;

    const handleFileSelected = async (file) => {
      if (!file) return;

      // Hide actions while processing
      if (receiptActions) receiptActions.style.display = "none";
      reviewSection.style.display = "none";
      currentExpenseId = null;
      currentItems = [];
      currentStoragePath = null;

      statusEl.textContent = "Compressing image...";

      try {
        // Compress the image first (speeds up upload + Gemini processing)
        const compressed = await compressImage(file);
        const compressedSize = (compressed.size / 1024).toFixed(0);
        statusEl.textContent = `Uploading (${compressedSize} KB)...`;

        const timestamp = Date.now();
        const path = `receipts/unsorted/${timestamp}_receipt.jpg`;
        currentStoragePath = path;
        const storageReference = ref(storage, path);

        await uploadBytes(storageReference, compressed);
        statusEl.textContent = "Parsing receipt with AI (this can take a few seconds)...";

        const functions = getFunctions(app);
        const parseReceipt = httpsCallable(functions, "parseReceipt");
        const result = await parseReceipt({ storagePath: path });
        const data = result.data;

        currentExpenseId = data.id;
        currentItems = data.items || [];

        renderReview(data);
        statusEl.textContent = "✅ Parsed! Review the items below, then click Confirm & Save.";

        // Show retake/delete actions
        if (receiptActions) receiptActions.style.display = "flex";
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error parsing receipt: " + err.message;
        if (receiptActions) receiptActions.style.display = "flex";
      }
    };

    if (cameraInput) {
      cameraInput.addEventListener("change", (e) => {
        handleFileSelected(e.target.files[0]);
        cameraInput.value = "";
      });
    }
    if (galleryInput) {
      galleryInput.addEventListener("change", (e) => {
        handleFileSelected(e.target.files[0]);
        galleryInput.value = "";
      });
    }

    // Retake: reset the form and let user pick a new file
    if (retakeBtn) {
      retakeBtn.addEventListener("click", async () => {
        // If there's a draft, delete it first
        if (currentExpenseId) {
          try {
            await deleteDoc(doc(db, "expenses", currentExpenseId));
          } catch(e) { console.warn("Could not delete draft:", e); }
        }
        // If there's an uploaded file, attempt to delete from storage
        if (currentStoragePath) {
          try {
            await deleteObject(ref(storage, currentStoragePath));
          } catch(e) { console.warn("Could not delete storage file:", e); }
        }
        currentExpenseId = null;
        currentItems = [];
        currentStoragePath = null;
        reviewSection.style.display = "none";
        if (receiptActions) receiptActions.style.display = "none";
        statusEl.textContent = "Draft cleared. Select a new receipt above.";
      });
    }

    // Delete draft
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!currentExpenseId) {
          statusEl.textContent = "Nothing to delete.";
          return;
        }
        if (!confirm("Delete this receipt draft?")) return;
        try {
          await deleteDoc(doc(db, "expenses", currentExpenseId));
          if (currentStoragePath) {
            try { await deleteObject(ref(storage, currentStoragePath)); } catch(e) {}
          }
          currentExpenseId = null;
          currentItems = [];
          currentStoragePath = null;
          reviewSection.style.display = "none";
          if (receiptActions) receiptActions.style.display = "none";
          statusEl.textContent = "Draft deleted.";
          showToast("Draft deleted");
        } catch(err) {
          console.error(err);
          statusEl.textContent = "Error deleting draft: " + err.message;
        }
      });
    }

    function renderReview(data) {
      reviewMeta.innerHTML = `
        <strong>Vendor:</strong> ${data.vendor || "Unknown"} &nbsp;
        <strong>Total:</strong> $${data.total != null ? data.total.toFixed(2) : "\u2014"} &nbsp;
        ${data.needsReview ? '<span style="color:#b00;">\u26a0 Needs review</span>' : ""}
      `;

      // Build options for known menu ingredients
      let ingredientOptions = `<option value="">-- No Link --</option>`;
      if (window.adminMenuData) {
        Object.keys(window.adminMenuData).forEach(key => {
           ingredientOptions += `<option value="${key}">${escapeHtml(window.adminMenuData[key].name || key)}</option>`;
        });
      }

      const categories = ['protein', 'produce', 'packaging', 'dry goods', 'other'];

      reviewTbody.innerHTML = "";
      currentItems.forEach((item, idx) => {
        let catOptions = '';
        categories.forEach(c => {
           catOptions += `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`;
        });

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border)";
        tr.innerHTML = `
          <td style="padding:6px 4px;"><input class="item-name-input" data-idx="${idx}" data-field="name" value="${escapeHtml(item.name)}" style="width:100%; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);" /></td>
          <td style="padding:6px 4px; display: flex; flex-direction: column; gap: 4px;">
            <select class="item-cat-input" data-idx="${idx}" data-field="category" style="width:100%; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);">${catOptions}</select>
            <select class="item-link-input" data-idx="${idx}" data-field="matchedMenuIngredient" style="width:100%; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);">${ingredientOptions}</select>
          </td>
          <td style="padding:6px 4px;"><input data-idx="${idx}" data-field="quantity" value="${item.quantity}" type="number" style="width:50px; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);" /></td>
          <td style="padding:6px 4px;"><input data-idx="${idx}" data-field="unitPrice" value="${item.unitPrice}" type="number" step="0.01" style="width:60px; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);" /></td>
          <td style="padding:6px 4px;"><input data-idx="${idx}" data-field="lineTotal" value="${item.lineTotal}" type="number" step="0.01" style="width:60px; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);" /></td>
        `;
        
        // Auto-select linked ingredient if available
        if (item.matchedMenuIngredient) {
            const select = tr.querySelector('.item-link-input');
            if (select) select.value = item.matchedMenuIngredient;
        }
        
        reviewTbody.appendChild(tr);
      });

      reviewTbody.querySelectorAll("input, select").forEach((input) => {
        input.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          const field = e.target.dataset.field;
          let value = e.target.value;
          if (e.target.type === "number") value = parseFloat(value);
          if (value === "") value = null;
          currentItems[idx][field] = value;
        });
      });

      reviewSection.style.display = "block";
    }

    confirmBtn.addEventListener("click", async () => {
      if (!currentExpenseId) return;
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Saving & Learning...";

      try {
        // 1. Save mappings
        for (const item of currentItems) {
           if (item.name) {
              const mapKey = item.name.toLowerCase().trim();
              const mapData = {};
              if (item.category) mapData.category = item.category;
              if (item.matchedMenuIngredient) mapData.matchedMenuIngredient = item.matchedMenuIngredient;
              
              if (Object.keys(mapData).length > 0) {
                 await setDoc(doc(db, 'receipt_mappings', mapKey), mapData, { merge: true });
              }
           }
           
           // 2. Update Inventory
           if (item.name && item.quantity > 0) {
              const invRef = doc(db, 'inventory', item.matchedMenuIngredient || item.name.toLowerCase().trim());
              const invSnap = await getDoc(invRef);
              
              let newStock = item.quantity;
              let priceHistory = [{ date: new Date().toISOString(), price: item.unitPrice, vendor: reviewMeta.innerText.includes('Vendor:') ? reviewMeta.innerText.split('Vendor:')[1].split('\u00a0')[0].trim() : 'Unknown' }];
              
              if (invSnap.exists()) {
                 const invData = invSnap.data();
                 newStock += (invData.stockQuantity || 0);
                 priceHistory = [...(invData.priceHistory || []), ...priceHistory].slice(-10); // Keep last 10
              }
              
              await setDoc(invRef, {
                 name: item.matchedMenuIngredient ? (window.adminMenuData[item.matchedMenuIngredient]?.name || item.name) : item.name,
                 category: item.category || 'other',
                 stockQuantity: newStock,
                 lastPrice: item.unitPrice,
                 priceHistory: priceHistory,
                 updatedAt: serverTimestamp()
              }, { merge: true });
           }
        }

        // 3. Save Expense as confirmed
        await updateDoc(doc(db, "expenses", currentExpenseId), {
          items: currentItems,
          status: "confirmed",
          confirmedAt: serverTimestamp(),
        });

        statusEl.textContent = "✅ Expense confirmed, learned, and inventory updated.";
        reviewSection.style.display = "none";
        if (receiptActions) receiptActions.style.display = "none";
        currentExpenseId = null;
        currentItems = [];
        currentStoragePath = null;
        showToast("Expense confirmed!");
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error saving: " + err.message;
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm & Save Expense";
      }
    });


  }
}


  // Setup Expense Analytics Chart
  let expenseChartInst = null;
  const renderExpenseAnalytics = (snapshot) => {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    
    let catTotals = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.status !== 'confirmed') return;
      (data.items || []).forEach(item => {
         const cat = item.category || 'other';
         catTotals[cat] = (catTotals[cat] || 0) + (item.lineTotal || 0);
      });
    });

    const labels = Object.keys(catTotals);
    const data = Object.values(catTotals);
    
    if (expenseChartInst) {
       expenseChartInst.destroy();
    }
    
    expenseChartInst = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['#ff4d4d', '#4caf50', '#ffeb3b', '#2196f3', '#9c27b0', '#ff9800'],
          borderColor: '#111',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#e0e0e0' } }
        }
      }
    });
  };

  window.expensesUnsub = null;
  window.inventoryUnsub = null;

  window.closeReceiptSlide = () => {
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) slide.style.transform = 'translateX(100%)';
      if (backdrop) {
          backdrop.style.opacity = '0';
          backdrop.style.pointerEvents = 'none';
      }
  };
  window.openReceiptSlide = () => {
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) slide.style.transform = 'translateX(0)';
      if (backdrop) {
          backdrop.style.opacity = '1';
          backdrop.style.pointerEvents = 'auto';
      }
  };

  window.initEconomicsListeners = () => {
    const savedExpensesTbody = document.getElementById("saved-expenses-tbody");
    if (savedExpensesTbody) {
      const expensesQuery = query(collection(db, "expenses"), orderBy("createdAt", "desc"), limit(100));
      window.expensesUnsub = onSnapshot(expensesQuery, (snapshot) => {
        savedExpensesTbody.innerHTML = "";
        if (snapshot.empty) {
          savedExpensesTbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--gray);">No saved expenses yet.</td></tr>';
          return;
        }

        renderExpenseAnalytics(snapshot);

        let rowCount = 0;
        snapshot.forEach(docSnap => {
          if (rowCount >= 50) return;
          rowCount++;
          const data = docSnap.data();
          const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'N/A';
          const itemCount = data.items ? data.items.length : 0;
          const totalStr = data.total != null ? `$${data.total.toFixed(2)}` : '—';
          
          const mainTr = document.createElement("tr");
          mainTr.style.borderBottom = "1px solid var(--border)";
          mainTr.style.cursor = "pointer";
          mainTr.style.transition = "background 0.2s";
          mainTr.onmouseover = () => mainTr.style.background = "rgba(255,255,255,0.05)";
          mainTr.onmouseout = () => mainTr.style.background = "transparent";
          mainTr.innerHTML = `
            <td data-label="Date" style="padding: 12px;">${dateStr}</td>
            <td data-label="Vendor" style="padding: 12px; font-weight: 600;">${window.escapeHtml(data.vendor || 'Unknown')}</td>
            <td data-label="Items" style="padding: 12px;">${itemCount} items</td>
            <td data-label="Total" style="padding: 12px; font-weight: bold; color: var(--accent);">${totalStr}</td>
            <td data-label="Status" style="padding: 12px;">
              <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; background: rgba(255,255,255,0.1); color: var(--white); text-transform: uppercase;">
                ${window.escapeHtml(data.status || 'pending')}
              </span>
            </td>
          `;
          
          mainTr.addEventListener("click", () => {
             document.getElementById('slide-vendor').textContent = data.vendor || 'Unknown';
             document.getElementById('slide-date').textContent = dateStr;
             document.getElementById('slide-total').textContent = totalStr;
             
             let itemsHtml = '<table style="width:100%; border-collapse: collapse;">';
             itemsHtml += '<thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--gray);"><th style="text-align:left; padding:8px;">Item</th><th style="text-align:center; padding:8px;">Qty</th><th style="text-align:right; padding:8px;">Unit</th><th style="text-align:right; padding:8px;">Total</th></tr></thead>';
             itemsHtml += '<tbody>';
             (data.items || []).forEach(item => {
                itemsHtml += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                   <td style="padding:12px 8px;">
                     <div style="font-weight:600;">${window.escapeHtml(item.name || 'Unknown')}</div>
                     <div style="font-size:12px; color:var(--gray); margin-top:4px;">${window.escapeHtml(item.category || 'other')}</div>
                   </td>
                   <td style="padding:12px 8px; text-align:center;">${item.quantity || 1}</td>
                   <td style="padding:12px 8px; text-align:right;">$${(item.unitPrice || 0).toFixed(2)}</td>
                   <td style="padding:12px 8px; text-align:right; font-weight:bold; color:var(--white);">$${(item.lineTotal || 0).toFixed(2)}</td>
                </tr>`;
             });
             itemsHtml += '</tbody></table>';
             document.getElementById('slide-content').innerHTML = itemsHtml;
             
             if (window.openReceiptSlide) window.openReceiptSlide();
          });
          
          savedExpensesTbody.appendChild(mainTr);
        });
      }, (err) => {
        console.error("Expenses sync error:", err);
        savedExpensesTbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #f44336;">Error loading expenses. Check console.</td></tr>';
      });
    }

    // Inventory Tracker Logic
    const inventoryTbody = document.getElementById('inventory-tbody');
    const inventorySearch = document.getElementById('inventory-search');
    let inventoryDataCache = [];

    const renderInventory = (filter = "") => {
      if (!inventoryTbody) return;
      inventoryTbody.innerHTML = "";
      
      const totalItemsEl = document.getElementById('inv-total-items');
      const lowStockEl = document.getElementById('inv-low-stock');
      const costTrendEl = document.getElementById('inv-cost-trend');
      
      if (totalItemsEl) totalItemsEl.textContent = inventoryDataCache.length;
      
      let lowCount = 0;
      inventoryDataCache.forEach(d => {
         if ((parseFloat(d.stockQuantity) || 0) < 10) lowCount++;
      });
      if (lowStockEl) lowStockEl.textContent = lowCount;
      if (costTrendEl) costTrendEl.textContent = "Stable"; // Placeholder, can be calculated dynamically

      if (inventoryDataCache.length === 0) {
         inventoryTbody.innerHTML = '<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--gray);">No inventory tracked yet. Add items manually or confirm receipts.</td></tr>';
         return;
      }
      
      const filtered = inventoryDataCache.filter(data => 
         (data.name || "").toLowerCase().includes(filter.toLowerCase()) || 
         (data.category || "").toLowerCase().includes(filter.toLowerCase())
      );

      if (filtered.length === 0) {
         inventoryTbody.innerHTML = '<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--gray);">No ingredients found.</td></tr>';
         return;
      }

      filtered.forEach(data => {
         let priceTrendHtml = '-';
         let avgPrice = data.lastPrice || 0;
         if (data.priceHistory && data.priceHistory.length > 1) {
            const history = data.priceHistory;
            const current = history[history.length - 1].price;
            const prev = history[history.length - 2].price;
            const sum = history.reduce((acc, curr) => acc + curr.price, 0);
            avgPrice = sum / history.length;
            
            if (current > prev) {
               const pct = ((current - prev) / prev) * 100;
               priceTrendHtml = `<span style="color:#f44336; font-weight:bold; background: rgba(244,67,54,0.1); padding: 4px 8px; border-radius: 4px;">↑ ${pct.toFixed(1)}%</span>`;
            } else if (current < prev) {
               const pct = ((prev - current) / prev) * 100;
               priceTrendHtml = `<span style="color:#4caf50; font-weight:bold; background: rgba(76,175,80,0.1); padding: 4px 8px; border-radius: 4px;">↓ ${pct.toFixed(1)}%</span>`;
            } else {
               priceTrendHtml = `<span style="color:var(--gray);">—</span>`;
            }
         }

         const qty = parseFloat(data.stockQuantity) || 0;
         let stockLevelHtml = '';
         if (qty < 10) {
            stockLevelHtml = `<div style="display:flex; align-items:center; gap:8px;"><div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;"><div style="width: ${Math.min(qty*10, 100)}%; height:100%; background:#f44336;"></div></div><span style="color:#f44336; font-size:11px; font-weight:bold;">LOW</span></div>`;
         } else if (qty > 50) {
            stockLevelHtml = `<div style="display:flex; align-items:center; gap:8px;"><div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;"><div style="width: 100%; height:100%; background:#4caf50;"></div></div><span style="color:#4caf50; font-size:11px; font-weight:bold;">GOOD</span></div>`;
         } else {
            stockLevelHtml = `<div style="display:flex; align-items:center; gap:8px;"><div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;"><div style="width: ${Math.min(qty*2, 100)}%; height:100%; background:#ffeb3b;"></div></div><span style="color:#ffeb3b; font-size:11px; font-weight:bold;">OK</span></div>`;
         }
         
         const tr = document.createElement("tr");
         tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
         tr.innerHTML = `
            <td data-label="Item / Category" style="padding: 12px; font-weight: 600;">
              <div>${window.escapeHtml(data.name || 'Unknown')}</div>
              <div style="font-size:11px; color:var(--gray); text-transform:uppercase; margin-top:4px;">${window.escapeHtml(data.category || 'other')}</div>
            </td>
            <td data-label="Status" style="padding: 12px; min-width: 120px;">
              ${stockLevelHtml}
            </td>
            <td data-label="Qty" style="padding: 12px;">
              <input type="number" class="inventory-stock-input" data-id="${data.id}" value="${qty}" step="0.01" style="width: 80px; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: var(--white); text-align: right; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.2)'">
            </td>
            <td data-label="Last Price" style="padding: 12px; font-weight:bold; color:var(--white);">$${(data.lastPrice || 0).toFixed(2)}</td>
            <td data-label="Avg Price" style="padding: 12px; color:var(--gray);">$${(avgPrice || 0).toFixed(2)}</td>
            <td data-label="Trend" style="padding: 12px;">${priceTrendHtml}</td>
            <td data-label="Actions" style="padding: 12px; text-align: right;">
              <button class="btn-outline btn-small" onclick="deleteInventoryItem('${data.id}')" style="border-color: rgba(244,67,54,0.3); color: #f44336;">Del</button>
            </td>
         `;
         inventoryTbody.appendChild(tr);
      });

      // Attach inline editing listeners
      document.querySelectorAll('.inventory-stock-input').forEach(input => {
         input.addEventListener('change', async (e) => {
             const id = e.target.getAttribute('data-id');
             const val = e.target.value;
             try {
                 await updateDoc(doc(db, 'inventory', id), { stockQuantity: parseFloat(val) || 0 });
                 e.target.style.borderColor = "#4caf50";
                 setTimeout(() => e.target.style.borderColor = "rgba(255,255,255,0.2)", 1500);
             } catch (err) {
                 console.error(err);
                 alert("Failed to update stock");
             }
         });
      });
    };

    if (inventoryTbody) {
       window.inventoryUnsub = onSnapshot(collection(db, 'inventory'), (snapshot) => {
          inventoryDataCache = [];
          snapshot.forEach(docSnap => {
             const data = docSnap.data();
             data.id = docSnap.id;
             inventoryDataCache.push(data);
          });
          const currentFilter = inventorySearch ? inventorySearch.value : "";
          renderInventory(currentFilter);
       }, (err) => {
          console.error("Inventory sync error:", err);
          inventoryTbody.innerHTML = '<tr><td colspan="7" style="padding: 24px; text-align: center; color: #f44336;">Error loading inventory. Check console.</td></tr>';
       });

       if (inventorySearch) {
          inventorySearch.addEventListener('input', (e) => {
             renderInventory(e.target.value);
          });
       }

       // Add Inventory Flow
       const btnAddInventory = document.getElementById('btn-add-inventory');
       const addInventoryModal = document.getElementById('add-inventory-modal');
       const addInventoryForm = document.getElementById('add-inventory-form');
       
       if (btnAddInventory && addInventoryModal) {
         btnAddInventory.addEventListener('click', () => {
           addInventoryModal.classList.add('open');
         });
       }
       
       if (addInventoryForm) {
         addInventoryForm.addEventListener('submit', async (e) => {
           e.preventDefault();
           const name = document.getElementById('add-inv-name').value.trim();
           const cat = document.getElementById('add-inv-category').value.trim();
           const stock = parseFloat(document.getElementById('add-inv-stock').value) || 0;
           const price = parseFloat(document.getElementById('add-inv-price').value) || 0;
           
           if(!name) return alert("Item name is required.");
           
           const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
           try {
             await setDoc(doc(db, 'inventory', docId), {
               name: name,
               category: cat,
               stockQuantity: stock,
               lastPrice: price,
               priceHistory: [{ date: new Date(), price: price }],
               updatedAt: serverTimestamp()
             });
             addInventoryModal.classList.remove('open');
             addInventoryForm.reset();
             showToast("Item added successfully");
           } catch(err) {
             console.error(err);
             alert("Failed to add inventory item.");
           }
         });
       }
    }
  };
  
  window.deleteInventoryItem = async (id) => {
    if(!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
      showToast("Item deleted");
    } catch(err) {
      console.error(err);
      alert("Failed to delete item");
    }
  };
  
  window.updateInventoryStock = async (id, val) => {
     try {
        await updateDoc(doc(db, 'inventory', id), { stockQuantity: parseFloat(val) || 0 });
     } catch (e) {
        console.error(e);
        alert("Failed to update stock");
     }
  };



