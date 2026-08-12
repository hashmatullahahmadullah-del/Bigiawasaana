import { loadAnalytics } from './expenses.js';
import { renderLiveOrders, renderCatering, showToast } from './orders.js';
import { loadPickupSettings, renderUpcomingScheduledOrders } from './settings.js';
import { crmNav, toggleMobileMenu, state, renderDashboard, renderCustomers, renderAllOrders, renderReviews, renderLoyalty } from './shared.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';



export function initCRMData() {
  // 1. Listen to Settings
  window.settingsUnsub = onSnapshot(doc(db, 'settings', 'loyalty'), (docSnap) => {
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
  window.reviewsUnsub = onSnapshot(rq, (snapshot) => {
    state.reviews = [];
    snapshot.forEach(d => {
      state.reviews.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() });
    });
    renderReviews();
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
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play();
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
        custMap[phone].loyaltyPoints += Math.floor(parsedTotal); // 1 point per $1 spent
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
  window.cateringUnsub = onSnapshot(cq, (snapshot) => {
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
    window.dealsUnsub = initDealsListener();
  }

  // 7. Load Pickup Settings
  loadPickupSettings();

  // 8. Listen to Unit Economics Settings
  window.unitSettingsUnsub = onSnapshot(doc(db, 'unitEconomics_settings', 'config'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitSettings = { ...state.unitSettings, ...docSnap.data() };
    }
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  // 9. Listen to Unit Economics Platforms
  window.unitPlatformsUnsub = onSnapshot(doc(db, 'unitEconomics_platforms', 'rates'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitPlatforms = { ...state.unitPlatforms, ...docSnap.data() };
    }
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  // 10. Listen to Unit Economics Ingredients
  const ingredientsQuery = query(collection(db, 'unitEconomics_ingredients'), orderBy('name', 'asc'));
  window.ingredientsUnsub = onSnapshot(ingredientsQuery, (snapshot) => {
    state.ingredients = [];
    snapshot.forEach(d => state.ingredients.push({ id: d.id, ...d.data() }));
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  // 11. Listen to Unit Economics Events
  const eventsQuery = query(collection(db, 'unitEconomics_events'), orderBy('date', 'desc'));
  window.eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
    state.events = [];
    snapshot.forEach(d => state.events.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() }));
    if (typeof renderEconomics === 'function') renderEconomics();
  });

  loadAnalytics();
  initEconomicsListeners();
}

export async function loadTvPromoSettings() {
  onSnapshot(doc(db, 'settings', 'tv_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('tv-promo-active').checked = data.active || false;
      document.getElementById('tv-promo-text').value = data.text || '';
      toggleTvPromoEditor(data.active);
    }
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

