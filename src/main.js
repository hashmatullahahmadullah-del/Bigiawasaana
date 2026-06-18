import './style.css';
import { db } from './firebase.js';
import { collection, addDoc, getDocs, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase.js';
import { evaluateDeals } from './lib/deals-evaluator.js';
import { getLang, t } from './i18n/index.js';

// ─────────────────────────────────────────────────────────────────
// SQUARE CONFIGURATION
// Replace with your Sandbox Application ID from developer.squareup.com
// In production, swap for your Production Application ID
// ─────────────────────────────────────────────────────────────────
const SQUARE_APP_ID = 'sq0idp-ZNKswm32xh_nRRecm5ggFg'; // ← Replace with your Production App ID
const SQUARE_LOCATION_ID = 'LVVN2XC88162M'; // ← Replace with your Production Location ID
const TAX_RATE = 0.1025; // LA County / Reseda sales tax rate (10.25%)

// Firebase Functions
const functions = getFunctions(app);
const processSquarePayment = httpsCallable(functions, 'processSquarePayment');

// Menu data loaded from Firestore
let menuItems = [];
let cart = [];
let activeDeals = [];
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
  businessHours: { open: "12:00", close: "22:30" }
};
let activeAsapOrderCount = 0;

// Load Pickup Config
import { doc } from 'firebase/firestore';
onSnapshot(doc(db, 'settings', 'pickupConfig'), (docSnap) => {
  if (docSnap.exists()) {
    pickupConfig = { ...pickupConfig, ...docSnap.data() };
    updateAsapEstimate();
  }
});

onSnapshot(doc(db, 'liveStats', 'current'), (docSnap) => {
  if (docSnap.exists()) {
    activeAsapOrderCount = docSnap.data().activeAsapOrderCount || 0;
    updateAsapEstimate();
  }
});

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
};

function populateDates() {
  const dateSelect = document.getElementById('pickup-date-select');
  if (!dateSelect) return;
  dateSelect.innerHTML = '';
  
  const now = new Date();
  
  for (let i = 0; i <= pickupConfig.maxScheduleDaysAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const opt = document.createElement('option');
    opt.value = d.toISOString().split('T')[0];
    opt.textContent = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    dateSelect.appendChild(opt);
  }
  
  updateTimeSlots();
}

window.updateTimeSlots = () => {
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
};

// ─────────────────────────────────────────────────────────────────
// MENU LOADING
// ─────────────────────────────────────────────────────────────────
async function loadMenuFromFirestore() {
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
      menuItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Untitled',
          desc: data.desc || data.description || '',
          price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
          category: (data.category || 'platters').toLowerCase(),
          img: data.img || data.image || data.imageUrl || '',
          featured: !!data.featured
        };
      });

      // Build category pills dynamically from Firestore data
      buildCategoryPills();
      
      // Render featured menu on home page if element exists
      renderFeaturedMenu();
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
    pill.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    pill.onclick = () => {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderMenu(cat);
    };
    scrollContainer.appendChild(pill);
  });
}

// ─────────────────────────────────────────────────────────────────
// MENU RENDERING — with "Add to Cart" buttons always visible
// ─────────────────────────────────────────────────────────────────
function renderMenu(category) {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const itemsToRender = category === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === category);

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
    
    const imgHtml = item.img 
      ? `<img src="${item.img}" alt="${displayName}" class="menu-card-img" loading="lazy">`
      : `<div class="menu-card-img" style="background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--gray); font-size: 13px;">No Image</div>`;
    
    card.innerHTML = `
      ${imgHtml}
      <div class="menu-card-content">
        <h3 class="menu-card-title">${displayName}</h3>
        <p class="menu-card-desc">${displayDesc}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">$${item.price.toFixed(2)}</span>
          <button class="btn-primary btn-add-cart" onclick="addToCart('${item.id}')">+ Add</button>
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

  let featuredItems = menuItems.filter(item => item.featured);
  
  // Fallback to first 3 items if no items are explicitly featured
  if (featuredItems.length === 0) {
    featuredItems = menuItems.slice(0, 3);
  }

  featuredItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.style.borderColor = 'var(--accent)';
    
    const lang = getLang();
    const displayName = lang === 'fa' && item.name_fa ? item.name_fa : item.name;
    const displayDesc = lang === 'fa' && item.desc_fa ? item.desc_fa : item.desc;
    
    const imgHtml = item.img 
      ? `<img src="${item.img}" alt="${displayName}" class="menu-card-img" loading="lazy">`
      : `<div class="menu-card-img" style="background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--gray); font-size: 13px;">🍽</div>`;
    
    card.innerHTML = `
      ${imgHtml}
      <div class="menu-card-content">
        <h3 class="menu-card-title">${displayName}</h3>
        <p class="menu-card-desc">${displayDesc}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">$${(item.price || 0).toFixed(2)}</span>
          <button class="btn-primary btn-add-cart" onclick="addToCart('${item.id}')">+ Add</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
window.renderFeaturedMenu = renderFeaturedMenu;

// ─────────────────────────────────────────────────────────────────
// DEALS RENDERING & LISTENER
// ─────────────────────────────────────────────────────────────────
function initDealsListener() {
  const dealsRef = collection(db, 'deals');
  const q = query(dealsRef, where('active', '==', true));
  
  onSnapshot(q, (snapshot) => {
    activeDeals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderDealsGrid();
    updateCartUI(); // re-eval deals when deals change
  });
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
      
      const badgeHtml = deal.badge ? `<div class="promo-badge">${deal.badge}</div>` : '';
      
      card.innerHTML = `
        ${badgeHtml}
        <div class="promo-card-content">
          <h3 class="promo-title">${deal.title}</h3>
          <p class="promo-desc">${deal.description || ''}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// CART LOGIC
// ─────────────────────────────────────────────────────────────────
window.addToCart = (id) => {
  const item = menuItems.find(i => i.id === id);
  if (!item) return;
  
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  
  updateCartUI();
  showToast(`${item.name} added to cart`);
};

window.updateQty = (id, delta) => {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += delta;
    if (existing.qty <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
  }
  updateCartUI();
};

function updateCartUI() {
  const itemsContainer = document.getElementById('cart-items');
  const countBadge = document.getElementById('cart-count-badge');
  const totalEl = document.getElementById('cart-total');
  
  if (!itemsContainer || !countBadge || !totalEl) return;
  
  itemsContainer.innerHTML = '';
  let subtotal = 0;
  let count = 0;
  
  if (cart.length === 0) {
    itemsContainer.innerHTML = '<p style="color: var(--gray); text-align: center; margin-top: 40px;">Your cart is empty.</p>';
    countBadge.textContent = 0;
    totalEl.textContent = `$0.00`;
  } else {
    // 1. Render items first
    cart.forEach(item => {
      subtotal += item.price * item.qty;
      count += item.qty;
      const el = document.createElement('div');
      el.className = 'cart-item';

      const imgHtml = item.img 
        ? `<img src="${item.img}" alt="${item.name}" class="cart-item-img">`
        : `<div class="cart-item-img" style="background: var(--surface); display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--gray);">🍽</div>`;

      el.innerHTML = `
        ${imgHtml}
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
          <span style="font-size: 14px; font-weight: 600;">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
        </div>
      `;
      itemsContainer.appendChild(el);
    });

    // 2. Evaluate deals
    const evalResult = evaluateDeals(cart, activeDeals, menuItems);
    const discountAmount = evalResult.discountCents / 100;
    
    if (evalResult.appliedDeals.length > 0) {
      const dealsContainer = document.createElement('div');
      dealsContainer.style.marginTop = '16px';
      dealsContainer.style.paddingTop = '16px';
      dealsContainer.style.borderTop = '1px dashed var(--border)';
      
      let dealsHtml = `<div style="font-size: 12px; font-family: 'Barlow Condensed'; letter-spacing: 1px; color: var(--accent); margin-bottom: 8px;">APPLIED PROMOTIONS</div>`;
      evalResult.appliedDeals.forEach(deal => {
        dealsHtml += `
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; color: var(--accent);">
            <span>✓ ${deal.title}</span>
            <span>-$${(deal.discountCents / 100).toFixed(2)}</span>
          </div>
        `;
      });
      dealsContainer.innerHTML = dealsHtml;
      itemsContainer.appendChild(dealsContainer);
    }
    
    countBadge.textContent = count;
    totalEl.innerHTML = discountAmount > 0 
      ? `<span style="text-decoration: line-through; color: var(--gray); font-size: 14px; margin-right: 8px;">$${subtotal.toFixed(2)}</span>$${(subtotal - discountAmount).toFixed(2)}`
      : `$${subtotal.toFixed(2)}`;
  }
  
  // Disable checkout button if cart is empty
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
    checkoutBtn.style.opacity = cart.length === 0 ? '0.5' : '1';
  }
}

window.toggleCart = (show) => {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) {
    drawer.style.right = show ? '0' : '-100%';
  }
};

// ─────────────────────────────────────────────────────────────────
// SQUARE WEB PAYMENTS — Payment Modal
// ─────────────────────────────────────────────────────────────────
let squarePayments;

async function initSquarePayments() {
  if (!window.Square) {
    console.error('Square SDK not loaded — check if https://web.squarecdn.com/v1/square.js is blocked.');
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.textContent = 'Payment Unavailable';
    return;
  }

  try {
    if (!squarePayments) {
      squarePayments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
    }
    squareCard = await squarePayments.card();
    console.log('Square Web Payments initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Square Web Payments:', err);
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.textContent = 'Payment Setup Error';
    showToast('Payment system could not load: ' + err.message);
  }
}

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
  const evalResult = evaluateDeals(cart, activeDeals, menuItems);
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
  }

  summaryEl.innerHTML = `
    <div style="margin-bottom: 16px;">
      ${cart.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px;">
          <span style="color: var(--white);">${item.qty}× ${item.name}</span>
          <span style="color: var(--gray);">$${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('')}
      <div style="border-top: 1px solid var(--border); margin-top: 10px; padding-top: 10px;">
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

  // Attach Digital Wallets
  if (squarePayments) {
    try {
      const tipRaw = parseFloat(document.getElementById('tip-input')?.value || '0') || 0;
      const totalAmount = (discountedSubtotal + tax + tipRaw).toFixed(2);
      
      const req = squarePayments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: totalAmount,
          label: 'Bigi Awasaana Order',
        },
      });

      // Apple Pay
      try {
        const applePay = await squarePayments.applePay(req);
        await applePay.attach('#apple-pay-button', {
          buttonColor: 'black',
          buttonType: 'plain'
        });
        const apBtn = document.getElementById('apple-pay-button');
        apBtn.style.display = 'block';
        apBtn.onclick = null;
        apBtn.addEventListener('click', async () => {
          let pickupPayload;
          try {
            pickupPayload = getPickupPayload();
          } catch (err) {
            showToast(err.message);
            return;
          }
          
          try {
            const result = await applePay.tokenize();
            if (result.status === 'OK') {
              // Show processing screen
              document.getElementById('card-container').style.display = 'none';
              document.getElementById('apple-pay-button').style.display = 'none';
              document.getElementById('google-pay-button').style.display = 'none';
              if (document.getElementById('fake-apple-pay-button')) document.getElementById('fake-apple-pay-button').style.display = 'none';
              document.getElementById('pay-button').style.display = 'none';
              document.getElementById('payment-processing').style.display = 'flex';

              await processSquareToken(result.token, {
                customerName: document.getElementById('customer-name').value.trim(),
                customerPhone: document.getElementById('customer-phone').value.trim(),
                tipCents: Math.round((parseFloat(document.getElementById('tip-input')?.value || '0') || 0) * 100),
                pickupType: pickupPayload.pickupType,
                pickupTime: pickupPayload.pickupTime
              });
            } else {
              document.getElementById('card-errors').textContent = result.errors?.map(e => e.message).join(', ') || 'Apple Pay failed.';
            }
          } catch (e) {
            console.error('Apple Pay error:', e);
            document.getElementById('card-errors').textContent = e.message || 'Apple Pay payment failed.';
          }
        });
      } catch (e) {
        console.log('Apple Pay not natively supported, showing dummy button for display.');
        const fakeApBtn = document.getElementById('fake-apple-pay-button');
        if (fakeApBtn) {
          fakeApBtn.style.display = 'flex';
          fakeApBtn.onclick = () => {
            document.getElementById('card-errors').textContent = 'Apple Pay is only available on iOS devices.';
          };
        }
      }

      // Google Pay
      try {
        const googlePay = await squarePayments.googlePay(req);
        await googlePay.attach('#google-pay-button', {
          buttonColor: 'white',
          buttonType: 'pay',
          buttonSizeMode: 'fill'
        });
        const gpBtn = document.getElementById('google-pay-button');
        gpBtn.style.display = 'block';
        gpBtn.onclick = null;
        gpBtn.addEventListener('click', async () => {
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
              document.getElementById('apple-pay-button').style.display = 'none';
              document.getElementById('google-pay-button').style.display = 'none';
              if (document.getElementById('fake-apple-pay-button')) document.getElementById('fake-apple-pay-button').style.display = 'none';
              document.getElementById('pay-button').style.display = 'none';
              document.getElementById('payment-processing').style.display = 'flex';

              await processSquareToken(result.token, {
                customerName: document.getElementById('customer-name').value.trim(),
                customerPhone: document.getElementById('customer-phone').value.trim(),
                tipCents: Math.round((parseFloat(document.getElementById('tip-input')?.value || '0') || 0) * 100),
                pickupType: pickupPayload.pickupType,
                pickupTime: pickupPayload.pickupTime
              });
            } else {
              document.getElementById('card-errors').textContent = result.errors?.map(e => e.message).join(', ') || 'Google Pay failed.';
            }
          } catch (e) {
            console.error('Google Pay error:', e);
            document.getElementById('card-errors').textContent = e.message || 'Google Pay payment failed.';
          }
        });
      } catch (e) {
        console.log('Google Pay not supported:', e);
      }

    } catch (e) {
      console.error('Digital wallet setup error:', e);
    }
  }
};

window.closePaymentModal = () => {
  const modal = document.getElementById('payment-modal');
  modal.style.display = 'none';

  // Destroy the card instance — openPaymentModal will re-create it on demand
  if (squareCard) {
    try { squareCard.destroy(); } catch(e) {}
    squareCard = null;
  }
  
  // Hide digital wallet buttons to reset state
  document.getElementById('apple-pay-button').style.display = 'none';
  document.getElementById('google-pay-button').style.display = 'none';
  document.getElementById('apple-pay-button').innerHTML = '';
  document.getElementById('google-pay-button').innerHTML = '';
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
    pickupTime = `${dateStr}T${timeStr}`;
  }
  return { pickupType, pickupTime };
}

window.handlePayment = async () => {
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const customerName = nameInput?.value.trim();
  const customerPhone = phoneInput?.value.trim();

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

  payBtn.disabled = true;
  payBtn.textContent = 'Processing...';
  errorsEl.textContent = '';

  if (!squareCard) {
    errorsEl.textContent = 'Payment form not ready. Please close and reopen the checkout.';
    payBtn.disabled = false;
    payBtn.textContent = 'Pay Now';
    return;
  }

  try {
    const result = await squareCard.tokenize();
    if (result.status === 'OK') {
      
      cardContainer.style.display = 'none';
      processingDiv.style.display = 'flex';

      await processSquareToken(result.token, {
        customerName,
        customerPhone,
        tipCents,
        pickupType,
        pickupTime
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

async function processSquareToken(token, { customerName, customerPhone, tipCents, pickupType, pickupTime }) {
  try {
    // We send tipCents explicitly. The server calculates subtotals & taxes using evaluateDeals.
    const res = await processSquarePayment({
      sourceId: token,
      customerName,
      customerPhone,
      items: cart,
      tipCents,
      pickupType,
      pickupTime
    });

    const result = res;
    if (result.data.success) {
      // Payment Successful
      document.getElementById('payment-processing').style.display = 'none';
      document.getElementById('payment-success').style.display = 'block';
      document.getElementById('success-message').textContent = result.data.message;

    // Generate QR code for order status page
    const orderId = result.data.orderId;
    const accessToken = result.data.accessToken;
    const statusUrl = `https://bigiawasaana.com/order-status.html?orderId=${orderId}&token=${accessToken}`;
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
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof window.toggleCart === 'function') window.toggleCart(false);

    showToast('Payment successful! Your order is being prepared.');
    } // End of if (result.data.success)

  } catch (err) {
    console.error('Payment error:', err);
    const _processing = document.getElementById('payment-processing');
    const _cardContainer = document.getElementById('card-container');
    const _payBtn = document.getElementById('pay-button');
    const _errorsEl = document.getElementById('card-errors');

    if (_processing) _processing.style.display = 'none';
    if (_cardContainer) _cardContainer.style.display = 'block';
    if (_payBtn) {
      _payBtn.style.display = 'block';
      _payBtn.disabled = false;
      const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
      const evalResult = evaluateDeals(cart, activeDeals, menuItems);
      const discountAmount = evalResult.discountCents / 100;
      const discountedSubtotal = subtotal - discountAmount;
      const tipRaw = parseFloat(document.getElementById('tip-input')?.value || '0') || 0;
      const tip = Math.min(tipRaw, 100);
      _payBtn.innerHTML = `COMPLETE PURCHASE — <span id="pay-total">$${(discountedSubtotal * (1 + TAX_RATE) + tip).toFixed(2)}</span>`;
    }

    const errorMsg = err.message || 'Payment failed. Please try again.';
    if (_errorsEl) _errorsEl.textContent = errorMsg;
    showToast(errorMsg);
  }
};

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
// INIT
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadMenuFromFirestore();
  updateCartUI();

  initReveal();
  initSquarePayments();
});
