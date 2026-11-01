import './style.css';
import { db, app } from './firebase.js';
import { collection, addDoc, getDocs, serverTimestamp, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { evaluateDeals } from './lib/deals-evaluator.js';
import { getLang, t } from './i18n/index.js';
import { iconBolt, iconCard, iconCheck, iconFlame, iconPlus, iconMinus, iconTrash, iconUtensils, iconSparkle, iconGift, iconDrinkCan, iconSkewer, iconVoucher, renderTierBadge } from './icons.js';
import './analytics.js';
import './lib/button-utils.js';

// ─────────────────────────────────────────────────────────────────
// SQUARE CONFIGURATION
// Replace with your Sandbox Application ID from developer.squareup.com
// In production, swap for your Production Application ID
// ─────────────────────────────────────────────────────────────────
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID;
const TAX_RATE = 0.1025; // LA County / Reseda sales tax rate (10.25%)

// Firebase Functions (lazy loaded only on payment/checkout flow)
let functionsModulePromise = null;
async function callFirebaseFunction(name, data) {
  if (!functionsModulePromise) {
    functionsModulePromise = import('firebase/functions').then(({ getFunctions, httpsCallable }) => {
      return { functions: getFunctions(app), httpsCallable };
    });
  }
  const { functions, httpsCallable } = await functionsModulePromise;
  const callable = httpsCallable(functions, name);
  return callable(data);
}

// Menu data loaded from Firestore (with fallback canonical items)
const DEFAULT_MENU_ITEMS = [
  {
    "id": "2YsE0bWoYyJyrMvHQZ5v",
    "name": "Bigi's Kobideh Kabob Skewer",
    "desc": "A charcoal-grilled ground beef kabob skewer served over rice or bread with fresh salad.",
    "price": 19.99,
    "category": "charcoal kabobs",
    "img": "/m-img/1787957249457_BigiAwasaana_KobidehKabob.webp",
    "slug": "bigi-s-kobideh-kabob-skewer",
    "featured": true
  },
  {
    "id": "HasuTY0MWin3nn5IkZcb",
    "name": "Bigi's Chicken Tikka Kabob Plate",
    "desc": "Chunks of marinated chicken breast bathed overnight in yogurt, ginger, garlic, and proprietary Afghan spices, charcoal-grilled to caramelized perfection.",
    "price": 17.99,
    "category": "charcoal kabobs",
    "img": "/m-img/1790463609278_BigiAwasaana_ChickenTikaKabob.webp",
    "slug": "bigi-s-chicken-tikka-kabob-plate",
    "featured": true
  },
  {
    "id": "yfIiD4H87iuPMpR9zdoN",
    "name": "Bigi's Tikka Kabab Plate",
    "desc": "Tender chunks of marinated Zabiha Halal beef or chicken tikka charcoal-grilled over live hardwood embers.",
    "price": 19.99,
    "category": "charcoal kabobs",
    "img": "/m-img/1789064755515_BigiAwasaana_BeefTikaKabob.webp",
    "slug": "bigi-s-tikka-kabab-plate",
    "featured": false
  },
  {
    "id": "XvAjowz3KjiWQopaHAvb",
    "name": "Bigi's Chapli Kabob",
    "desc": "A wide, flat Pashtun patty of seasoned ground beef with tomatoes, onions, coriander, and green chili, seared for crispy edges and a juicy center.",
    "price": 17.99,
    "category": "charcoal kabobs",
    "img": "/m-img/1791950307107_1000004875.webp",
    "slug": "bigi-s-chapli-kabob",
    "featured": true
  },
  {
    "id": "PgKqdCkeN8gwklvL4rlR",
    "name": "Bigi's Cheese Kabob Stick",
    "desc": "Charcoal-grilled kabob skewer wrapped in a sizzling layer of melted cheese.",
    "price": 10.99,
    "category": "charcoal kabobs",
    "img": "/m-img/1791950199331_1000004877.webp",
    "slug": "bigi-s-cheese-kabob-stick",
    "featured": false
  },
  {
    "id": "cv7CVaf8ZPl3RX31F8Vb",
    "name": "Bigi's Qabuli Palau Lamb Shank",
    "desc": "Tender lamb shank slow-braised under spiced sella basmati rice, crowned with caramelized carrots and sweet raisins.",
    "price": 19.99,
    "category": "traditional afghan plates",
    "img": "/m-img/1788493414501_BigiAwasaana_QabuliPalau.webp",
    "slug": "bigi-s-qabuli-palau-lamb-shank",
    "featured": true
  },
  {
    "id": "sB2T62F4PX8EreJq9Q4a",
    "name": "Bigi's Beef Gyro Rice Bowl",
    "desc": "Grilled beef gyro carved over fragrant basmati rice with crisp side salad and house sauces.",
    "price": 14.99,
    "category": "traditional afghan plates",
    "img": "/m-img/1790468044644_BigiAwasaana_BeefGyroPlate.webp",
    "slug": "bigi-s-beef-gyro-rice-bowl",
    "featured": false
  },
  {
    "id": "2lCvDYF1DilvP1caQjoL",
    "name": "Bigi's Chicken Gyro Rice Bowl",
    "desc": "Grilled chicken gyro carved over fragrant basmati rice, finished with a side salad and house dipping sauces.",
    "price": 12.99,
    "category": "traditional afghan plates",
    "img": "/m-img/1790390079047_BigiAwasaana_ChickenGyroPlate.webp",
    "slug": "bigi-s-chicken-gyro-rice-bowl",
    "featured": false
  },
  {
    "id": "63S1WsuVjtkMfaLnYzIq",
    "name": "Bigi's Smash Burger",
    "desc": "A 100% Zabiha Halal beef patty smashed thin on a 450° griddle for crispy lacey edges, melted cheese, and Bigi's house sauce.",
    "price": 13,
    "category": "burgers & sandwiches",
    "img": "/m-img/1786154168119_1000063335.webp",
    "slug": "bigi-s-smash-burger",
    "featured": false
  },
  {
    "id": "NZJHy1ZIBfgYH47oC2Wz",
    "name": "Bigi's Silk Road Wrap AKA Afghan Burger",
    "desc": "A loaded lavash wrap stuffed with charcoal-grilled kabobs, crispy french fries, fresh veggies, and house sauces.",
    "price": 9.99,
    "category": "burgers & sandwiches",
    "img": "/m-img/1790390925304_BigiAwasaana_AfganiBargar.webp",
    "slug": "bigi-s-silk-road-wrap-aka-afghan-burger",
    "featured": true
  },
  {
    "id": "JbIeZPCUejQkuz5QAYnz",
    "name": "Bigi's Beef Shawarma Wrap",
    "desc": "Marinated beef thigh, slow-stacked and carved, wrapped in warm flatbread with garlic toum, pickled veggies, and fresh herbs.",
    "price": 14.99,
    "category": "wraps & rolls",
    "img": "/m-img/1788494404914_ChatGPT-Image-Sep-3--2026--08_48_25-PM.webp",
    "slug": "bigi-s-beef-shawarma-wrap",
    "featured": false
  },
  {
    "id": "gaN3Y2lOV6eHPYhC3Anb",
    "name": "Bigi's Chicken Shawarma Wrap",
    "desc": "Marinated chicken thigh slow-stacked and carved, wrapped in warm flatbread with garlic toum, pickled vegetables, and herbs.",
    "price": 11.99,
    "category": "wraps & rolls",
    "img": "/m-img/1788494143573_BigiAwasaana_BigisShawarmaWrap.webp",
    "slug": "bigi-s-chicken-shawarma-wrap",
    "featured": false
  },
  {
    "id": "BNoJY3IGYgUxeLkdrMna",
    "name": "Bigi's Bolani",
    "desc": "Crisp pan-seared Afghan flatbread stuffed with spiced potatoes, scallions, and herbs, served with cool garlic cilantro chutney.",
    "price": 7.99,
    "category": "street bites & sides",
    "img": "/m-img/1788493142188_BigiAwasaana_BolaniPotato.webp",
    "slug": "bigi-s-bolani",
    "featured": true
  },
  {
    "id": "FEMCaQpZlF1Tm0Q63TBz",
    "name": "Bigi's Chicken Samosa",
    "desc": "A golden shatteringly crispy pastry filled with seasoned minced chicken, onions, cilantro, and warm Afghan spices.",
    "price": 2.99,
    "category": "street bites & sides",
    "img": "/m-img/1788130453606_BigiAwasaana_BigChickenSamosa.webp",
    "slug": "bigi-s-chicken-samosa",
    "featured": false
  },
  {
    "id": "VbCgaDPsaZODs7u68uOK",
    "name": "Bigi's Veg Samosa",
    "desc": "Crispy fried pastry pocket stuffed with spiced potatoes and sweet green peas, served with tangy chutney.",
    "price": 1.99,
    "category": "street bites & sides",
    "img": "/m-img/1786152891068_1000063326.webp",
    "slug": "bigi-s-veg-samosa",
    "featured": false
  },
  {
    "id": "DOPmbJJnWGQdJXE38jTO",
    "name": "Bigi's Chicken Soup",
    "desc": "A deeply flavored Afghan chicken broth with tender pulled chicken, aromatic vegetables, and house spices.",
    "price": 6.99,
    "category": "street bites & sides",
    "img": "/m-img/1788493169048_BigiAwasaana_ChickenSoup.webp",
    "slug": "bigi-s-chicken-soup",
    "featured": false
  },
  {
    "id": "O2EisQzW3PeTikdmr96N",
    "name": "Bigi's Firni",
    "desc": "Silky chilled Afghan milk pudding set with ground rice, perfumed with rosewater, green cardamom, and crushed pistachios.",
    "price": 3.99,
    "category": "desserts & beverages",
    "img": "/m-img/1788130417913_BigiAwasaana_Firmi.webp",
    "slug": "bigi-s-firni",
    "featured": false
  },
  {
    "id": "kXWoq1hkNx4azjZcuuf0",
    "name": "Bigi's Doogh",
    "desc": "A chilled lightly sparkling Afghan yogurt drink seasoned with dried wild mint, cucumber, and sea salt.",
    "price": 4.99,
    "category": "desserts & beverages",
    "img": "/m-img/1790103676733_BigiAwasaana_YougurtDrinkDogh.webp",
    "slug": "bigi-s-doogh",
    "featured": false
  },
  {
    "id": "dK5c0LLrWSIspnaykCGo",
    "name": "Milk Tea - Chai",
    "desc": "Freshly brewed loose-leaf black tea slow-simmered with whole milk and green cardamom.",
    "price": 2.49,
    "category": "desserts & beverages",
    "img": "/m-img/1790103595926_BigiAwasaana_KadhakChai_2880x2304.webp",
    "slug": "milk-tea-chai",
    "featured": false
  },
  {
    "id": "umtvEZ6d98Rb4K0conY1",
    "name": "Soft Drinks",
    "desc": "A chilled selection of canned and bottled sodas including Coke, Diet Coke, Sprite, and Fanta.",
    "price": 2.45,
    "category": "desserts & beverages",
    "img": "/m-img/1788130024385_101757-middle.webp",
    "slug": "soft-drinks",
    "featured": false
  },
  {
    "id": "9LXen2r7xbZMFFk9MVxG",
    "name": "Bottled Water",
    "desc": "Pure, chilled bottled spring water.",
    "price": 0.99,
    "category": "desserts & beverages",
    "img": "/m-img/bottled-water.webp",
    "slug": "bottled-water",
    "featured": false
  }
];

let menuItems = [...DEFAULT_MENU_ITEMS];
window.menuItems = menuItems;
// State
const CART_STORAGE_KEY = 'bigi_cart';
let cart = [];
let activeDeals = [
  {
    id: 'kabob-lovers-deal',
    title: 'Kabob Lovers Deal',
    description: 'Order any 2 Kabob Plates and get a FREE Soft Drink of your choice!',
    badge: 'LIMITED TIME COMBO',
    active: true,
    showOnSite: true,
    type: 'free_item',
    conditions: { minQty: 2 },
    reward: { rewardItemIds: ['umtvEZ6d98Rb4K0conY1'], discountPercent: 100 }
  }
];
let appliedPromoCodes = []; // list of manually applied codes

function loadSavedCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('bigi_cart_backup');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cart = parsed
          .filter(i => i && typeof i === 'object')
          .map(i => {
            const price = parseFloat(i.price) || parseFloat(i.originalPrice) || 0;
            const qty = parseInt(i.qty, 10) || 1;
            return {
              ...i,
              name: i.name || 'Menu Item',
              price: price,
              qty: Math.max(1, qty),
              cartKey: i.cartKey || `${i.id || Math.random()}||`
            };
          })
          .filter(i => i.price > 0 || i.isLoyaltyReward || i.isReward || i.isFree);
      }
    }
  } catch (e) {
    console.warn('Failed to load saved cart:', e);
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    localStorage.setItem('bigi_cart_backup', JSON.stringify(cart));
  } catch (e) {
    console.warn('Failed to save cart:', e);
  }
}

// Initial cart load from localStorage immediately
loadSavedCart();
window.loadSavedCart = loadSavedCart;
window.saveCart = saveCart;
window.updateCartUI = updateCartUI;

let squareCard = null; // Square card payment method instance

// Pickup State
let pickupConfig = {
  basePrepTimeMinutes: 15,
  perOrderIncrementMinutes: 3,
  maxWaitMinutes: 60,
  minLeadTimeMinutes: 20,
  maxScheduleDaysAhead: 3,
  slotIntervalMinutes: 15,
  prepBufferBeforeCloseMinutes: 30,
  businessHours: { open: "13:00", close: "22:30" }
};
let activeAsapOrderCount = 0;

// Load Pickup Config
const isHomepage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';

if (isHomepage) {
  // 1. Sync store hours synchronously from localStorage cache to prevent layout shift
  try {
    const cachedConfig = localStorage.getItem('pickupConfig');
    if (cachedConfig) {
      pickupConfig = { ...pickupConfig, ...JSON.parse(cachedConfig) };
      if (typeof checkBusinessHours === 'function') checkBusinessHours();
      updateFooterHours();
    }
  } catch (e) {}

  // 2. Fetch single one-time getDoc after first paint without opening long-lived channels
  const fetchStoreConfig = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'pickupConfig'));
      if (docSnap.exists()) {
        pickupConfig = { ...pickupConfig, ...docSnap.data() };
        try { localStorage.setItem('pickupConfig', JSON.stringify(pickupConfig)); } catch (e) {}
        if (typeof checkBusinessHours === 'function') checkBusinessHours();
        updateFooterHours();
      }
    } catch (e) {
      // Fail silently without console errors on network timeout
    }
  };

  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fetchStoreConfig, { timeout: 3500 });
    } else {
      setTimeout(fetchStoreConfig, 1500);
    }
  }
} else {
  // Realtime listeners for active ordering surfaces (menu, checkout, cart)
  onSnapshot(doc(db, 'settings', 'pickupConfig'), (docSnap) => {
    if (docSnap.exists()) {
      pickupConfig = { ...pickupConfig, ...docSnap.data() };
      try { localStorage.setItem('pickupConfig', JSON.stringify(pickupConfig)); } catch (e) {}
      updateAsapEstimate();
      if (typeof checkBusinessHours === 'function') checkBusinessHours();
      updateFooterHours();
    }
  }, () => {});

  onSnapshot(doc(db, 'liveStats', 'current'), (docSnap) => {
    if (docSnap.exists()) {
      activeAsapOrderCount = docSnap.data().activeAsapOrderCount || 0;
      updateAsapEstimate();
    }
  }, () => {});
}

function updateFooterHours() {
  if (!pickupConfig.businessHours) return;

  // If temporarily closed, show that status in footer/hero
  if (pickupConfig.temporarilyClosed) {
    document.querySelectorAll('.footer-hours-display').forEach(el => {
      el.textContent = 'Temporarily Closed';
    });
    document.querySelectorAll('.hero-hours-display').forEach(el => {
      el.textContent = 'Temporarily Closed';
    });
    document.querySelectorAll('.hero-days-display').forEach(el => {
      el.textContent = '';
    });
    return;
  }

  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const openDays = pickupConfig.openDays || [1, 2, 3, 4, 5, 6];
  let openDaysStr = 'Mon–Sat (Sun Closed)';
  if (openDays.length === 7) {
    openDaysStr = 'Every Day';
  } else if (openDays.length === 6 && !openDays.includes(0)) {
    openDaysStr = 'Mon–Sat (Sun Closed)';
  } else {
    openDaysStr = openDays.map(d => daysMap[d].substring(0,3)).join(', ');
  }
    
  function formatTime(time24) {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    let displayH = h % 12;
    displayH = displayH ? displayH : 12;
    return `${displayH}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
  }
  
  const openTime = formatTime(pickupConfig.businessHours.open);
  const closeTime = formatTime(pickupConfig.businessHours.close);
  
  // Format 1: e.g. "Mon–Sat (Sun Closed) 1:00 PM–10:30 PM"
  const fullText = `${openDaysStr} ${openTime}–${closeTime}`;
  document.querySelectorAll('.footer-hours-display').forEach(el => {
    el.textContent = fullText;
  });
  
  // Format 2: e.g. "1:00 PM – 10:30 PM" (Used in hero/location headers)
  const timeOnlyText = `${openTime} – ${closeTime}`;
  document.querySelectorAll('.hero-hours-display').forEach(el => {
    el.textContent = timeOnlyText;
  });
  
  // Format 3: Update "Open Every Day" separately if needed
  document.querySelectorAll('.hero-days-display').forEach(el => {
    el.textContent = openDaysStr === 'Every Day' ? 'Every Day' : openDaysStr;
  });
}

// ──────────────────────────────────────────
// BUSINESS HOURS ENFORCEMENT
// ──────────────────────────────────────────
window.isStoreClosed = false;

function checkBusinessHours() {
  // ── TEMPORARILY CLOSED override (synced from Google Maps) ──
  if (pickupConfig.temporarilyClosed) {
    window.isStoreClosed = true;

    let banner = document.getElementById('store-closed-banner');
    const message = 'We are temporarily closed. Please check back soon for updates on our reopening. Thank you for your patience!';

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'store-closed-banner';
      banner.className = 'store-closed-banner temporarily-closed';
      banner.innerHTML = `<span><svg style="width:20px;height:20px;fill:currentColor;vertical-align:middle;margin-right:8px" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>${message}</span>`;
      document.body.prepend(banner);
    } else {
      banner.className = 'store-closed-banner temporarily-closed';
      banner.innerHTML = `<span><svg style="width:20px;height:20px;fill:currentColor;vertical-align:middle;margin-right:8px" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>${message}</span>`;
    }
    return;
  }

  // ── Normal business hours check ──
  // Get current time in Los Angeles timezone to prevent device time spoofing
  const nowString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
  const now = new Date(nowString);
  if (!pickupConfig.businessHours) return;
  const [openH, openM] = pickupConfig.businessHours.open.split(':').map(Number);
  const [closeH, closeM] = pickupConfig.businessHours.close.split(':').map(Number);
  
  const currentH = now.getHours();
  const currentM = now.getMinutes();
  
  const currentTime = currentH * 60 + currentM;
  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;
  
  let isClosed = false;
  
  // 1. Check if today is a valid open day
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
  if (pickupConfig.openDays && Array.isArray(pickupConfig.openDays)) {
    if (!pickupConfig.openDays.includes(currentDay)) {
      isClosed = true;
    }
  }
  
  // 2. Check time
  if (!isClosed) {
    if (closeTime > openTime) {
      if (currentTime < openTime || currentTime >= closeTime) isClosed = true;
    } else {
      // Crosses midnight e.g. open 11:00, close 02:00
      if (currentTime < openTime && currentTime >= closeTime) isClosed = true;
    }
  }
  
  window.isStoreClosed = isClosed;

  // Toggle banner
  let banner = document.getElementById('store-closed-banner');
  if (isClosed) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'store-closed-banner';
      banner.className = 'store-closed-banner';
      
      const pType = document.querySelector('input[name="pickup_type"]:checked')?.value || 'asap';
      let message = `We are currently closed. Next open at ${pickupConfig.businessHours.open}`;
      
      if (pType === 'asap') {
         message += " — ASAP ordering is disabled. Please select a Scheduled pickup time.";
      }
      
      banner.innerHTML = `<span><svg style="width:20px;height:20px;fill:currentColor;vertical-align:middle;margin-right:8px" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-.22-13h-.06c-.4 0-.72.32-.72.72v4.72c0 .35.18.68.49.86l4.15 2.49c.34.2.78.1.98-.24a.71.71 0 00-.25-.99l-3.87-2.3V7.72c0-.4-.32-.72-.72-.72z"/></svg>${message}</span>`;
      document.body.prepend(banner);
    } else {
      banner.className = 'store-closed-banner'; // remove temporarily-closed class if it was there before
      const pType = document.querySelector('input[name="pickup_type"]:checked')?.value || 'asap';
      let message = `We are currently closed. Next open at ${pickupConfig.businessHours.open}`;
      if (pType === 'asap') {
         message += " — ASAP ordering is disabled. Please select a Scheduled pickup time.";
      }
      banner.innerHTML = `<span><svg style="width:20px;height:20px;fill:currentColor;vertical-align:middle;margin-right:8px" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-.22-13h-.06c-.4 0-.72.32-.72.72v4.72c0 .35.18.68.49.86l4.15 2.49c.34.2.78.1.98-.24a.71.71 0 00-.25-.99l-3.87-2.3V7.72c0-.4-.32-.72-.72-.72z"/></svg>${message}</span>`;
    }
    document.body.classList.add('has-store-closed-banner');
    const updateBannerHeight = () => {
      requestAnimationFrame(() => {
        if (banner) {
          const h = banner.getBoundingClientRect().height;
          if (h) document.documentElement.style.setProperty('--banner-height', `${Math.round(h)}px`);
        }
      });
    };
    updateBannerHeight();
    if (!window.__bannerResizeBound) {
      window.__bannerResizeBound = true;
      window.addEventListener('resize', updateBannerHeight);
    }
  } else {
    if (banner) banner.remove();
    document.body.classList.remove('has-store-closed-banner');
    document.documentElement.style.setProperty('--banner-height', '0px');
  }
}

function updateAsapEstimate() {
  const el = document.getElementById('asap-estimate');
  if (el) {
    const rawWait = pickupConfig.basePrepTimeMinutes + (activeAsapOrderCount * pickupConfig.perOrderIncrementMinutes);
    const wait = Math.min(rawWait, pickupConfig.maxWaitMinutes);
    el.textContent = `(~${wait} min)`;
  }
}

window.togglePickupType = () => {
  const pType = document.querySelector('input[name="pickup_type"]:checked').value;
  if (pType === 'scheduled') {
    document.getElementById('scheduled-pickup-options').style.display = 'block';
    populateDates();
  } else {
    document.getElementById('scheduled-pickup-options').style.display = 'none';
  }
  if (typeof checkBusinessHours === 'function') checkBusinessHours();
  if (typeof updateCartUI === 'function') updateCartUI();
};

function populateDates() {
  const dateSelect = document.getElementById('pickup-date-select');
  if (!dateSelect) return;
  dateSelect.innerHTML = '';
  
  const now = new Date();
  
  for (let i = 0; i <= pickupConfig.maxScheduleDaysAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dayOfWeek = d.getDay();
    if (pickupConfig.openDays && Array.isArray(pickupConfig.openDays) && !pickupConfig.openDays.includes(dayOfWeek)) {
      continue;
    }
    const opt = document.createElement('option');
    opt.value = d.toISOString().split('T')[0];
    opt.textContent = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    dateSelect.appendChild(opt);
  }
  
  updateTimeSlots();
}

window.updateTimeSlots = updateTimeSlots;
function updateTimeSlots() {
  const dateStr = document.getElementById('pickup-date-select').value;
  const timeSelect = document.getElementById('pickup-time-select');
  if (!dateStr || !timeSelect) return;
  timeSelect.innerHTML = '';
  
  const now = new Date();
  const selectedDate = new Date(dateStr + "T00:00:00");
  const isToday = selectedDate.getDate() === now.getDate() && selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear();
  
  const [openH, openM] = pickupConfig.businessHours.open.split(':').map(Number);
  const [closeH, closeM] = pickupConfig.businessHours.close.split(':').map(Number);
  
  let startH = openH;
  let startM = openM;
  
  if (isToday) {
    // If today, start from now + lead time
    const leadMs = pickupConfig.minLeadTimeMinutes * 60000;
    const earliestTime = new Date(now.getTime() + leadMs);
    
    if (earliestTime.getHours() > startH || (earliestTime.getHours() === startH && earliestTime.getMinutes() > startM)) {
       startH = earliestTime.getHours();
       startM = Math.ceil(earliestTime.getMinutes() / pickupConfig.slotIntervalMinutes) * pickupConfig.slotIntervalMinutes;
       if (startM >= 60) {
         startH++;
         startM = 0;
       }
    }
  }
  
  // End time is close - buffer
  let endH = closeH;
  let endM = closeM - pickupConfig.prepBufferBeforeCloseMinutes;
  if (endM < 0) {
    endH--;
    endM += 60;
  }
  
  let currentH = startH;
  let currentM = startM;
  let hasSlots = false;
  
  while (currentH < endH || (currentH === endH && currentM <= endM)) {
    hasSlots = true;
    const ampm = currentH >= 12 ? 'PM' : 'AM';
    const displayH = currentH % 12 === 0 ? 12 : currentH % 12;
    const displayM = currentM.toString().padStart(2, '0');
    
    const opt = document.createElement('option');
    opt.value = `${currentH.toString().padStart(2, '0')}:${displayM}:00`;
    opt.textContent = `${displayH}:${displayM} ${ampm}`;
    timeSelect.appendChild(opt);
    
    currentM += pickupConfig.slotIntervalMinutes;
    if (currentM >= 60) {
      currentH++;
      currentM -= 60;
    }
  }
  
  if (!hasSlots) {
    document.getElementById('pickup-time-warning').style.display = 'block';
    timeSelect.disabled = true;
  } else {
    document.getElementById('pickup-time-warning').style.display = 'none';
    timeSelect.disabled = false;
  }
}

// ─────────────────────────────────────────────────────────────────
// MENU LOADING
// ─────────────────────────────────────────────────────────────────
async function loadMenuFromFirestore() {
  const grid = document.getElementById('menu-grid');
  const featuredGrid = document.getElementById('featured-menu-grid');
  if (!grid && !featuredGrid) {
    return;
  }
  await fetchMenuData();
}

async function fetchMenuData() {
  const grid = document.getElementById('menu-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-content">
          <div class="skeleton-text-title"></div>
          <div class="skeleton-text-desc"></div>
          <div class="skeleton-text-desc short"></div>
        </div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-content">
          <div class="skeleton-text-title"></div>
          <div class="skeleton-text-desc"></div>
          <div class="skeleton-text-desc short"></div>
        </div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-content">
          <div class="skeleton-text-title"></div>
          <div class="skeleton-text-desc"></div>
          <div class="skeleton-text-desc short"></div>
        </div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-content">
          <div class="skeleton-text-title"></div>
          <div class="skeleton-text-desc"></div>
          <div class="skeleton-text-desc short"></div>
        </div>
      </div>
    `;
  }

  try {
    const snapshot = await getDocs(collection(db, 'menu'));
    if (!snapshot.empty) {
      // Helper to convert existing firebasestorage URLs to SEO-friendly rewritten paths
      function getSEOImageUrl(url) {
        if (url && typeof url === 'string' && url.includes('firebasestorage.googleapis.com') && url.includes('menu-images')) {
          const match = url.match(/menu-images%2F([^?&]+)/);
          if (match && match[1]) {
            return `/m-img/${match[1]}?cb=2`;
          }
        }
        return url;
      }

      menuItems = snapshot.docs.map(doc => {
        const data = doc.data();
        const itemName = data.name || 'Untitled';
        const itemSlug = data.slug || itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return {
          id: doc.id,
          name: itemName,
          slug: itemSlug,
          desc: data.desc || data.description || '',
          price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
          category: (data.category || 'platters').toLowerCase(),
          img: getSEOImageUrl(data.img || data.image || data.imageUrl || ''),
          featured: !!data.featured,
          hidden: !!data.hidden,
          mealLinkId: data.mealLinkId || null,
          calories: data.calories || null,
          variants: Array.isArray(data.variants) ? data.variants : [],
          addOns: Array.isArray(data.addOns) ? data.addOns : []
        };
      });
      window.menuItems = menuItems;

      // Build category pills dynamically from Firestore data
      buildCategoryPills();
      
      // Render dynamic SEO item links on menu page
      renderSEOItemLinks();
      
      // Render featured menu on home page if element exists
      renderFeaturedMenu();
      
      // Render specials on specials page if element exists
      if (typeof window.renderSpecials === 'function') {
        window.renderSpecials();
      }
      if (typeof handleDealParam === 'function') {
        handleDealParam();
      }
    }
  } catch (error) {
    console.error('Error loading menu from Firestore:', error);
  }

  if (menuItems.length === 0) {
    if (grid) {
      grid.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px 0;">Menu coming soon! Check back later.</p>';
    }
    return;
  }

  renderMenu('all');
  initDealsListener();
  handleReorderParam();
  handleAddItemParam();
  handleDealParam();
  handleRedeemParam();
}



function addToCartRewardItem(item, reward) {
  const cartKey = 'reward_' + (reward.voucherCode || item.id);
  const existing = cart.find(i => i.cartKey === cartKey || (i.isLoyaltyReward && i.voucherCode === reward.voucherCode));
  if (existing) {
    showToast('Reward item is already in your bag!');
    if (typeof toggleCart === 'function') toggleCart(true);
    return;
  }

  cart.push({
    id: item.id,
    cartKey: cartKey,
    name: item.name || reward.rewardTitle || 'Reward Item',
    price: 0.00,
    originalPrice: item.price || 0.00,
    qty: 1,
    img: item.img || reward.imageUrl || '',
    isLoyaltyReward: true,
    voucherCode: reward.voucherCode,
    rewardId: reward.rewardId,
    pointsSpent: reward.pointsCost
  });

  saveCart();
  updateCartUI();
  showToast('Added free ' + item.name + ' to your bag!');
  setTimeout(() => {
    if (typeof toggleCart === 'function') toggleCart(true);
  }, 350);
}

function handleRedeemParam() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const voucher = urlParams.get('redeem') || urlParams.get('voucher');
    const storedVoucher = sessionStorage.getItem('bigi_pending_reward');

    if (voucher || storedVoucher) {
      let reward = null;
      try {
        if (storedVoucher) reward = JSON.parse(storedVoucher);
      } catch (e) {}

      const tryAdd = () => {
        if (menuItems && menuItems.length > 0) {
          if (reward) {
            let item = null;
            if (reward.menuItemId) {
              item = menuItems.find(m => m.id === reward.menuItemId);
            }
            if (!item && reward.menuItemName) {
              item = menuItems.find(m => m.name && m.name.toLowerCase().includes(reward.menuItemName.toLowerCase()));
            }
            if (!item && reward.rewardTitle) {
              item = menuItems.find(m => m.name && reward.rewardTitle.toLowerCase().includes(m.name.toLowerCase()));
            }

            if (item) {
              addToCartRewardItem(item, reward);
              sessionStorage.removeItem('bigi_pending_reward');
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
              return true;
            } else if (reward.rewardType === 'discount_fixed') {
              sessionStorage.removeItem('bigi_pending_reward');
              showToast('Loyalty voucher ' + reward.voucherCode + ' ($5 off) applied!');
              if (typeof toggleCart === 'function') toggleCart(true);
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
              return true;
            }
          }
        }
        return false;
      };

      if (!tryAdd()) {
        setTimeout(tryAdd, 500);
        setTimeout(tryAdd, 1500);
      }
    }
  } catch (err) {
    console.error('Error handling redeem param:', err);
  }
}

function handleDealParam() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const dealId = urlParams.get('deal');
    if (!dealId) return;

    const tryOpen = () => {
      if (typeof openDealModal === 'function' && activeDeals && activeDeals.length > 0) {
        const found = activeDeals.find(d => d.id === dealId);
        if (found) {
          openDealModal(found.id);
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          return true;
        }
      }
      return false;
    };

    if (!tryOpen()) {
      setTimeout(tryOpen, 400);
      setTimeout(tryOpen, 1000);
    }
  } catch (err) {
    console.error('Error handling deal param:', err);
  }
}

function handleAddItemParam() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const addItemId = urlParams.get('addItem');
    if (!addItemId) return;

    const item = menuItems.find(m => m.id === addItemId);
    if (!item) return;

    const isSimple = (!item.variants || item.variants.length === 0) && (!item.addOns || item.addOns.length === 0) && !item.mealLinkId && item.category !== 'bigi street meals';

    if (isSimple) {
      addToCartDirect(item.id);
      setTimeout(() => {
        if (typeof toggleCart === 'function') toggleCart(true);
      }, 350);
    } else {
      setTimeout(() => {
        if (typeof openItemModal === 'function') openItemModal(item.id);
      }, 350);
    }

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (err) {
    console.error('Error handling addItem param:', err);
  }
}

async function handleReorderParam() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const reorderId = urlParams.get('reorder');
    const token = urlParams.get('token');
    if (!reorderId) return;

    let orderItems = [];

    // 1. Check if authenticated user staged items in sessionStorage from /order-history
    const sessionStaged = sessionStorage.getItem('bigi_reorder_cart');
    if (sessionStaged) {
      try {
        orderItems = JSON.parse(sessionStaged);
        sessionStorage.removeItem('bigi_reorder_cart');
      } catch (e) {}
    }

    // 2. If not staged in session, require token verification to prevent accessing previous purchases by guessing order ID
    if ((!orderItems || orderItems.length === 0) && reorderId) {
      if (!token) {
        showToast('To reorder, please use the link from your confirmation receipt or log into your account.');
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }

      try {
        const res = await callFirebaseFunction('getReorderItems', { orderId: reorderId, token });
        if (res.data && Array.isArray(res.data.items)) {
          orderItems = res.data.items;
        }
      } catch (callErr) {
        console.error('getReorderItems error:', callErr);
        showToast('Could not load past order to reorder.');
        return;
      }
    }

    if (!orderItems || orderItems.length === 0) return;

    let addedCount = 0;
    orderItems.forEach(oi => {
      let menuItem = null;
      if (oi.itemId) {
        menuItem = menuItems.find(m => m.id === oi.itemId);
      }
      if (!menuItem) {
        const cleanName = (oi.name || '').split('(')[0].split('[')[0].trim().toLowerCase();
        menuItem = menuItems.find(m => m.name.toLowerCase() === cleanName);
      }

      if (menuItem) {
        const qty = Math.max(1, parseInt(oi.quantity || oi.qty, 10) || 1);
        const variantText = oi.selectedVariant || '';
        const addOnsText = Array.isArray(oi.selectedAddOns) ? oi.selectedAddOns : [];
        const isMeal = !!oi.isMeal;
        const mealUpgradeId = oi.mealUpgradeId || null;
        const mealSuffix = isMeal ? '|MEAL' : '';
        const cartKey = oi.cartKey || `${menuItem.id}|${variantText}|${addOnsText.join(',')}${mealSuffix}`;

        const oiPrice = parseFloat(oi.price);
        const basePrice = parseFloat(menuItem.price) || 0;
        const finalPrice = (!isNaN(oiPrice) && oiPrice > 0) ? oiPrice : basePrice;

        const existing = cart.find(c => c.cartKey === cartKey);
        if (existing) {
          existing.qty = (parseInt(existing.qty, 10) || 0) + qty;
        } else {
          cart.push({
            ...menuItem,
            cartKey,
            qty,
            price: finalPrice,
            originalPrice: basePrice,
            selectedVariant: variantText,
            selectedAddOns: addOnsText,
            isMeal,
            mealUpgradeId,
            mealUpgradeCost: 0
          });
        }
        addedCount++;
      }
    });

    if (addedCount > 0) {
      const dealTitle = currentDealItem ? currentDealItem.title : 'Deal';
  saveCart();
      updateCartUI();
      toggleCart(true);
      showToast(`Added ${addedCount} item${addedCount === 1 ? '' : 's'} from your past order!`);
      if (orderData.customerName) {
        const nameInput = document.getElementById('customer-name');
        if (nameInput && !nameInput.value.trim()) nameInput.value = orderData.customerName;
      }
      if (orderData.customerPhone) {
        const phoneInput = document.getElementById('customer-phone');
        if (phoneInput && !phoneInput.value.trim()) {
          phoneInput.value = orderData.customerPhone;
          phoneInput.dispatchEvent(new Event('blur'));
        }
      }
    }

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (err) {
    console.error('Error reordering items:', err);
  }
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY PILLS
// ─────────────────────────────────────────────────────────────────
function buildCategoryPills() {
  const scrollContainer = document.querySelector('.cat-scroll');
  if (!scrollContainer) return;

  const categories = [...new Set(menuItems.map(i => i.category))];
  
  scrollContainer.innerHTML = '';
  
  // "All" pill
  const allPill = document.createElement('button');
  allPill.className = 'category-pill active';
  allPill.textContent = 'All';
  allPill.onclick = () => {
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    allPill.classList.add('active');
    renderMenu('all');
  };
  scrollContainer.appendChild(allPill);
  
  categories.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = 'category-pill';
    pill.textContent = cat.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    pill.onclick = () => {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderMenu(cat);
    };
    scrollContainer.appendChild(pill);
  });
}

// ─────────────────────────────────────────────────────────────────
// DYNAMIC SEO ITEM LINKS
// ─────────────────────────────────────────────────────────────────
function renderSEOItemLinks() {
  const container = document.getElementById('seo-item-links');
  if (!container) return;
  
  const linksHtml = menuItems
    .filter(i => !i.hidden)
    .map(i => {
      const slug = i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `<a href="/item/${slug}" style="color:var(--gray);font-size:14px;text-decoration:none;transition:color 0.2s;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--gray)'">Order Halal ${i.name}</a>`;
    })
    .join('<span style="color:var(--border);">|</span>');
    
  container.innerHTML = linksHtml;
}

// ─────────────────────────────────────────────────────────────────
// MENU RENDERING & MODALS (with "Add to Cart" buttons always visible)
// ─────────────────────────────────────────────────────────────────
function renderMenu(category) {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const itemsToRender = category === 'all' 
    ? menuItems.filter(item => !item.hidden)
    : menuItems.filter(item => item.category === category && !item.hidden);

  if (itemsToRender.length === 0) {
    grid.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px 0;">No items in this category.</p>';
    return;
  }
    
  itemsToRender.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    
    const lang = getLang();
    const displayName = lang === 'fa' && item.name_fa ? item.name_fa : item.name;
    const displayDesc = lang === 'fa' && item.desc_fa ? item.desc_fa : item.desc;
    
    let badgeHtml = '';
    if (item.featured) {
      badgeHtml = `<div class="menu-badge">Featured</div>`;
    } else if (item.category === 'bigi street meals') {
      badgeHtml = `<div class="menu-badge">Special</div>`;
    }

    const imgHtml = item.img 
      ? `<img src="${item.img}" alt="${displayName}" class="menu-card-img" loading="lazy" width="400" height="300">`
      : `<div class="premium-fallback">
           <div class="premium-fallback-icon">${iconUtensils(28)}</div>
         </div>`;
         
    const isSimple = (!item.variants || item.variants.length === 0) && (!item.addOns || item.addOns.length === 0) && !item.mealLinkId && item.category !== 'bigi street meals';
    const clickAction = isSimple ? `addToCartDirect('${item.id}', event)` : `openItemModal('${item.id}')`;
    const itemSlug = item.slug || (item.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    card.innerHTML = `
      ${badgeHtml}
      <a href="/item/${itemSlug}" onclick="if(!event.ctrlKey&&!event.metaKey){event.preventDefault();openItemModal('${item.id}');}" style="cursor: pointer; display: block; text-decoration: none;">
        ${imgHtml}
      </a>
      <div class="menu-card-content">
        <a href="/item/${itemSlug}" onclick="if(!event.ctrlKey&&!event.metaKey){event.preventDefault();openItemModal('${item.id}');}" style="text-decoration: none; color: inherit;">
          <h3 class="menu-card-title" style="cursor: pointer;">${displayName}</h3>
        </a>
        ${item.category === 'bigi street meals' ? `<div style="color: var(--accent); font-family: 'Barlow Condensed'; font-weight: 700; font-size: 14px; letter-spacing: 1px; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 4px;">${iconFlame(14)} INCLUDES FRIES & DRINK</div>` : ''}
        <p class="menu-card-desc">${displayDesc}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">$${item.price.toFixed(2)}</span>
          <button class="add-to-cart-btn btn-add-cart" onclick="${clickAction}">ADD</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
window.renderMenu = renderMenu;

// Render Featured Menu Items on Home page
function renderFeaturedMenu() {
  const grid = document.getElementById('featured-menu-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let featuredItems = menuItems.filter(item => item.featured && !item.hidden);
  
  // Fallback to first 3 items if no items are explicitly featured
  if (featuredItems.length === 0) {
    featuredItems = menuItems.filter(item => !item.hidden).slice(0, 3);
  }

  window.addFeaturedItemToMenu = function(id, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    window.location.href = `/menu?addItem=${encodeURIComponent(id)}`;
  };

  featuredItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.style.borderColor = 'var(--accent)';
    
    const lang = getLang();
    const displayName = lang === 'fa' && item.name_fa ? item.name_fa : item.name;
    const displayDesc = lang === 'fa' && item.desc_fa ? item.desc_fa : item.desc;
    
    let badgeHtml = `<div class="menu-badge">Featured</div>`;
    
    const imgHtml = item.img 
      ? `<img src="${item.img}" alt="${displayName}" class="menu-card-img" width="400" height="300">`
      : `<div class="premium-fallback">
           <div class="premium-fallback-icon">${iconUtensils(28)}</div>
         </div>`;
    
    const itemSlug = item.slug || (item.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    card.innerHTML = `
      ${badgeHtml}
      <a href="/item/${itemSlug}" style="display: block; cursor: pointer; text-decoration: none;">
        ${imgHtml}
      </a>
      <div class="menu-card-content">
        <a href="/item/${itemSlug}" style="text-decoration: none; color: inherit;">
          <h3 class="menu-card-title" style="cursor: pointer;">${displayName}</h3>
        </a>
        ${item.category === 'bigi street meals' ? `<div style="color: var(--accent); font-family: 'Barlow Condensed'; font-weight: 700; font-size: 14px; letter-spacing: 1px; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 4px;">${iconFlame(14)} INCLUDES FRIES & DRINK</div>` : ''}
        <p class="menu-card-desc">${displayDesc}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">$${(item.price || 0).toFixed(2)}</span>
          <button type="button" class="add-to-cart-btn btn-add-cart" onclick="addFeaturedItemToMenu('${item.id}', event)">ADD</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  if (typeof initFeaturedCarousel === 'function') {
    initFeaturedCarousel();
  }
}
window.renderFeaturedMenu = renderFeaturedMenu;

// Render Specials
function renderSpecials() {
  const grid = document.getElementById('specials-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let specialItems = menuItems.filter(item => item.category === 'bigi street meals' && !item.hidden);

  specialItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.style.borderColor = 'var(--accent)';
    
    const lang = getLang();
    const displayName = lang === 'fa' && item.name_fa ? item.name_fa : item.name;
    const displayDesc = lang === 'fa' && item.desc_fa ? item.desc_fa : item.desc;
    
    let badgeHtml = `<div class="menu-badge">Special</div>`;
    
    const imgHtml = item.img 
      ? `<img src="${item.img}" alt="${displayName}" class="menu-card-img" width="400" height="300">`
      : `<div class="premium-fallback">
           <div class="premium-fallback-icon">${iconUtensils(28)}</div>
         </div>`;
         
    const isSimple = (!item.variants || item.variants.length === 0) && (!item.addOns || item.addOns.length === 0) && !item.mealLinkId && item.category !== 'bigi street meals';
    const clickAction = isSimple ? `addToCartDirect('${item.id}', event)` : `openItemModal('${item.id}')`;
    
    card.innerHTML = `
      ${badgeHtml}
      <div onclick="openItemModal('${item.id}')" style="cursor: pointer;">
        ${imgHtml}
      </div>
      <div class="menu-card-content">
        <h3 class="menu-card-title" onclick="openItemModal('${item.id}')" style="cursor: pointer;">${displayName}</h3>
        <div style="color: var(--accent); font-family: 'Barlow Condensed'; font-weight: 700; font-size: 14px; letter-spacing: 1px; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 4px;">${iconFlame(14)} LIMITED TIME SPECIAL</div>
        <p class="menu-card-desc">${displayDesc}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">$${(item.price || 0).toFixed(2)}</span>
          <button class="add-to-cart-btn btn-add-cart" onclick="${clickAction}">ADD</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
window.renderSpecials = renderSpecials;

// ─────────────────────────────────────────────────────────────────
// DEALS RENDERING & LISTENER
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// DEALS RENDERING & INTERACTIVE DEAL BUILDER
// ─────────────────────────────────────────────────────────────────
let currentDealItem = null;
let dealSelectedPlates = {}; // { [itemId]: count }
let dealSelectedRewardVariant = 'Coca Cola';

window.handleDealClick = handleDealClick;
window.openDealModal = openDealModal;
window.closeDealModal = closeDealModal;
window.adjustDealPlateQty = adjustDealPlateQty;
window.selectDealReward = selectDealReward;
window.addDealToCart = addDealToCart;

function initDealsListener() {
  const dealsRef = collection(db, 'deals');
  const q = query(dealsRef, where('active', '==', true));
  
  if (isHomepage) {
    getDocs(q).then(snapshot => {
      activeDeals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderDealsGrid();
      updateCartUI();
      handleDealParam();
    }).catch(() => {});
  } else {
    onSnapshot(q, (snapshot) => {
      activeDeals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderDealsGrid();
      updateCartUI();
      handleDealParam();
    }, () => {});
  }
}

function handleDealClick(dealId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  openDealModal(dealId);
}

function getDealMeta(deal) {
  if (!deal) return { reqQty: 2, isGyro: false, targetPlural: 'Plates', targetSingular: 'Plate', rewardTitle: 'Soft Drink' };
  const cond = deal.conditions || {};
  const reqQty = cond.minQty || 2;
  const isGyro = (deal.title || '').toLowerCase().includes('gyro') || 
                 (deal.description || '').toLowerCase().includes('gyro') ||
                 (cond.itemIds || []).some(id => {
                   const item = (menuItems || []).find(m => m.id === id);
                   return item && item.name.toLowerCase().includes('gyro');
                 });
  
  const targetPlural = isGyro ? 'Gyro Rice Bowls' : 'Plates';
  const targetSingular = isGyro ? 'Gyro Rice Bowl' : 'Plate';
  
  const reward = deal.reward || {};
  let rewardTitle = 'Soft Drink';
  if (reward.rewardItemIds && reward.rewardItemIds.length > 0) {
    const rItem = (menuItems || []).find(m => reward.rewardItemIds.includes(m.id));
    if (rItem) rewardTitle = rItem.name;
  }
  
  return {
    reqQty,
    isGyro,
    targetPlural,
    targetSingular,
    rewardTitle
  };
}

function renderDealsGrid() {
  const dealsToRender = activeDeals.filter(d => d.showOnSite);
  const sections = document.querySelectorAll('.deals-section');
  
  if (dealsToRender.length === 0) {
    sections.forEach(s => s.style.display = 'none');
    return;
  }

  sections.forEach(s => s.style.display = 'block');
  
  const grids = document.querySelectorAll('#deals-grid');
  grids.forEach(grid => {
    grid.innerHTML = '';
    dealsToRender.forEach(deal => {
      const card = document.createElement('div');
      card.className = 'promo-card';
      card.onclick = (e) => handleDealClick(deal.id, e);
      
      const badgeText = deal.badge || 'CHEF\'S SPECIAL COMBO';
      
      const meta = getDealMeta(deal);
      card.innerHTML = `
        <div class="promo-top-bar">
          <div class="promo-badge-pill">
            <span class="promo-pulse-dot"></span>
            <span>${escapeHtml(badgeText)}</span>
          </div>
          <div class="promo-value-tag">FREE ${escapeHtml(meta.rewardTitle.toUpperCase())}</div>
        </div>
        <div class="promo-card-content">
          <h3 class="promo-title">${escapeHtml(deal.title)}</h3>
          <p class="promo-desc">${escapeHtml(deal.description || '')}</p>
          <div class="promo-features-grid">
            <div class="promo-feature-chip">
              ${iconSkewer(15)}
              <span>${meta.reqQty}x ${escapeHtml(meta.targetPlural)}</span>
            </div>
            <span class="promo-feature-plus">+</span>
            <div class="promo-feature-chip promo-feature-free">
              ${iconDrinkCan(15)}
              <span>1x FREE ${escapeHtml(meta.rewardTitle)}</span>
            </div>
          </div>
        </div>
        <div class="promo-card-footer">
          <div class="promo-footer-info">
            <span class="promo-status-label">Online Exclusive Combo</span>
            <span class="promo-savings-sub">Includes basmati rice, salad &amp; house sauces</span>
          </div>
          <button type="button" class="promo-claim-btn" aria-label="Claim Deal: ${escapeHtml(deal.title)}" onclick="handleDealClick('${deal.id}', event)">
            <span>Claim Deal</span>
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  });
}

function ensureDealModal() {
  let modal = document.getElementById('deal-details-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'deal-details-modal';
  modal.className = 'payment-modal-overlay';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="payment-modal item-modal deal-modal-container" style="padding: 0;">
      <button type="button" onclick="closeDealModal()" aria-label="Close deal modal" class="deal-modal-close-btn">&times;</button>
      
      <div class="item-modal-left" id="deal-modal-hero">
        <div class="deal-hero-overlay"></div>
        <div class="deal-hero-content">
          <div class="deal-hero-pill-row">
            <span id="deal-modal-badge" class="deal-hero-badge">EXCLUSIVE DEAL</span>
            <span class="deal-hero-saving-pill">SAVE $2.45</span>
          </div>
          <h2 id="deal-modal-hero-title" class="deal-hero-title">Special Combo Deal</h2>
          <p id="deal-modal-desc" class="deal-hero-desc">Order your qualifying favorites and get a complimentary soft drink of your choice!</p>
          
          <div class="deal-hero-perks" id="deal-modal-perks">
            <!-- Dynamic perks populated by openDealModal -->
          </div>
        </div>
      </div>
      
      <div class="item-modal-right">
        <div class="item-modal-scrollable">
          <div class="deal-stepper-card">
            <div class="deal-stepper-header">
              <span id="deal-modal-progress-text" class="deal-stepper-text">Step 1: Choose 2 Kabob Plates</span>
              <span id="deal-modal-progress-count" class="deal-stepper-count">0 / 2 selected</span>
            </div>
            <div class="deal-stepper-track">
              <div id="deal-stepper-fill" class="deal-stepper-fill" style="width: 0%;"></div>
            </div>
          </div>

          <div class="deal-builder-section">
            <div class="deal-section-title">
              <span class="step-badge">1</span>
              <div>
                <h3 class="step-heading" id="deal-modal-step1-heading">Select Your Qualifying Items</h3>
                <span class="step-subheading" id="deal-modal-step1-subheading">Mix &amp; match your favorites for this special promotion</span>
              </div>
            </div>
            <div id="deal-qualifying-items-container" class="deal-plates-list"></div>
          </div>

          <div class="deal-builder-section">
            <div class="deal-section-title">
              <span class="step-badge step-badge-free">${iconSparkle(13)}</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 class="step-heading">Choose Your Free Drink</h3>
                <span class="badge-free-pill">FREE</span>
              </div>
            </div>
            <div id="deal-reward-items-container"></div>
          </div>
        </div>
        
        <div class="item-modal-footer">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a;">Total Bundle</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span id="deal-modal-total-price" class="deal-footer-price">$0.00</span>
              <span id="deal-modal-orig-price" style="font-size: 14px; color: #71717a; text-decoration: line-through; display: none;"></span>
            </div>
          </div>
          <button id="deal-modal-add-btn" class="deal-submit-btn" disabled onclick="addDealToCart()">
            Select 2 plates to claim
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function openDealModal(dealId) {
  // If menu items are not ready yet, retry in 250ms
  if (!menuItems || menuItems.length === 0) {
    setTimeout(() => openDealModal(dealId), 250);
    return;
  }

  const deal = activeDeals.find(d => d.id === dealId) || activeDeals[0];
  if (!deal) {
    showToast('Promotion currently unavailable');
    return;
  }

  currentDealItem = deal;
  dealSelectedPlates = {};
  dealSelectedRewardVariant = 'Coca Cola';

  const modal = ensureDealModal();
  if (!modal) return;

  // Set Hero & Header Info
  const heroTitle = document.getElementById('deal-modal-hero-title');
  if (heroTitle) heroTitle.textContent = deal.title;

  const heroBadge = document.getElementById('deal-modal-badge');
  if (heroBadge) heroBadge.textContent = deal.badge || 'EXCLUSIVE DEAL';

  const descEl = document.getElementById('deal-modal-desc');
  if (descEl) descEl.textContent = deal.description || '';

  const meta = getDealMeta(deal);
  const cond = deal.conditions || {};
  const reqQty = cond.minQty || 2;

  // Set Dynamic Hero Perks
  const perksEl = document.getElementById('deal-modal-perks');
  if (perksEl) {
    perksEl.innerHTML = `
      <div class="deal-hero-perk-item">
        <span class="perk-check">${iconCheck(13)}</span>
        <span>${meta.reqQty} Authentic ${escapeHtml(meta.targetPlural)}</span>
      </div>
      <div class="deal-hero-perk-item">
        <span class="perk-check">${iconCheck(13)}</span>
        <span>1 Complimentary Chilled ${escapeHtml(meta.rewardTitle)}</span>
      </div>
      <div class="deal-hero-perk-item">
        <span class="perk-check">${iconCheck(13)}</span>
        <span>Includes Fragrant Basmati Rice, Fresh Salad &amp; House Sauces</span>
      </div>
    `;
  }

  // Set Step 1 Headings
  const step1Heading = document.getElementById('deal-modal-step1-heading');
  if (step1Heading) step1Heading.textContent = `Select Your ${meta.reqQty} ${meta.targetPlural}`;

  const step1Sub = document.getElementById('deal-modal-step1-subheading');
  if (step1Sub) step1Sub.textContent = `Mix & match your favorite freshly-crafted ${meta.targetPlural.toLowerCase()}`;

  // Extract Qualifying Plates - Strict Priority:
  const eligiblePlates = menuItems.filter(item => {
    if (item.hidden) return false;
    // 1. If specific item IDs are configured, ONLY those items qualify!
    if (cond.itemIds && cond.itemIds.length > 0) {
      return cond.itemIds.includes(item.id);
    }
    // 2. Otherwise match configured categories
    const cat = (item.category || '').toLowerCase();
    if (cond.categoryIds && cond.categoryIds.length > 0) {
      return cond.categoryIds.some(c => c.toLowerCase() === cat);
    }
    // 3. Fallback
    return cat.includes('plate') || cat.includes('platter') || cat.includes('gyro') || cat.includes('kabob');
  });

  // Extract Reward Item (Drink)
  const reward = deal.reward || {};
  let rewardItem = null;
  if (reward.rewardItemIds && reward.rewardItemIds.length > 0) {
    rewardItem = menuItems.find(m => reward.rewardItemIds.includes(m.id));
  }
  if (!rewardItem) {
    rewardItem = menuItems.find(m => m.name.toLowerCase().includes('soft drink')) || menuItems.find(m => (m.category || '').toLowerCase().includes('drink'));
  }

  // Pre-select 1 of the first eligible plate so the user is 1 tap away
  if (eligiblePlates.length > 0 && reqQty > 0) {
    dealSelectedPlates[eligiblePlates[0].id] = 1;
  }

  // Render Qualifying Items (Step 1)
  const platesContainer = document.getElementById('deal-qualifying-items-container');
  if (platesContainer) {
    platesContainer.innerHTML = eligiblePlates.map(plate => {
      const imgHtml = plate.img 
        ? `<img src="${plate.img}" alt="" class="deal-item-thumb" onerror="this.onerror=null; this.style.display='none'; const fb = this.nextElementSibling; if(fb) fb.style.display='flex';">
           <div class="deal-item-thumb" style="display:none;align-items:center;justify-content:center;background:#18181b;color:var(--accent);">${iconSkewer(22)}</div>`
        : `<div class="deal-item-thumb" style="display:flex;align-items:center;justify-content:center;background:#18181b;color:var(--accent);">${iconSkewer(22)}</div>`;
      
      const currentQty = dealSelectedPlates[plate.id] || 0;
      return `
        <div class="deal-item-card ${currentQty > 0 ? 'has-qty' : ''}" id="deal-plate-row-${plate.id}">
          <div style="display: flex; align-items: center; gap: 14px; min-width: 0;">
            ${imgHtml}
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 15px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(plate.name)}
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                <span style="font-size: 14px; color: var(--accent); font-family: 'Barlow Condensed'; font-weight: 700;">
                  $${(plate.price || 0).toFixed(2)}
                </span>
                <span style="font-size: 11px; color: #71717a;">• Saffron rice &amp; salad</span>
              </div>
            </div>
          </div>
          <div class="deal-item-counter">
            <button type="button" class="deal-counter-btn" onclick="adjustDealPlateQty('${plate.id}', -1)" aria-label="Decrease quantity">${iconMinus(13)}</button>
            <span class="deal-counter-val" id="deal-qty-${plate.id}">${currentQty}</span>
            <button type="button" class="deal-counter-btn" onclick="adjustDealPlateQty('${plate.id}', 1)" aria-label="Increase quantity">${iconPlus(13)}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Reward Drink Flavors (Step 2)
  const rewardContainer = document.getElementById('deal-reward-items-container');
  if (rewardContainer) {
    const flavors = (rewardItem && rewardItem.variants && rewardItem.variants.length > 0)
      ? rewardItem.variants.map(v => v.name)
      : ['Coca Cola', 'Diet Coke', 'Sprite', 'Fanta'];
    
    dealSelectedRewardVariant = flavors[0];

    rewardContainer.innerHTML = `
      <div class="deal-flavor-grid">
        ${flavors.map(flavor => `
          <div class="deal-flavor-card ${flavor === dealSelectedRewardVariant ? 'selected' : ''}" onclick="selectDealReward('${flavor}')">
            <div class="deal-radio-circle">
              <span class="deal-radio-dot"></span>
            </div>
            <div>
              <div class="flavor-name">${escapeHtml(flavor)}</div>
              <div class="flavor-free-tag">FREE INCLUDED</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  updateDealModalState();
  modal.style.display = 'flex';
}

function adjustDealPlateQty(plateId, delta) {
  if (!currentDealItem) return;
  const reqQty = currentDealItem.conditions?.minQty || 2;
  const currentQty = dealSelectedPlates[plateId] || 0;
  const currentTotal = Object.values(dealSelectedPlates).reduce((a, b) => a + b, 0);

  if (delta > 0 && currentTotal >= reqQty) {
    showToast(`You can select up to ${reqQty} plates for this deal`);
    return;
  }

  const nextQty = Math.max(0, currentQty + delta);
  if (nextQty === 0) {
    delete dealSelectedPlates[plateId];
  } else {
    dealSelectedPlates[plateId] = nextQty;
  }

  // Update UI row
  const qtyEl = document.getElementById(`deal-qty-${plateId}`);
  if (qtyEl) qtyEl.textContent = nextQty;

  const rowEl = document.getElementById(`deal-plate-row-${plateId}`);
  if (rowEl) {
    if (nextQty > 0) rowEl.classList.add('has-qty');
    else rowEl.classList.remove('has-qty');
  }

  updateDealModalState();
}

function selectDealReward(flavor) {
  dealSelectedRewardVariant = flavor;
  document.querySelectorAll('.deal-flavor-card').forEach(card => {
    const nameEl = card.querySelector('.flavor-name');
    if (nameEl && nameEl.textContent.trim() === flavor) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  updateDealModalState();
}

function updateDealModalState() {
  if (!currentDealItem) return;
  const reqQty = currentDealItem.conditions?.minQty || 2;
  const totalSelected = Object.values(dealSelectedPlates).reduce((a, b) => a + b, 0);

  const progressText = document.getElementById('deal-modal-progress-text');
  const progressCount = document.getElementById('deal-modal-progress-count');
  const stepperFill = document.getElementById('deal-stepper-fill');
  const addBtn = document.getElementById('deal-modal-add-btn');
  const totalPriceEl = document.getElementById('deal-modal-total-price');
  const origPriceEl = document.getElementById('deal-modal-orig-price');

  if (progressCount) {
    progressCount.textContent = `${totalSelected} / ${reqQty} selected`;
  }

  // Calculate Subtotal for selected plates
  let platesTotal = 0;
  Object.keys(dealSelectedPlates).forEach(id => {
    const count = dealSelectedPlates[id];
    const plate = menuItems.find(m => m.id === id);
    if (plate) {
      platesTotal += (plate.price || 0) * count;
    }
  });

  if (totalPriceEl) {
    totalPriceEl.textContent = `$${platesTotal.toFixed(2)}`;
  }
  if (origPriceEl) {
    if (platesTotal > 0) {
      origPriceEl.style.display = 'inline';
      origPriceEl.textContent = `$${(platesTotal + 2.45).toFixed(2)}`;
    } else {
      origPriceEl.style.display = 'none';
    }
  }

  // Update Stepper Progress Bar Fill
  const fillPct = Math.min(100, Math.round((totalSelected / reqQty) * 100));
  if (stepperFill) {
    stepperFill.style.width = `${fillPct}%`;
    if (fillPct === 100) stepperFill.classList.add('completed');
    else stepperFill.classList.remove('completed');
  }

  const isComplete = totalSelected === reqQty && dealSelectedRewardVariant;

  if (isComplete) {
    const meta = getDealMeta(currentDealItem);
    if (progressText) progressText.innerHTML = `<span style="color: #ffffff; display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">${iconCheck(14)} All ${reqQty} ${escapeHtml(meta.targetPlural)} Selected • Free ${escapeHtml(meta.rewardTitle)} Unlocked!</span>`;
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.innerHTML = `Add Deal to Bag — $${platesTotal.toFixed(2)}`;
    }
  } else {
    const remaining = reqQty - totalSelected;
    const meta = getDealMeta(currentDealItem);
    if (progressText) progressText.textContent = `Step 1: Choose ${remaining} more ${remaining > 1 ? meta.targetPlural : meta.targetSingular}`;
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.innerHTML = `Select ${remaining} more to claim`;
    }
  }
}

function closeDealModal() {
  const modal = document.getElementById('deal-details-modal');
  if (modal) modal.style.display = 'none';
  currentDealItem = null;
  dealSelectedPlates = {};
}

function addDealToCart() {
  if (!currentDealItem) return;
  const reqQty = currentDealItem.conditions?.minQty || 2;
  const totalSelected = Object.values(dealSelectedPlates).reduce((a, b) => a + b, 0);

  if (totalSelected !== reqQty) {
    showToast(`Please select ${reqQty} plates to claim this deal`);
    return;
  }

  // 1. Add selected plates to cart
  Object.keys(dealSelectedPlates).forEach(plateId => {
    const count = dealSelectedPlates[plateId];
    const plate = menuItems.find(m => m.id === plateId);
    if (!plate) return;

    for (let i = 0; i < count; i++) {
      const cartKey = `${plate.id}||`;
      const existing = cart.find(c => c.cartKey === cartKey);
      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({
          ...plate,
          cartKey: cartKey,
          qty: 1,
          price: plate.price,
          originalPrice: plate.price,
          selectedVariant: '',
          selectedAddOns: [],
          isMeal: false
        });
      }
    }
  });

  // 2. Add free reward drink to cart
  const reward = currentDealItem.reward || {};
  let drinkItem = null;
  if (reward.rewardItemIds && reward.rewardItemIds.length > 0) {
    drinkItem = menuItems.find(m => reward.rewardItemIds.includes(m.id));
  }
  if (!drinkItem) {
    drinkItem = menuItems.find(m => m.name.toLowerCase().includes('soft drink')) || menuItems.find(m => (m.category || '').toLowerCase().includes('drink'));
  }

  if (drinkItem) {
    const variant = dealSelectedRewardVariant || 'Coca Cola';
    const drinkKey = `${drinkItem.id}|${variant}|`;
    const existingDrink = cart.find(c => c.cartKey === drinkKey);
    if (existingDrink) {
      existingDrink.qty += 1;
    } else {
      cart.push({
        ...drinkItem,
        cartKey: drinkKey,
        qty: 1,
        price: drinkItem.price,
        originalPrice: drinkItem.price,
        selectedVariant: variant,
        selectedAddOns: [],
        isMeal: false
      });
    }
  }

  saveCart();
  const dealTitle = currentDealItem ? currentDealItem.title : "Deal";
  closeDealModal();
  updateCartUI();
  toggleCart(true);
  showToast(`${dealTitle} added to bag with Free Drink!`);
}

// Attach listener to deal modal add button
function attachDealModalAddBtn() {
  const dealAddBtn = document.getElementById('deal-modal-add-btn');
  if (dealAddBtn) {
    dealAddBtn.addEventListener('click', addDealToCart);
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachDealModalAddBtn);
} else {
  attachDealModalAddBtn();
}

// ─────────────────────────────────────────────────────────────────
// CART LOGIC
// ─────────────────────────────────────────────────────────────────
let currentModalItem = null;
let currentModalQty = 1;
let currentMealUpgrade = null; // the matching meal item from 'meals' category

window.openItemModal = openItemModal;
function openItemModal(id) {
  const item = menuItems.find(i => i.id === id);
  if (!item) return;

  currentModalItem = item;
  currentModalQty = 1;

  const modal = document.getElementById('item-details-modal');
  if (!modal) return;

  // Set Hero Image
  const hero = document.getElementById('item-modal-hero');
  if (item.img) {
    hero.style.backgroundImage = `url('${item.img}')`;
  } else {
    hero.style.backgroundImage = 'none';
  }

  // Set Details
  document.getElementById('item-modal-title').textContent = item.name;
  
  const calsEl = document.getElementById('item-modal-cals');
  if (calsEl) {
    if (item.calories) {
      calsEl.textContent = `${item.calories} Cal`;
      calsEl.style.display = 'block';
    } else {
      calsEl.style.display = 'none';
    }
  }
  
  document.getElementById('item-modal-desc').textContent = item.desc;
  
  // Render Variants
  const varContainer = document.getElementById('item-modal-variants-container');
  if (varContainer) {
    varContainer.innerHTML = '';
    if (item.variants && item.variants.length > 0) {
      const group = document.createElement('div');
      group.className = 'kiosk-option-group';
      group.innerHTML = `<div class="kiosk-option-title">Options <span>Required</span></div>`;
      
      const grid = document.createElement('div');
      grid.className = 'kiosk-option-grid';
      
      item.variants.forEach((v, index) => {
        const row = document.createElement('label');
        row.className = 'kiosk-card';
        const isChecked = index === 0 ? 'checked' : '';
        row.innerHTML = `
          <input type="radio" name="modal_variant" class="custom-radio" value="${index}" ${isChecked} onchange="updateModalPrice()">
          <div class="kiosk-card-info">
            <span class="kiosk-card-title">${v.name}</span>
            <span class="kiosk-card-price">$${(parseFloat(v.price) || 0).toFixed(2)}</span>
          </div>
        `;
        grid.appendChild(row);
      });
      group.appendChild(grid);
      varContainer.appendChild(group);
    }
  }

  // Render Add-ons
  const addContainer = document.getElementById('item-modal-addons-container');
  if (addContainer) {
    addContainer.innerHTML = '';
    if (item.addOns && item.addOns.length > 0) {
      const group = document.createElement('div');
      group.className = 'kiosk-option-group';
      group.innerHTML = `<div class="kiosk-option-title">Add-ons <span>Optional</span></div>`;
      
      const grid = document.createElement('div');
      grid.className = 'kiosk-option-grid';
      
      item.addOns.forEach((a, index) => {
        const row = document.createElement('label');
        row.className = 'kiosk-card';
        row.innerHTML = `
          <input type="checkbox" name="modal_addon" class="custom-checkbox" value="${index}" onchange="updateModalPrice()">
          <div class="kiosk-card-info">
            <span class="kiosk-card-title">${a.name}</span>
            <span class="kiosk-card-price">+$${(parseFloat(a.price) || 0).toFixed(2)}</span>
          </div>
        `;
        grid.appendChild(row);
      });
      group.appendChild(grid);
      addContainer.appendChild(group);
    }
  }

  // ── "Make it a Meal" Upgrade ──
  let mealContainer = document.getElementById('item-modal-meal-container');
  if (!mealContainer) {
    mealContainer = document.createElement('div');
    mealContainer.id = 'item-modal-meal-container';
    if (addContainer && addContainer.parentNode) {
      addContainer.parentNode.insertBefore(mealContainer, addContainer.nextSibling);
    } else {
      document.querySelector('#item-details-modal > div:last-child').appendChild(mealContainer);
    }
  }
  mealContainer.innerHTML = '';
  currentMealUpgrade = null;

  // Only show for non-meal items
  if (!item.name.toLowerCase().includes('meal') && item.category !== 'bigi street meals') {
    let matchingMeal = null;
    if (item.mealLinkId) {
      matchingMeal = menuItems.find(m => m.id === item.mealLinkId);
    }
    
    if (!matchingMeal) {
      // Find a matching meal by name similarity as fallback
      const itemNameClean = item.name.toLowerCase()
        .replace(/bigi'?s?\s*/gi, '')
        .replace(/\s*(plate|wrap|platter|with fries)\s*/gi, '')
        .trim();

      matchingMeal = menuItems.find(m => {
        const mealNameClean = m.name.toLowerCase()
          .replace(/bigi'?s?\s*/gi, '')
          .replace(/\s*meal\s*/gi, '')
          .trim();
        
        if (itemNameClean === 'afghan burger' && mealNameClean.includes('silk road wrap')) return true;

        return m.name.toLowerCase().includes('meal') && (
               mealNameClean === itemNameClean || 
               mealNameClean.includes(itemNameClean) || 
               itemNameClean.includes(mealNameClean));
      });
    }

    if (matchingMeal) {
      currentMealUpgrade = matchingMeal;
      const priceDiff = (matchingMeal.price - item.price).toFixed(2);
      const upgradeLabel = priceDiff > 0 ? `+$${priceDiff}` : 'FREE';

      const mealIconHtml = currentMealUpgrade.img 
        ? `<img src="${currentMealUpgrade.img}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" alt="Meal Upgrade">`
        : `<div style="display:flex; align-items:center; justify-content:center; width:50px; height:50px; border-radius:8px; background:var(--surface); color:var(--accent);">${iconUtensils(24)}</div>`;

      mealContainer.innerHTML = `
        <label class="kiosk-meal-upgrade">
          <input type="checkbox" id="meal-upgrade-check" class="kiosk-hidden-input" onchange="updateModalPrice()">
          <div class="kiosk-meal-content">
            <div class="kiosk-meal-icon">
              ${mealIconHtml}
            </div>
            <div class="kiosk-meal-text">
              <div class="kiosk-meal-title">MAKE IT A MEAL</div>
              <div class="kiosk-meal-desc">Add fries & a refreshing drink</div>
              <div class="kiosk-meal-price-badge">${upgradeLabel}</div>
            </div>
            <div class="kiosk-meal-checkbox-wrapper"></div>
          </div>
        </label>
      `;
    }
  }

  updateModalPrice();
  
  // Custom Add To Cart action
  const addBtn = document.getElementById('item-modal-add-btn');
  addBtn.onclick = () => {
    addConfiguredItemToCart();
  };

  modal.style.display = 'flex';
}

window.closeItemModal = closeItemModal;
function closeItemModal() {
  const modal = document.getElementById('item-details-modal');
  if (modal) modal.style.display = 'none';
}

window.changeItemQty = (delta) => {
  currentModalQty += delta;
  if (currentModalQty < 1) currentModalQty = 1;
  updateModalPrice();
};

window.updateModalPrice = updateModalPrice;
function updateModalPrice() {
  if (!currentModalItem) return;
  
  let basePrice = parseFloat(currentModalItem.price) || 0;
  
  if (currentModalItem.variants && currentModalItem.variants.length > 0) {
    const checkedVar = document.querySelector('input[name="modal_variant"]:checked');
    if (checkedVar) {
      const v = currentModalItem.variants[parseInt(checkedVar.value)];
      basePrice = (parseFloat(v.price) || 0);
    }
  }

  if (currentModalItem.addOns && currentModalItem.addOns.length > 0) {
    const checkedAddOns = document.querySelectorAll('input[name="modal_addon"]:checked');
    checkedAddOns.forEach(cb => {
      const a = currentModalItem.addOns[parseInt(cb.value)];
      basePrice += (parseFloat(a.price) || 0);
    });
  }

  // Check meal upgrade toggle
  const mealCheck = document.getElementById('meal-upgrade-check');
  if (mealCheck && mealCheck.checked && currentMealUpgrade) {
    const mealPrice = parseFloat(currentMealUpgrade.price) || 0;
    const baseItemPrice = parseFloat(currentModalItem.price) || 0;
    const upgradeCost = Math.max(0, mealPrice - baseItemPrice);
    basePrice += upgradeCost;
  }

  const total = basePrice * currentModalQty;
  document.getElementById('item-modal-price').textContent = `$${basePrice.toFixed(2)}`;
  document.getElementById('item-modal-qty').textContent = currentModalQty;
  document.getElementById('item-modal-add-btn').textContent = `Add to Cart - $${total.toFixed(2)}`;
}

window.addConfiguredItemToCart = addConfiguredItemToCart;
function addConfiguredItemToCart() {
  if (!currentModalItem) return;

  // Check if meal upgrade is toggled on
  const mealCheck = document.getElementById('meal-upgrade-check');
  const isMealUpgrade = mealCheck && mealCheck.checked && currentMealUpgrade;

  // Always add the base item, not the meal item, to preserve variants and add-ons
  const itemToAdd = currentModalItem;

  let finalPrice = parseFloat(itemToAdd.price) || 0;
  let variantText = '';
  let addOnsText = [];
  
  if (currentModalItem.variants && currentModalItem.variants.length > 0) {
    const checkedVar = document.querySelector('input[name="modal_variant"]:checked');
    if (checkedVar) {
      const v = currentModalItem.variants[parseInt(checkedVar.value)];
      finalPrice = (parseFloat(v.price) || 0);
      variantText = v.name;
    }
  }

  if (currentModalItem.addOns && currentModalItem.addOns.length > 0) {
    const checkedAddOns = document.querySelectorAll('input[name="modal_addon"]:checked');
    checkedAddOns.forEach(cb => {
      const a = currentModalItem.addOns[parseInt(cb.value)];
      finalPrice += (parseFloat(a.price) || 0);
      addOnsText.push(a.name);
    });
  }

  let mealUpgradeCost = 0;
  if (isMealUpgrade) {
    const mealPrice = parseFloat(currentMealUpgrade.price) || 0;
    const baseItemPrice = parseFloat(itemToAdd.price) || 0;
    mealUpgradeCost = Math.max(0, mealPrice - baseItemPrice);
    finalPrice += mealUpgradeCost;
  }

  const mealSuffix = isMealUpgrade ? '|MEAL' : '';
  const cartKey = `${itemToAdd.id}|${variantText}|${addOnsText.join(',')}${mealSuffix}`;

  const existing = cart.find(i => i.cartKey === cartKey);
  if (existing) {
    existing.qty += currentModalQty;
  } else {
    cart.push({
      ...itemToAdd,
      cartKey: cartKey,
      qty: currentModalQty,
      price: finalPrice, 
      originalPrice: itemToAdd.price,
      selectedVariant: variantText,
      selectedAddOns: addOnsText,
      isMeal: isMealUpgrade,
      mealUpgradeId: isMealUpgrade ? currentMealUpgrade.id : null,
      mealUpgradeCost: mealUpgradeCost
    });
  }
  
  closeItemModal();
  saveCart();
  updateCartUI();
  toggleCart(true);
  const mealLabel = isMealUpgrade ? ' (Meal)' : '';
  showToast(`${currentModalItem.name}${mealLabel} added to cart`);
}

window.addToCartDirect = (id, event) => {
  if (event) event.stopPropagation();
  const item = menuItems.find(i => i.id === id);
  if (!item) return;
  
  const cartKey = `${item.id}||`;
  const existing = cart.find(i => i.cartKey === cartKey);
  
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      ...item,
      cartKey: cartKey,
      qty: 1,
      price: item.price, 
      originalPrice: item.price,
      selectedVariant: '',
      selectedAddOns: [],
      isMeal: false
    });
  }
  saveCart();
  updateCartUI();
  toggleCart(true);
  showToast(`${item.name} added to bag`);
};

window.addToCart = (id) => {
  // Keeping this for generic items without variants/addons
  const item = menuItems.find(i => i.id === id);
  if (!item) return;
  
  openItemModal(id);
};

window.changeCartQty = (index, delta) => {
  const i = parseInt(index, 10);
  if (isNaN(i) || i < 0 || i >= cart.length) return;
  const item = cart[i];
  if (!item) return;

  const currentQty = parseInt(item.qty, 10) || 1;
  const newQty = currentQty + delta;
  if (newQty <= 0) {
    const itemName = item.name || 'Item';
    cart.splice(i, 1);
    saveCart();
    updateCartUI();
    showToast(`Removed ${itemName} from bag`);
    return;
  }

  item.qty = newQty;
  saveCart();
  updateCartUI();
};

window.removeCartItem = (index) => {
  const i = parseInt(index, 10);
  if (isNaN(i) || i < 0 || i >= cart.length) return;
  const item = cart[i];
  const itemName = item ? (item.name || 'Item') : 'Item';
  cart.splice(i, 1);
  saveCart();
  updateCartUI();
  showToast(`Removed ${itemName} from bag`);
};

window.updateQty = (cartKey, delta) => {
  const existingIndex = cart.findIndex(i => i.cartKey === cartKey || i.id === cartKey);
  if (existingIndex !== -1) {
    window.changeCartQty(existingIndex, delta);
  } else {
    saveCart();
    updateCartUI();
  }
};

function renderCartLoyaltySection(container) {
  const existing = document.getElementById('cart-loyalty-section');
  if (existing) existing.remove();

  if (!window.__recognizedCustomer || !container) return;
  const customer = window.__recognizedCustomer;
  const name = customer.name || 'Member';
  const tier = customer.tier 
    ? (customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1).toLowerCase()) 
    : 'Bronze';
  const points = customer.loyaltyPoints ?? customer.points ?? 0;

  const loyaltyEl = document.createElement('div');
  loyaltyEl.id = 'cart-loyalty-section';
  loyaltyEl.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    color: var(--gray);
  `;
  loyaltyEl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">${renderTierBadge(tier)} <span style="color: var(--white); font-weight: 500;">${escapeHtml(name)}</span> <span>•</span> <span style="color: var(--accent); font-weight: 600;">${points} pts</span></span>`;
  container.prepend(loyaltyEl);
}

function updateCartUI() {
  const itemsContainer = document.getElementById('cart-items');
  const countBadge = document.getElementById('cart-count-badge');
  const totalEl = document.getElementById('cart-total');
  
  const cartFab = document.getElementById('cart-fab');
  if (cartFab) {
    cartFab.style.display = 'flex';
  }

  if (!itemsContainer || !countBadge || !totalEl) return;
  
  itemsContainer.innerHTML = '';
  let subtotal = 0;
  let count = 0;
  
  if (cart.length === 0) {
    itemsContainer.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; color: var(--gray); text-align: center;"><p>Your bag is empty.</p></div>';
    renderCartLoyaltySection(itemsContainer);
    countBadge.textContent = 0;
    totalEl.textContent = `$0.00`;
  } else {
    // Sanitize cart items and calculate subtotal/count safely
    cart.forEach(item => {
      const p = parseFloat(item.price);
      item.price = (!isNaN(p) && p >= 0) ? p : (parseFloat(item.originalPrice) || 0);
      const q = parseInt(item.qty, 10);
      item.qty = (!isNaN(q) && q >= 1) ? q : 1;
      subtotal += item.price * item.qty;
      count += item.qty;
    });
    if (isNaN(subtotal) || subtotal < 0) subtotal = 0;

    const targetAmount = 30.00;
    const progress = Math.min(100, Math.max(0, (subtotal / targetAmount) * 100));
    const remaining = Math.max(0, targetAmount - subtotal);
    const progressText = subtotal >= targetAmount 
      ? `<span style="display:inline-flex;align-items:center;gap:6px;">${iconSparkle(15)} You've unlocked a Free Doogh!</span>` 
      : `Add $${remaining.toFixed(2)} more for a Free Doogh!`;

    itemsContainer.innerHTML = `
      <div class="cart-progress-container">
        <div class="cart-progress-text">${progressText}</div>
        <div class="cart-progress-bar-bg">
          <div class="cart-progress-bar-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    `;

    renderCartLoyaltySection(itemsContainer);

    // 1. Render items safely with index-based controls & dedicated remove button
    cart.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'cart-item';

      const imgHtml = item.img 
        ? `<img src="${item.img}" alt="${escapeHtml(item.name || 'Menu item')}" class="cart-item-img">`
        : `<div class="cart-item-img" style="background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--gray);">${iconUtensils(16)}</div>`;

      let modsHtml = '';
      if (item.selectedVariant) {
        modsHtml += `<div style="font-size: 12px; color: var(--gray); margin-top: 4px;">• ${escapeHtml(item.selectedVariant)}</div>`;
      }
      if (item.selectedAddOns && item.selectedAddOns.length > 0) {
        modsHtml += `<div style="font-size: 12px; color: var(--gray); margin-top: 2px;">• ${item.selectedAddOns.map(a => escapeHtml(a)).join(', ')}</div>`;
      }
      if (item.isLoyaltyReward) {
        modsHtml += `<div style="font-size: 11px; font-weight: 700; color: #ffffff; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 4px; padding: 2px 6px; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px;">${iconGift(13)} Loyalty Reward (FREE)</div>`;
      }

      const displayTitle = item.isMeal ? `${item.name} (Meal Upgrade)` : item.name;
      const itemPrice = parseFloat(item.price) || 0;
      const itemQty = Math.max(1, parseInt(item.qty, 10) || 1);
      const lineTotal = itemPrice * itemQty;

      el.innerHTML = `
        ${imgHtml}
        <div class="cart-item-details">
          <div class="cart-item-title">${escapeHtml(displayTitle)}</div>
          ${modsHtml}
          <div class="cart-item-price" style="margin-top: 6px;">${item.isLoyaltyReward ? '<strong style="color: #ffffff; font-weight: 700;">FREE ($0.00)</strong>' : `${lineTotal.toFixed(2)}`}</div>
        </div>
        <div class="cart-item-actions">
          <div class="cart-item-controls" role="group" aria-label="Item quantity">
            <button type="button" class="cart-qty-btn cart-qty-minus" onclick="changeCartQty(${index}, -1)" aria-label="${itemQty === 1 ? 'Remove from bag' : 'Decrease quantity'}" title="${itemQty === 1 ? 'Remove' : 'Decrease'}">
              ${iconMinus(14)}
            </button>
            <span class="cart-qty-val" aria-label="Quantity">${itemQty}</span>
            <button type="button" class="cart-qty-btn cart-qty-plus" onclick="changeCartQty(${index}, 1)" aria-label="Increase quantity" title="Increase">
              ${iconPlus(14)}
            </button>
          </div>
          <button type="button" class="cart-item-remove-btn" onclick="removeCartItem(${index})" aria-label="Remove ${escapeHtml(displayTitle)}" title="Remove item">
            ${iconTrash(16)}
          </button>
        </div>
      `;
      itemsContainer.appendChild(el);
    });

    // 2. Evaluate deals
    const evalResult = evaluateDeals(cart, activeDeals, menuItems, appliedPromoCodes);
    const discountAmount = evalResult.discountCents / 100;
    
    if (evalResult.appliedDeals.length > 0) {
      const dealsContainer = document.createElement('div');
      dealsContainer.style.marginTop = '16px';
      dealsContainer.style.paddingTop = '16px';
      dealsContainer.style.borderTop = '1px dashed var(--border)';
      
      let dealsHtml = `<div style="font-size: 12px; font-family: 'Barlow Condensed'; letter-spacing: 1px; color: var(--accent); margin-bottom: 8px;">APPLIED PROMOTIONS</div>`;
      evalResult.appliedDeals.forEach(deal => {
        dealsHtml += `
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; color: var(--accent); align-items: center;">
            <span style="display: inline-flex; align-items: center; gap: 6px;">${iconCheck(14)} ${escapeHtml(deal.title)}</span>
            <span>-$${(deal.discountCents / 100).toFixed(2)}</span>
          </div>
        `;
      });
      dealsContainer.innerHTML = dealsHtml;
      itemsContainer.appendChild(dealsContainer);
    }

    // 2b. Proactive Unclaimed Deal Nudge
    if (evalResult.appliedDeals.length === 0 && activeDeals && activeDeals.length > 0) {
      const eligibleUnclaimed = activeDeals.find(d => {
        if (!d.active || (d.type !== 'bogo' && d.type !== 'free_item')) return false;
        const cond = d.conditions;
        if (!cond) return false;
        let matchCount = 0;
        cart.forEach(cItem => {
          const mInfo = menuItems.find(m => m.id === cItem.id) || {};
          const cat = (mInfo.category || '').toLowerCase();
          const isId = cond.itemIds && cond.itemIds.includes(cItem.id);
          const isCat = cond.categoryIds && cond.categoryIds.some(c => c.toLowerCase() === cat);
          if (isId || isCat) matchCount += (cItem.qty || 1);
        });
        const req = cond.minQty || 1;
        if (matchCount < req) return false;
        const hasDrink = cart.some(cItem => d.reward?.rewardItemIds?.includes(cItem.id));
        return !hasDrink;
      });

      if (eligibleUnclaimed) {
        const nudgeDiv = document.createElement('div');
        nudgeDiv.className = 'cart-deal-nudge';
        nudgeDiv.innerHTML = `
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Deal Unlocked</div>
            <div style="font-size: 13px; font-weight: 600; color: #fff;">Get 1 FREE Drink with ${escapeHtml(eligibleUnclaimed.title)}</div>
          </div>
          <button type="button" class="cart-deal-nudge-btn" onclick="openDealModal('${eligibleUnclaimed.id}')">
            + Claim Drink
          </button>
        `;
        itemsContainer.appendChild(nudgeDiv);
      }
    }
    if (false) {
    }
    
    countBadge.textContent = count;
    const finalTotal = Math.max(0, subtotal - discountAmount);
    totalEl.innerHTML = discountAmount > 0 
      ? `<span style="text-decoration: line-through; color: var(--gray); font-size: 14px; margin-right: 8px;">$${subtotal.toFixed(2)}</span>$${finalTotal.toFixed(2)}`
      : `$${subtotal.toFixed(2)}`;
  }
  
  // Checkout button handling
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    // Clear any inline styling overrides so .btn-primary controls the look
    checkoutBtn.style.background = '';
    checkoutBtn.style.color = '';
    checkoutBtn.style.border = '';
    checkoutBtn.style.boxShadow = '';
    checkoutBtn.className = 'btn-primary';

    if (cart.length === 0) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Bag is empty';
    } else {
      checkoutBtn.disabled = false;
      const hasPaymentModal = !!document.getElementById('payment-modal');
      const pType = document.querySelector('input[name="pickup_type"]:checked')?.value || 'asap';
      if (hasPaymentModal && window.isStoreClosed && pType === 'asap') {
        checkoutBtn.textContent = 'STORE CLOSED · SCHEDULE PICKUP';
      } else {
        checkoutBtn.textContent = 'Checkout';
      }
    }
  }
}

window.handleCheckoutClick = () => {
  if (!cart || cart.length === 0) {
    showToast('Your bag is empty.');
    return;
  }
  const pType = document.querySelector('input[name="pickup_type"]:checked')?.value || 'asap';
  if (window.isStoreClosed && pType === 'asap') {
    const schedRadio = document.querySelector('input[name="pickup_type"][value="scheduled"]');
    if (schedRadio) {
      schedRadio.checked = true;
      if (typeof togglePickupType === 'function') togglePickupType();
      const schedBox = document.getElementById('scheduled-pickup-options') || document.querySelector('.pickup-toggle-wrap');
      if (schedBox) {
        schedBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        schedBox.style.outline = '1px solid var(--accent)';
        schedBox.style.borderRadius = '4px';
        setTimeout(() => { if (schedBox) schedBox.style.outline = 'none'; }, 2000);
      }
      showToast('Switched to Scheduled Pickup!');
    }
    return;
  }
  if (typeof openPaymentModal === 'function' && document.getElementById('payment-modal')) {
    openPaymentModal();
  } else {
    placeOrder('online');
  }
};

window.toggleCart = (show) => {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) {
    drawer.style.right = show ? '0' : '-100%';
    drawer.style.visibility = show ? 'visible' : 'hidden';
    drawer.style.pointerEvents = show ? 'auto' : 'none';
    drawer.style.boxShadow = show ? '-10px 0 30px rgba(0,0,0,0.5)' : 'none';
    if (show) drawer.classList.add('open');
    else drawer.classList.remove('open');
  } else if (show) {
    window.location.href = '/menu?openCart=true';
  }
};

// ─────────────────────────────────────────────────────────────────
// SQUARE WEB PAYMENTS — Payment Modal
// ─────────────────────────────────────────────────────────────────
let squarePayments = null;
let googlePayInstance = null;
let applePayInstance = null;
let currentPaymentRequest = null;

async function ensureSquareLoaded() {
  if (window.Square) return window.Square;
  return new Promise((resolve, reject) => {
    let script = document.getElementById('square-sdk-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'square-sdk-script';
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve(window.Square));
    script.addEventListener('error', () => reject(new Error('Failed to load Square Payments SDK')));
  });
}

async function initSquarePayments() {
  try {
    await ensureSquareLoaded();
  } catch (err) {
    console.error('Square SDK not loaded — check if https://web.squarecdn.com/v1/square.js is blocked.');
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.textContent = 'Payment Unavailable';
    return;
  }
  if (!window.Square) return;

  try {
    if (!squarePayments) {
      squarePayments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
    }
    squareCard = await squarePayments.card();
    console.log('Square Web Payments initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Square Web Payments:', err);
    showToast('Payment system could not load: ' + err.message);
  }
}

window.placeOrder = (type) => {
  if (typeof window.openPaymentModal === 'function' && document.getElementById('payment-modal')) {
    window.openPaymentModal();
  } else {
    try {
      const nameVal = document.getElementById('customer-name')?.value?.trim();
      const phoneVal = document.getElementById('customer-phone')?.value?.trim();
      if (nameVal) localStorage.setItem('bigi_customer_name', nameVal);
      if (phoneVal) localStorage.setItem('bigi_customer_phone', phoneVal);
    } catch (e) {}
    saveCart();
    window.location.href = '/menu?openCart=true';
  }
};

window.openPaymentModal = async () => {
  if (cart.length === 0) {
    showToast('Your cart is empty.');
    return;
  }

  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const customerName = nameInput?.value.trim();
  const customerPhone = phoneInput?.value.trim();

  if (!customerName || !customerPhone) {
    showToast('Please enter your name and phone number.');
    if (!customerName) nameInput?.focus();
    else phoneInput?.focus();
    return;
  }

  // Validate pickup selection
  let pickupPayload;
  try {
    pickupPayload = getPickupPayload();
  } catch (err) {
    showToast(err.message);
    return;
  }

  // Show modal

  const modal = document.getElementById('payment-modal');
  modal.style.display = 'flex';

  // Reset states
  document.getElementById('pay-button').style.display = 'block';
  document.getElementById('card-container').style.display = 'block';
  document.getElementById('payment-processing').style.display = 'none';
  document.getElementById('payment-success').style.display = 'none';
  document.getElementById('card-errors').textContent = '';

  // Update read-only pickup summary
  const summaryElPickup = document.getElementById('payment-pickup-summary');
  if (pickupPayload.pickupType === 'asap') {
    const asapEstimate = document.getElementById('asap-estimate')?.textContent || '';
    summaryElPickup.innerHTML = `ASAP <span style="color: var(--accent); font-weight: normal;">${asapEstimate}</span>`;
  } else {
    const dateEl = document.getElementById('pickup-date-select');
    const timeEl = document.getElementById('pickup-time-select');
    const dateText = dateEl.options[dateEl.selectedIndex]?.text || '';
    const timeText = timeEl.options[timeEl.selectedIndex]?.text || '';
    summaryElPickup.textContent = `${dateText}, ${timeText}`;
  }

  // Build order summary with tax + tip
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const evalResult = evaluateDeals(cart, activeDeals, menuItems, appliedPromoCodes);
  const discountAmount = evalResult.discountCents / 100;
  const discountedSubtotal = subtotal - discountAmount;
  
  const tax = discountedSubtotal * TAX_RATE;
  const summaryEl = document.getElementById('payment-order-summary');

  function updateModalTotal() {
    const tipInput = document.getElementById('tip-input');
    const tip = parseFloat(tipInput?.value || '0') || 0;
    const safeTip = Math.min(tip, 100); // client-side cap matches server cap
    const total = discountedSubtotal + tax + safeTip;
    document.getElementById('modal-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    if (document.getElementById('modal-discount')) {
      document.getElementById('modal-discount').textContent = `-$${discountAmount.toFixed(2)}`;
    }
    document.getElementById('modal-tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('modal-tip-display').textContent = `$${safeTip.toFixed(2)}`;
    document.getElementById('modal-total').textContent = `$${total.toFixed(2)}`;
    document.getElementById('pay-total').textContent = `$${total.toFixed(2)}`;
    if (currentPaymentRequest && typeof currentPaymentRequest.update === 'function') {
      try {
        currentPaymentRequest.update({
          total: {
            amount: total.toFixed(2),
            label: 'Bigi Awasaana Order',
          },
        });
      } catch (e) {}
    }
  }

  summaryEl.innerHTML = `
    <div style="margin-bottom: 16px; max-height: 200px; overflow-y: auto; padding-right: 8px;" class="custom-scrollbar">
      ${cart.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px;">
          <span style="color: var(--white);">${item.qty}× ${item.name}</span>
          <span style="color: var(--gray);">$${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('')}
    </div>
    <div style="border-top: 1px solid var(--border); padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: var(--gray);">
          <span>Subtotal</span><span id="modal-subtotal">$${subtotal.toFixed(2)}</span>
        </div>
        ${discountAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: var(--accent);">
          <span>Discount</span><span id="modal-discount">-$${discountAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: var(--gray);">
          <span>Tax (10.25%)</span><span id="modal-tax">$${tax.toFixed(2)}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; font-size: 14px; color: var(--gray);">
          <span>Tip</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--gray);">$</span>
            <input id="tip-input" type="number" min="0" max="100" step="0.50" placeholder="0.00"
              style="width: 70px; background: var(--surface); border: 1px solid var(--border); padding: 6px 8px; color: var(--white); font-family: 'Outfit'; font-size: 14px; border-radius: 4px; text-align: right;"
              oninput="if(typeof updateModalTotal==='function') updateModalTotal()">
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--gray);">
          <span style="font-style: italic;">Tip applied</span><span id="modal-tip-display">$0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0 0; border-top: 1px solid var(--border); margin-top: 8px; font-weight: 700; font-size: 17px;">
          <span>Total</span>
          <span style="color: var(--accent);" id="modal-total">$${(discountedSubtotal + tax).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;

  // Make updateModalTotal available to the oninput handler
  window.updateModalTotal = updateModalTotal;

  document.getElementById('pay-total').textContent = `$${(discountedSubtotal + tax).toFixed(2)}`;

  // ── Setup Saved Cards (Card on File) ──
  const savedCardContainer = document.getElementById('saved-payment-method-container');
  const savedCardsList = document.getElementById('saved-cards-list');
  const savedCardAuth = document.getElementById('saved-card-auth-container');
  const newCardSection = document.getElementById('new-card-form-section');
  const digitalWallets = document.getElementById('digital-wallets');
  const savedPinInput = document.getElementById('saved-card-pin');

  const customerCards = window.__recognizedCustomer?.savedCards || [];

  if (customerCards.length > 0) {
    if (savedCardContainer) savedCardContainer.style.display = 'block';
    if (savedCardAuth) savedCardAuth.style.display = 'block';
    if (newCardSection) newCardSection.style.display = 'none';
    if (digitalWallets) digitalWallets.style.display = 'block';

    // Auto-fill PIN if user already authenticated in this session
    if (savedPinInput) {
      savedPinInput.value = '';
      try {
        const auth = JSON.parse(sessionStorage.getItem('bigi_order_auth') || '{}');
        const currentPhoneDigits = (document.getElementById('customer-phone')?.value || '').replace(/\D/g, '');
        const authPhoneDigits = (auth.phone || '').replace(/\D/g, '');
        if (auth.pin && (currentPhoneDigits === authPhoneDigits || !currentPhoneDigits)) {
          savedPinInput.value = auth.pin;
        }
      } catch (e) {}
    }

    if (savedCardsList) {
      savedCardsList.innerHTML = customerCards.map((card, idx) => `
        <label class="saved-card-option" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--surface); border: 1px solid ${idx === 0 ? 'var(--accent)' : 'var(--border)'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="radio" name="payment_card_choice" value="${card.id}" ${idx === 0 ? 'checked' : ''} style="accent-color: var(--accent); width: 16px; height: 16px; cursor: pointer;" onchange="window.__onPaymentChoiceChange(this.value)">
            <span style="display:flex;align-items:center;color:var(--white);">${iconCard(20)}</span>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--white);">${escapeHtml(card.brand.toUpperCase())} •••• ${escapeHtml(card.last4)}</div>
              <div style="font-size: 12px; color: var(--gray);">Exp ${card.expMonth ? String(card.expMonth).padStart(2,'0') : '••'}/${card.expYear ? String(card.expYear).slice(-2) : '••'}</div>
            </div>
          </div>
          <span style="font-size: 11px; font-weight: 700; color: #ffffff; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">1-Tap</span>
        </label>
      `).join('') + `
        <label class="saved-card-option" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; cursor: pointer;">
          <input type="radio" name="payment_card_choice" value="new_card" style="accent-color: var(--accent); width: 16px; height: 16px; cursor: pointer;" onchange="window.__onPaymentChoiceChange(this.value)">
          <span style="display:flex;align-items:center;color:var(--accent);">${iconPlus(16)}</span>
          <span style="font-size: 14px; color: var(--white); font-weight: 500;">Pay with a new card</span>
        </label>
      `;
    }

    const payBtn = document.getElementById('pay-button');
    if (payBtn) {
      payBtn.innerHTML = `${iconBolt(16)} 1-TAP PURCHASE — <span id="pay-total">$${(discountedSubtotal + tax).toFixed(2)}</span>`;
    }
  } else {
    if (savedCardContainer) savedCardContainer.style.display = 'none';
    if (savedCardAuth) savedCardAuth.style.display = 'none';
    if (newCardSection) newCardSection.style.display = 'block';
    if (digitalWallets) digitalWallets.style.display = 'block';
    const payBtn = document.getElementById('pay-button');
    if (payBtn) {
      payBtn.innerHTML = `COMPLETE PURCHASE — <span id="pay-total">$${(discountedSubtotal + tax).toFixed(2)}</span>`;
    }
  }

  window.__onPaymentChoiceChange = (choice) => {
    const isNew = choice === 'new_card';
    if (newCardSection) newCardSection.style.display = isNew ? 'block' : 'none';
    if (savedCardAuth) savedCardAuth.style.display = isNew ? 'none' : 'block';
    // Digital wallets remain available for 1-tap express checkout
    if (digitalWallets) digitalWallets.style.display = 'block';

    document.querySelectorAll('.saved-card-option').forEach(label => {
      const radio = label.querySelector('input[type="radio"]');
      if (radio && radio.checked && !isNew) {
        label.style.borderColor = 'var(--accent)';
      } else {
        label.style.borderColor = 'var(--border)';
      }
    });

    const tipRaw = parseFloat(document.getElementById('tip-input')?.value || '0') || 0;
    const currentTotal = (discountedSubtotal + tax + tipRaw).toFixed(2);
    const payBtn = document.getElementById('pay-button');
    if (payBtn) {
      payBtn.innerHTML = isNew 
        ? `COMPLETE PURCHASE — <span id="pay-total">$${currentTotal}</span>` 
        : `${iconBolt(16)} 1-TAP PURCHASE — <span id="pay-total">$${currentTotal}</span>`;
    }
  };

  // Ensure Square card is initialized (handles close → reopen race condition)
  if (!squareCard) {
    await initSquarePayments();
  }

  // Attach Square card form
  if (squareCard) {
    try {
      await squareCard.attach('#card-container');
    } catch (err) {
      // Card may already be attached, that's OK
      console.log('Card form attach:', err.message);
    }
  } else {
    document.getElementById('card-errors').textContent = 'Payment form could not load. Please refresh the page.';
  }

  // Destroy previous digital wallet instances cleanly to prevent Square SDK duplicate attach errors
  if (googlePayInstance) {
    try { await googlePayInstance.destroy(); } catch(e) {}
    googlePayInstance = null;
  }
  applePayInstance = null;
  currentPaymentRequest = null;

  const gpEl = document.getElementById('google-pay-button');
  if (gpEl) {
    gpEl.innerHTML = '';
    gpEl.style.display = 'none';
  }
  const apEl = document.getElementById('apple-pay-button');
  if (apEl) {
    apEl.style.display = 'none';
  }
  const dividerEl = document.getElementById('wallets-or-divider');
  if (dividerEl) {
    dividerEl.style.display = 'none';
  }

  // Attach Digital Wallets (Google Pay & Apple Pay)
  if (squarePayments) {
    let hasDigitalWallet = false;
    try {
      const tipRaw = parseFloat(document.getElementById('tip-input')?.value || '0') || 0;
      const safeTip = Math.min(tipRaw, 100);
      const totalAmount = (discountedSubtotal + tax + safeTip).toFixed(2);
      
      const req = squarePayments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: totalAmount,
          label: 'Bigi Awasaana Order',
        },
      });
      currentPaymentRequest = req;

      // ── Apple Pay (Native Web Payments SDK - does not use .attach()) ──
      try {
        const applePay = await squarePayments.applePay(req);
        applePayInstance = applePay;
        const apBtn = document.getElementById('apple-pay-button');
        if (apBtn) {
          apBtn.style.display = 'flex';
          hasDigitalWallet = true;

          apBtn.onclick = async (e) => {
            e.preventDefault();
            // Validate pickup synchronously before triggering payment sheet
            let pickupPayload;
            try {
              pickupPayload = getPickupPayload();
            } catch (err) {
              showToast(err.message);
              return;
            }

            try {
              // Tokenize must be called directly within user gesture without intervening async calls
              const result = await applePay.tokenize();
              if (result.status === 'OK') {
                // Show processing screen
                document.getElementById('card-container').style.display = 'none';
                if (document.getElementById('apple-pay-button')) document.getElementById('apple-pay-button').style.display = 'none';
                if (document.getElementById('google-pay-button')) document.getElementById('google-pay-button').style.display = 'none';
                if (document.getElementById('wallets-or-divider')) document.getElementById('wallets-or-divider').style.display = 'none';
                if (document.getElementById('saved-payment-method-container')) document.getElementById('saved-payment-method-container').style.display = 'none';
                if (document.getElementById('saved-card-auth-container')) document.getElementById('saved-card-auth-container').style.display = 'none';
                if (document.getElementById('new-card-form-section')) document.getElementById('new-card-form-section').style.display = 'none';
                document.getElementById('pay-button').style.display = 'none';
                document.getElementById('payment-processing').style.display = 'flex';

                await processSquareToken(result.token, {
                  customerName: document.getElementById('customer-name')?.value.trim(),
                  customerPhone: document.getElementById('customer-phone')?.value.trim(),
                  customerEmail: document.getElementById('customer-email')?.value.trim() || undefined,
                  tipCents: Math.round((parseFloat(document.getElementById('tip-input')?.value || '0') || 0) * 100),
                  pickupType: pickupPayload.pickupType,
                  pickupTime: pickupPayload.pickupTime
                });
              } else {
                document.getElementById('card-errors').textContent = result.errors?.map(err => err.message).join(', ') || 'Apple Pay failed.';
              }
            } catch (apErr) {
              console.error('Apple Pay tokenize error:', apErr);
              document.getElementById('card-errors').textContent = apErr.message || 'Apple Pay payment failed.';
            }
          };
        }
      } catch (apInitErr) {
        console.log('Apple Pay not supported on this browser/device:', apInitErr.message || apInitErr);
        const apBtn = document.getElementById('apple-pay-button');
        if (apBtn) apBtn.style.display = 'none';
      }

      // ── Google Pay (Square Web Payments SDK) ──
      try {
        const googlePay = await squarePayments.googlePay(req);
        googlePayInstance = googlePay;
        const gpBtn = document.getElementById('google-pay-button');
        if (gpBtn) {
          gpBtn.innerHTML = '';
          await googlePay.attach('#google-pay-button', {
            buttonColor: 'default',
            buttonType: 'long',
            buttonSizeMode: 'fill',
            buttonRadius: 6
          });
          gpBtn.style.display = 'block';
          hasDigitalWallet = true;

          gpBtn.onclick = async (e) => {
            e.preventDefault();
            let pickupPayload;
            try {
              pickupPayload = getPickupPayload();
            } catch (err) {
              showToast(err.message);
              return;
            }

            try {
              const result = await googlePay.tokenize();
              if (result.status === 'OK') {
                // Show processing screen
                document.getElementById('card-container').style.display = 'none';
                if (document.getElementById('apple-pay-button')) document.getElementById('apple-pay-button').style.display = 'none';
                if (document.getElementById('google-pay-button')) document.getElementById('google-pay-button').style.display = 'none';
                if (document.getElementById('wallets-or-divider')) document.getElementById('wallets-or-divider').style.display = 'none';
                if (document.getElementById('saved-payment-method-container')) document.getElementById('saved-payment-method-container').style.display = 'none';
                if (document.getElementById('saved-card-auth-container')) document.getElementById('saved-card-auth-container').style.display = 'none';
                if (document.getElementById('new-card-form-section')) document.getElementById('new-card-form-section').style.display = 'none';
                document.getElementById('pay-button').style.display = 'none';
                document.getElementById('payment-processing').style.display = 'flex';

                await processSquareToken(result.token, {
                  customerName: document.getElementById('customer-name')?.value.trim(),
                  customerPhone: document.getElementById('customer-phone')?.value.trim(),
                  customerEmail: document.getElementById('customer-email')?.value.trim() || undefined,
                  tipCents: Math.round((parseFloat(document.getElementById('tip-input')?.value || '0') || 0) * 100),
                  pickupType: pickupPayload.pickupType,
                  pickupTime: pickupPayload.pickupTime
                });
              } else {
                document.getElementById('card-errors').textContent = result.errors?.map(err => err.message).join(', ') || 'Google Pay failed.';
              }
            } catch (gpErr) {
              console.error('Google Pay tokenize error:', gpErr);
              document.getElementById('card-errors').textContent = gpErr.message || 'Google Pay payment failed.';
            }
          };
        }
      } catch (gpInitErr) {
        console.log('Google Pay not supported or failed to initialize:', gpInitErr.message || gpInitErr);
        const gpBtn = document.getElementById('google-pay-button');
        if (gpBtn) gpBtn.style.display = 'none';
      }

      // Show divider only if at least one digital wallet is active
      const divider = document.getElementById('wallets-or-divider');
      if (divider) {
        divider.style.display = hasDigitalWallet ? 'flex' : 'none';
      }

    } catch (walletErr) {
      console.error('Digital wallet setup error:', walletErr);
    }
  }
};

window.closePaymentModal = async () => {
  const modal = document.getElementById('payment-modal');
  if (modal) modal.style.display = 'none';

  // Destroy the card instance — openPaymentModal will re-create it on demand
  if (squareCard) {
    try { await squareCard.destroy(); } catch(e) { console.warn(e); }
    squareCard = null;
  }

  // Cleanly destroy Google Pay instance
  if (googlePayInstance) {
    try { await googlePayInstance.destroy(); } catch(e) { console.warn(e); }
    googlePayInstance = null;
  }
  applePayInstance = null;
  currentPaymentRequest = null;
  
  // Hide digital wallet buttons to reset state (preserve Apple Pay button DOM structure)
  const apBtn = document.getElementById('apple-pay-button');
  if (apBtn) apBtn.style.display = 'none';
  
  const gpBtn = document.getElementById('google-pay-button');
  if (gpBtn) {
    gpBtn.style.display = 'none';
    gpBtn.innerHTML = '';
  }

  const divider = document.getElementById('wallets-or-divider');
  if (divider) divider.style.display = 'none';

  const savedCardContainer = document.getElementById('saved-payment-method-container');
  const savedCardAuth = document.getElementById('saved-card-auth-container');
  const newCardSection = document.getElementById('new-card-form-section');
  if (savedCardContainer) savedCardContainer.style.display = 'none';
  if (savedCardAuth) savedCardAuth.style.display = 'none';
  if (newCardSection) newCardSection.style.display = 'block';
};

window.editPickupTime = () => {
  window.closePaymentModal();
  if (typeof window.toggleCart === 'function') {
    window.toggleCart(true);
  }
};

// ─────────────────────────────────────────────────────────────────
// handlePayment
// ─────────────────────────────────────────────────────────────────
function getPickupPayload() {
  const pickupTypeEl = document.querySelector('input[name="pickup_type"]:checked');
  const pickupType = pickupTypeEl ? pickupTypeEl.value : 'asap';
  let pickupTime = null;
  
  if (pickupType === 'scheduled') {
    const dateStr = document.getElementById('pickup-date-select')?.value;
    const timeStr = document.getElementById('pickup-time-select')?.value;
    if (!dateStr || !timeStr || document.getElementById('pickup-time-select').disabled) {
      throw new Error('Please select a valid scheduled pickup time.');
    }
    // Parse as local time on the client, then convert to UTC ISO string for backend
    pickupTime = new Date(`${dateStr}T${timeStr}`).toISOString();
  }
  return { pickupType, pickupTime };
}

window.handlePayment = async () => {
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const emailInput = document.getElementById('customer-email');
  const customerName = nameInput?.value.trim();
  const customerPhone = phoneInput?.value.trim();
  const customerEmail = emailInput?.value.trim() || undefined;

  if (!customerName || !customerPhone) {
    showToast('Name and phone are required.');
    return;
  }
  
  let pickupPayload;
  try {
    pickupPayload = getPickupPayload();
  } catch (err) {
    showToast(err.message);
    return;
  }
  const { pickupType, pickupTime } = pickupPayload;

  const tipInput = document.getElementById('tip-input');
  const tipAmount = parseFloat(tipInput?.value || '0') || 0;
  const tipCents = Math.round(tipAmount * 100);

  // UI state
  const payBtn = document.getElementById('pay-button');
  const errorsEl = document.getElementById('card-errors');
  const cardContainer = document.getElementById('card-container');
  const processingDiv = document.getElementById('payment-processing');
  const savedCardContainer = document.getElementById('saved-payment-method-container');
  const savedCardAuth = document.getElementById('saved-card-auth-container');
  const newCardSection = document.getElementById('new-card-form-section');

  payBtn.disabled = true;
  payBtn.textContent = 'Processing...';
  errorsEl.textContent = '';

  const selectedChoice = document.querySelector('input[name="payment_card_choice"]:checked')?.value;
  const isPayingWithSavedCard = selectedChoice && selectedChoice.startsWith('ccof:');

  if (isPayingWithSavedCard) {
    // 1-Tap Checkout with Saved Card
    const pinInput = document.getElementById('saved-card-pin');
    let pin = pinInput?.value.trim();
    if (!pin) {
      try {
        const auth = JSON.parse(sessionStorage.getItem('bigi_order_auth') || '{}');
        pin = auth.pin || '';
      } catch (e) {}
    }

    if (!pin || pin.length !== 4) {
      errorsEl.textContent = 'Please enter your 4-digit PIN to authorize payment with your saved card.';
      payBtn.disabled = false;
      payBtn.innerHTML = `${iconBolt(16)} 1-TAP PURCHASE — <span id="pay-total">${document.getElementById('modal-total')?.textContent || '$0.00'}</span>`;
      if (pinInput) pinInput.focus();
      return;
    }

    if (savedCardContainer) savedCardContainer.style.display = 'none';
    if (savedCardAuth) savedCardAuth.style.display = 'none';
    if (newCardSection) newCardSection.style.display = 'none';
    if (processingDiv) processingDiv.style.display = 'flex';

    await processSquareToken(selectedChoice, {
      customerName,
      customerPhone,
      customerEmail,
      tipCents,
      pickupType,
      pickupTime,
      pin
    });
    return;
  }

  // Paying with New Card
  const saveCardCheckbox = document.getElementById('save-card-checkbox');
  const saveCard = Boolean(saveCardCheckbox?.checked);

  if (!squareCard) {
    errorsEl.textContent = 'Payment form not ready. Please close and reopen the checkout.';
    payBtn.disabled = false;
    payBtn.textContent = 'Pay Now';
    return;
  }

  try {
    const result = await squareCard.tokenize();
    if (result.status === 'OK') {
      if (cardContainer) cardContainer.style.display = 'none';
      if (savedCardContainer) savedCardContainer.style.display = 'none';
      if (newCardSection) newCardSection.style.display = 'none';
      if (processingDiv) processingDiv.style.display = 'flex';

      await processSquareToken(result.token, {
        customerName,
        customerPhone,
        customerEmail,
        tipCents,
        pickupType,
        pickupTime,
        saveCard
      });
    } else {
      const errMsg = result.errors && result.errors.length > 0
        ? result.errors.map(e => e.message).join(', ')
        : 'Card validation failed. Please check your card details.';
      console.error('Tokenization failed:', errMsg);
      errorsEl.textContent = errMsg;
      payBtn.disabled = false;
      payBtn.textContent = 'Pay Now';
    }
  } catch (e) {
    console.error('Payment handler error:', e);
    errorsEl.textContent = 'An unexpected error occurred. Please try again.';
    payBtn.disabled = false;
    payBtn.textContent = 'Pay Now';
  }
};

async function processSquareToken(token, { customerName, customerPhone, customerEmail, tipCents, pickupType, pickupTime, saveCard, pin }) {
  const emailVal = customerEmail || document.getElementById('customer-email')?.value.trim() || window.__recognizedCustomer?.email || undefined;
  try {
    // We send tipCents explicitly. The server calculates subtotals & taxes using evaluateDeals.
    const res = await callFirebaseFunction('processSquarePayment', {
      sourceId: token,
      customerName,
      customerPhone,
      customerEmail: emailVal,
      items: cart,
      tipCents,
      pickupType,
      pickupTime,
      saveCard: Boolean(saveCard),
      pin: pin || undefined
    });

    const result = res;
    if (result.data.success) {
      // Payment Successful
      document.getElementById('payment-processing').style.display = 'none';
      document.getElementById('payment-success').style.display = 'block';
      document.getElementById('success-message').textContent = result.data.message;

      // If user provided a PIN during saved card payment, persist to sessionStorage for seamless future orders
      if (pin && customerPhone) {
        try {
          sessionStorage.setItem('bigi_order_auth', JSON.stringify({ phone: customerPhone, pin }));
        } catch (e) {}
      }

      // Generate QR code for order status page
      const orderId = result.data.orderId;
      const accessToken = result.data.accessToken;
      const statusUrl = `${window.location.origin}/order-status.html?orderId=${orderId}&token=${accessToken}`;
      const qrContainer = document.getElementById('qr-code-container');
      if (qrContainer && window.QRCode) {
        qrContainer.innerHTML = '';
        new window.QRCode(qrContainer, {
          text: statusUrl,
          width: 160,
          height: 160,
          colorDark: '#ffffff',
          colorLight: '#000000',
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      }
      const trackBtn = document.getElementById('track-order-btn');
      if (trackBtn) {
        trackBtn.href = statusUrl;
        trackBtn.style.display = 'inline-block';
      }

      // Clear cart
      cart = [];
      saveCart();
      document.getElementById('customer-name').value = '';
      document.getElementById('customer-phone').value = '';
      if (document.getElementById('customer-email')) document.getElementById('customer-email').value = '';
      window.__recognizedCustomer = null;
      hideReturningCustomerBanner();
      if (typeof updateCartUI === 'function') updateCartUI();
      if (typeof window.toggleCart === 'function') window.toggleCart(false);

      showToast('Payment successful! Your order receipt was sent to your email.');
    }
  } catch (err) {
    console.error('Payment error:', err);
    const _processing = document.getElementById('payment-processing');
    const _cardContainer = document.getElementById('card-container');
    const _newCardSection = document.getElementById('new-card-form-section');
    const _savedCardContainer = document.getElementById('saved-payment-method-container');
    const _savedCardAuth = document.getElementById('saved-card-auth-container');
    const _payBtn = document.getElementById('pay-button');
    const _errorsEl = document.getElementById('card-errors');

    if (_processing) _processing.style.display = 'none';
    const _digitalWallets = document.getElementById('digital-wallets');
    if (_digitalWallets) _digitalWallets.style.display = 'block';
    if (applePayInstance) {
      const _ap = document.getElementById('apple-pay-button');
      if (_ap) _ap.style.display = 'flex';
    }
    if (googlePayInstance) {
      const _gp = document.getElementById('google-pay-button');
      if (_gp) _gp.style.display = 'block';
    }
    const _divider = document.getElementById('wallets-or-divider');
    if (_divider && (applePayInstance || googlePayInstance)) {
      _divider.style.display = 'flex';
    }
    if (token.startsWith('ccof:')) {
      if (_savedCardContainer) _savedCardContainer.style.display = 'block';
      if (_savedCardAuth) _savedCardAuth.style.display = 'block';
    } else {
      if (_newCardSection) _newCardSection.style.display = 'block';
      if (_cardContainer) _cardContainer.style.display = 'block';
    }
    if (_payBtn) {
      _payBtn.style.display = 'block';
      _payBtn.disabled = false;
      const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
      const evalResult = evaluateDeals(cart, activeDeals, menuItems, appliedPromoCodes);
      const discountAmount = evalResult.discountCents / 100;
      const discountedSubtotal = subtotal - discountAmount;
      const tipRaw = parseFloat(document.getElementById('tip-input')?.value || '0') || 0;
      const tip = Math.min(tipRaw, 100);
      const curTot = (discountedSubtotal * (1 + TAX_RATE) + tip).toFixed(2);
      _payBtn.innerHTML = token.startsWith('ccof:')
        ? `${iconBolt(16)} 1-TAP PURCHASE — <span id="pay-total">$${curTot}</span>`
        : `COMPLETE PURCHASE — <span id="pay-total">$${curTot}</span>`;
    }

    const errorMsg = err.message || 'Payment failed. Please try again.';
    if (_errorsEl) _errorsEl.textContent = errorMsg;
    showToast(errorMsg);
  }
}

// ─────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────
function showToast(message) {
  const container = document.getElementById('toast-container');
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



// ─────────────────────────────────────────────────────────────────
// SCROLL REVEAL ANIMATION
// ─────────────────────────────────────────────────────────────────
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => observer.observe(el));
}


// ─────────────────────────────────────────────────────────────────
// FEATURED ITEMS CONTINUOUS FLOW STREAM & TOUCH SWIPE
// ─────────────────────────────────────────────────────────────────
let featuredAnimFrame = null;
let featuredIsPaused = false;
let featuredResumeTimer = null;

function initFeaturedCarousel() {
  const track = document.getElementById('featured-menu-grid');
  if (!track) return;

  const prevBtn = document.getElementById('featured-prev-btn');
  const nextBtn = document.getElementById('featured-next-btn');
  const hintEl = document.getElementById('featured-swipe-hint');

  // Cancel any prior animation loop
  if (featuredAnimFrame) {
    cancelAnimationFrame(featuredAnimFrame);
    featuredAnimFrame = null;
  }
  if (featuredResumeTimer) {
    clearTimeout(featuredResumeTimer);
    featuredResumeTimer = null;
  }

  // Seamless Infinite Looping: Clone cards once so set A and set B are identical
  const originalCards = Array.from(track.querySelectorAll('.menu-card:not([data-clone])'));
  if (originalCards.length === 0) return;

  // Clean any old clones
  track.querySelectorAll('.menu-card[data-clone]').forEach(c => c.remove());

  // Append cloned cards with data-clone="true"
  originalCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.setAttribute('data-clone', 'true');
    track.appendChild(clone);
  });

  function getHalfWidth() {
    return track.scrollWidth / 2;
  }

  function pauseFlow() {
    featuredIsPaused = true;
    if (featuredResumeTimer) {
      clearTimeout(featuredResumeTimer);
      featuredResumeTimer = null;
    }
  }

  function resumeFlowWithDelay(delay = 1800) {
    if (featuredResumeTimer) clearTimeout(featuredResumeTimer);
    featuredResumeTimer = setTimeout(() => {
      featuredIsPaused = false;
      lastTime = performance.now();
    }, delay);
  }

  function dismissHint() {
    if (hintEl && !hintEl.classList.contains('hidden')) {
      hintEl.classList.add('hidden');
    }
  }

  // 1. Continuous RAF Flow Loop
  let lastTime = performance.now();
  const speed = 0.65; // ~39px/sec smooth continuous drift

  function flowStep(now) {
    const delta = Math.min(32, now - lastTime);
    lastTime = now;

    if (!featuredIsPaused) {
      const halfWidth = getHalfWidth();
      if (halfWidth > 0) {
        track.scrollLeft += speed * (delta / 16.67);

        // Seamless wrap forward
        if (track.scrollLeft >= halfWidth) {
          track.scrollLeft -= halfWidth;
        }
      }
    }

    featuredAnimFrame = requestAnimationFrame(flowStep);
  }

  featuredIsPaused = false;
  lastTime = performance.now();
  featuredAnimFrame = requestAnimationFrame(flowStep);

  // 2. Touch Events (Full natural swipe & drag)
  track.addEventListener('touchstart', () => {
    pauseFlow();
    dismissHint();
  }, { passive: true });

  track.addEventListener('touchend', () => {
    resumeFlowWithDelay(2000);
  }, { passive: true });

  // Seamless wrap during user swipe
  track.addEventListener('scroll', () => {
    dismissHint();
    const halfWidth = getHalfWidth();
    if (halfWidth > 0) {
      if (track.scrollLeft >= halfWidth * 1.9) {
        track.scrollLeft -= halfWidth;
      } else if (track.scrollLeft <= 5 && featuredIsPaused) {
        track.scrollLeft += halfWidth;
      }
    }
  }, { passive: true });

  // 3. Desktop Hover Pause
  track.addEventListener('mouseenter', () => {
    pauseFlow();
  });

  track.addEventListener('mouseleave', () => {
    resumeFlowWithDelay(800);
  });

  // 4. Desktop Mouse Drag to Scroll
  let isMouseDown = false;
  let hasDragged = false;
  let startX = 0;
  let scrollStart = 0;

  track.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isMouseDown = true;
    hasDragged = false;
    pauseFlow();
    dismissHint();
    startX = e.pageX - track.offsetLeft;
    scrollStart = track.scrollLeft;
    track.classList.add('dragging');
  });

  window.addEventListener('mouseup', () => {
    if (isMouseDown) {
      isMouseDown = false;
      track.classList.remove('dragging');
      resumeFlowWithDelay(1800);
      setTimeout(() => { hasDragged = false; }, 60);
    }
  });

  track.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const x = e.pageX - track.offsetLeft;
    if (Math.abs(x - startX) > 6) {
      hasDragged = true;
    }
    e.preventDefault();
    const walk = (x - startX) * 1.4;
    track.scrollLeft = scrollStart - walk;
  });

  track.addEventListener('click', (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // 5. Chevron Navigation Buttons
  if (prevBtn) {
    prevBtn.onclick = () => {
      pauseFlow();
      dismissHint();
      track.scrollBy({ left: -240, behavior: 'smooth' });
      resumeFlowWithDelay(2800);
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      pauseFlow();
      dismissHint();
      track.scrollBy({ left: 240, behavior: 'smooth' });
      resumeFlowWithDelay(2800);
    };
  }
}
window.initFeaturedCarousel = initFeaturedCarousel;

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
function checkOpenCartParam() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openCart') === 'true' || urlParams.get('cart') === 'open') {
      setTimeout(() => {
        toggleCart(true);
      }, 350);
    }
  } catch (e) {}
}

function initMainApp() {
  loadSavedCart();
  loadMenuFromFirestore();
  updateCartUI();
  checkOpenCartParam();
  try {
    const savedName = localStorage.getItem('bigi_customer_name');
    const savedPhone = localStorage.getItem('bigi_customer_phone');
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    if (nameInput && !nameInput.value.trim() && savedName) nameInput.value = savedName;
    if (phoneInput && !phoneInput.value.trim() && savedPhone) {
      phoneInput.value = savedPhone;
      phoneInput.dispatchEvent(new Event('blur'));
    }
  } catch (e) {}
  initFeaturedCarousel();
  if (typeof checkBusinessHours === 'function') {
    checkBusinessHours();
    setInterval(checkBusinessHours, 60000);
  }

  const applyPromoBtn = document.getElementById('apply-promo-btn');
  if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', () => {
      const input = document.getElementById('promo-input');
      const msg = document.getElementById('promo-msg');
      if (!input || !msg) return;
      
      const code = input.value.trim().toUpperCase();
      if (!code) return;
      
      const deal = activeDeals.find(d => d.promoCode === code && d.active !== false);
      
      if (!deal) {
        msg.textContent = 'Invalid or expired promo code.';
        msg.style.color = '#ff4444';
        msg.style.display = 'block';
        return;
      }
      
      if (appliedPromoCodes.includes(code)) {
        msg.textContent = 'Promo code already applied.';
        msg.style.color = '#ff4444';
        msg.style.display = 'block';
        return;
      }
      
      appliedPromoCodes.push(code);
      input.value = '';
      msg.textContent = 'Promo code applied!';
      msg.style.color = 'var(--accent)';
      msg.style.display = 'block';
      
      updateCartUI();
    });
  }

  initReveal();
  initCustomerLookup();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainApp);
} else {
  initMainApp();
}

// ─────────────────────────────────────────────────────────────────
// RETURNING CUSTOMER LOOKUP & LOYALTY BANNER
// ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTierBadge(tier) {
  if (!tier) return 'Bronze';
  const t = String(tier).toLowerCase();
  if (t.includes('gold')) return 'Gold';
  if (t.includes('silver')) return 'Silver';
  return 'Bronze';
}

function getOrCreateReturningCustomerBanner() {
  let banner = document.getElementById('returning-customer-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'returning-customer-banner';
    banner.style.cssText = `
      display: none;
      margin-top: 12px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: rgba(230, 81, 0, 0.1);
      border: 1px solid var(--accent);
      border-radius: 8px;
      font-size: 14px;
      color: var(--white);
      animation: fadeIn 0.3s ease;
    `;
    const phoneInput = document.getElementById('customer-phone');
    if (phoneInput && phoneInput.parentElement) {
      phoneInput.parentElement.insertAdjacentElement('afterend', banner);
    } else if (phoneInput) {
      phoneInput.insertAdjacentElement('afterend', banner);
    }
  }
  return banner;
}

function showReturningCustomerBanner(customer) {
  const banner = getOrCreateReturningCustomerBanner();
  if (!banner) return;

  const name = customer.name || 'Friend';
  const points = customer.loyaltyPoints ?? customer.points ?? 0;
  const tier = customer.tier || 'bronze';
  const tierBadgeHtml = renderTierBadge(tier, true);
  const totalOrders = customer.totalOrders ?? customer.ordersCount ?? customer.orderCount ?? (Array.isArray(customer.orders) ? customer.orders.length : 0);

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
      <span style="font-weight: 600; color: var(--white); display: inline-flex; align-items: center; gap: 6px;">Welcome back, ${escapeHtml(name)}! <span style="color: var(--primary);">${iconSparkle(16)}</span></span>
      ${tierBadgeHtml}
    </div>
    <div style="font-size: 13px; color: var(--gray); display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
      <span>You have <strong style="color: var(--accent); font-weight: 600;">${points}</strong> loyalty point${points === 1 ? '' : 's'}</span>
      <span>${totalOrders} total order${totalOrders === 1 ? '' : 's'}</span>
    </div>
  `;
  banner.style.display = 'block';
}

function hideReturningCustomerBanner() {
  const banner = document.getElementById('returning-customer-banner');
  if (banner) {
    banner.style.display = 'none';
  }
}

function initCustomerLookup() {
  const phoneInput = document.getElementById('customer-phone');
  if (!phoneInput || phoneInput.__customerLookupBound) return;
  phoneInput.__customerLookupBound = true;

  phoneInput.addEventListener('blur', async () => {
    const value = phoneInput.value.trim();
    const digits = value.replace(/\D/g, '');

    if (digits.length >= 10) {
      try {
        const result = await callFirebaseFunction('lookupCustomer', { phone: value });
        const data = result?.data || {};

        if (data.found) {
          const customer = data.customer || data;
          window.__recognizedCustomer = customer;

          const nameInput = document.getElementById('customer-name');
          if (nameInput && !nameInput.value.trim() && customer.name) {
            nameInput.value = customer.name;
          }

          showReturningCustomerBanner(customer);
          updateCartUI();
        } else {
          hideReturningCustomerBanner();
          window.__recognizedCustomer = null;
          updateCartUI();
        }
      } catch (err) {
        console.warn('Customer lookup error:', err);
        hideReturningCustomerBanner();
        window.__recognizedCustomer = null;
        updateCartUI();
      }
    } else {
      hideReturningCustomerBanner();
      window.__recognizedCustomer = null;
      updateCartUI();
    }
  });
}

if (document.readyState !== 'loading') {
  initCustomerLookup();
}

// Option 2 Auth Integration: Auto-fill checkout fields when customer logs in
function getLoggedInCustomer() {
  try {
    const raw = sessionStorage.getItem('bigi_auth_customer');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function applyLoggedInCustomerToForm(customer) {
  const cust = customer || getLoggedInCustomer();
  if (!cust) return;

  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const emailInput = document.getElementById('customer-email');

  if (nameInput && !nameInput.value.trim() && cust.name) {
    nameInput.value = cust.name;
  }
  if (phoneInput && !phoneInput.value.trim() && cust.phone) {
    phoneInput.value = cust.phone;
  }
  if (emailInput && !emailInput.value.trim() && cust.email) {
    emailInput.value = cust.email;
  }
  window.__recognizedCustomer = cust;
  showReturningCustomerBanner(cust);
  if (typeof updateCartUI === 'function') updateCartUI();
}

window.addEventListener('bigi:auth-changed', (e) => {
  if (e.detail) {
    applyLoggedInCustomerToForm(e.detail);
  } else {
    hideReturningCustomerBanner();
    window.__recognizedCustomer = null;
    if (typeof updateCartUI === 'function') updateCartUI();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    applyLoggedInCustomerToForm();
  }, 350);
});

// CART PROMO LISTENER (only active on pages with a cart drawer)
if (document.getElementById('cart-promo-container')) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const container = document.getElementById('cart-promo-container');
    if (container) {
      container.innerHTML = `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border); text-align: center;"><p style="font-size: 13px; color: var(--gray); margin-bottom: 8px;">Looking for delivery?</p><div style="display: flex; gap: 12px; justify-content: center;"><a href="https://www.ubereats.com/store/bigi-awasaana-%E2%80%93-halal-burgers-%26-kabobs/F2Nn6alaR6eTb6AAwVxq4g?diningMode=DELIVERY&sc=SEARCH_SUGGESTION" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">Uber Eats</a><span style="color: var(--border);">|</span><a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">DoorDash</a></div></div>`;
    }
  } else if (isHomepage) {
    getDoc(doc(db, 'settings', 'cart_promo')).then((docSnap) => {
      const container = document.getElementById('cart-promo-container');
      if (!container) return;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.active && data.html) {
          container.innerHTML = data.html;
        } else {
          container.innerHTML = `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border); text-align: center;"><p style="font-size: 13px; color: var(--gray); margin-bottom: 8px;">Looking for delivery?</p><div style="display: flex; gap: 12px; justify-content: center;"><a href="https://www.ubereats.com/store/bigi-awasaana-%E2%80%93-halal-burgers-%26-kabobs/F2Nn6alaR6eTb6AAwVxq4g?diningMode=DELIVERY&sc=SEARCH_SUGGESTION" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">Uber Eats</a><span style="color: var(--border);">|</span><a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">DoorDash</a></div></div>`;
        }
      }
    }).catch(() => {});
  } else {
    onSnapshot(doc(db, 'settings', 'cart_promo'), (docSnap) => {
      const container = document.getElementById('cart-promo-container');
      if (!container) return;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.active && data.html) {
          container.innerHTML = data.html;
        } else {
          container.innerHTML = `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border); text-align: center;"><p style="font-size: 13px; color: var(--gray); margin-bottom: 8px;">Looking for delivery?</p><div style="display: flex; gap: 12px; justify-content: center;"><a href="https://www.ubereats.com/store/bigi-awasaana-%E2%80%93-halal-burgers-%26-kabobs/F2Nn6alaR6eTb6AAwVxq4g?diningMode=DELIVERY&sc=SEARCH_SUGGESTION" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">Uber Eats</a><span style="color: var(--border);">|</span><a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">DoorDash</a></div></div>`;
        }
      }
    }, () => {});
  }
}

import { welcomeLangs } from './welcome.js';

// Welcome Animation
document.addEventListener('DOMContentLoaded', () => {
  const welcomeText = document.getElementById('welcome-text');
  if (!welcomeText) return;
  let i = 0;
  welcomeText.classList.add('welcome-animating');
  setInterval(() => {
    welcomeText.classList.remove('welcome-animating');
    requestAnimationFrame(() => {
      i = (i + 1) % welcomeLangs.length;
      welcomeText.textContent = welcomeLangs[i];
      welcomeText.classList.add('welcome-animating');
    });
  }, 3000);
});

import './blog-sync.js';
