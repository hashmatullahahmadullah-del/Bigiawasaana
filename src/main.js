import './style.css';
import { db } from './firebase.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase.js';

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
let squareCard = null; // Square card payment method instance

// ─────────────────────────────────────────────────────────────────
// MENU LOADING
// ─────────────────────────────────────────────────────────────────
async function loadMenuFromFirestore() {
  const grid = document.getElementById('menu-grid');
  if (grid) {
    grid.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px 0;">Loading menu...</p>';
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
    
    const imgHtml = item.img 
      ? `<img src="${item.img}" alt="${item.name}" class="menu-card-img" loading="lazy">`
      : `<div class="menu-card-img" style="background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--gray); font-size: 13px;">No Image</div>`;
    
    card.innerHTML = `
      ${imgHtml}
      <div class="menu-card-content">
        <h3 class="menu-card-title">${item.name}</h3>
        <p class="menu-card-desc">${item.desc}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">$${item.price.toFixed(2)}</span>
          <button class="btn-primary btn-add-cart" onclick="addToCart('${item.id}')">+ Add</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

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
    
    const imgHtml = item.img 
      ? `<img src="${item.img}" alt="${item.name}" class="menu-card-img" loading="lazy">`
      : `<div class="menu-card-img" style="background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--gray); font-size: 13px;">🍽</div>`;
    
    card.innerHTML = `
      ${imgHtml}
      <div class="menu-card-content">
        <h3 class="menu-card-title">${item.name}</h3>
        <p class="menu-card-desc">${item.desc}</p>
      </div>
    `;
    grid.appendChild(card);
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
  let total = 0;
  let count = 0;
  
  if (cart.length === 0) {
    itemsContainer.innerHTML = '<p style="color: var(--gray); text-align: center; margin-top: 40px;">Your cart is empty.</p>';
  } else {
    cart.forEach(item => {
      total += item.price * item.qty;
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
  }
  
  countBadge.textContent = count;
  totalEl.textContent = `$${total.toFixed(2)}`;

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
    console.warn('Square SDK not loaded.');
    return;
  }

  try {
    squarePayments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID, {
      environment: 'production'
    });
    squareCard = await squarePayments.card();
    console.log('Square Web Payments initialized.');
  } catch (err) {
    console.error('Failed to initialize Square Web Payments:', err);
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

  // Show modal
  const modal = document.getElementById('payment-modal');
  modal.style.display = 'flex';

  // Reset states
  document.getElementById('pay-button').style.display = 'block';
  document.getElementById('card-container').style.display = 'block';
  document.getElementById('payment-processing').style.display = 'none';
  document.getElementById('payment-success').style.display = 'none';
  document.getElementById('card-errors').textContent = '';

  // Build order summary with tax + tip
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * TAX_RATE;
  const summaryEl = document.getElementById('payment-order-summary');

  function updateModalTotal() {
    const tipInput = document.getElementById('tip-input');
    const tip = parseFloat(tipInput?.value || '0') || 0;
    const safeTip = Math.min(tip, 100); // client-side cap matches server cap
    const total = subtotal + tax + safeTip;
    document.getElementById('modal-subtotal').textContent = `$${subtotal.toFixed(2)}`;
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
          <span style="color: var(--accent);" id="modal-total">$${(subtotal + tax).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;

  // Make updateModalTotal available to the oninput handler
  window.updateModalTotal = updateModalTotal;

  document.getElementById('pay-total').textContent = `$${(subtotal + tax).toFixed(2)}`;

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
      const totalAmount = (subtotal + tax + tipRaw).toFixed(2);
      
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
        await applePay.attach('#apple-pay-button');
        const apBtn = document.getElementById('apple-pay-button');
        apBtn.style.display = 'block';
        apBtn.onclick = null;
        apBtn.addEventListener('click', async () => {
          try {
            const result = await applePay.tokenize();
            if (result.status === 'OK') {
              await processSquareToken(result.token);
            } else {
              document.getElementById('card-errors').textContent = result.errors?.map(e => e.message).join(', ') || 'Apple Pay failed.';
            }
          } catch (e) {
            console.error('Apple Pay error:', e);
          }
        });
      } catch (e) {
        console.log('Apple Pay not supported:', e);
      }

      // Google Pay
      try {
        const googlePay = await squarePayments.googlePay(req);
        await googlePay.attach('#google-pay-button');
        const gpBtn = document.getElementById('google-pay-button');
        gpBtn.style.display = 'block';
        gpBtn.onclick = null;
        gpBtn.addEventListener('click', async () => {
          try {
            const result = await googlePay.tokenize();
            if (result.status === 'OK') {
              await processSquareToken(result.token);
            } else {
              document.getElementById('card-errors').textContent = result.errors?.map(e => e.message).join(', ') || 'Google Pay failed.';
            }
          } catch (e) {
            console.error('Google Pay error:', e);
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

  // Detach card form
  if (squareCard) {
    try { squareCard.destroy(); } catch(e) {}
    // We do not re-init automatically here to prevent double init, let's just detach or destroy.
    initSquarePayments();
  }
  
  // Hide digital wallet buttons to reset state
  document.getElementById('apple-pay-button').style.display = 'none';
  document.getElementById('google-pay-button').style.display = 'none';
  document.getElementById('apple-pay-button').innerHTML = '';
  document.getElementById('google-pay-button').innerHTML = '';
};

window.handlePayment = async () => {
  if (!squareCard) {
    showToast('Payment form not ready. Please refresh.');
    return;
  }

  const payButton = document.getElementById('pay-button');
  const errorsEl = document.getElementById('card-errors');

  errorsEl.textContent = '';
  payButton.disabled = true;
  payButton.textContent = 'Processing...';

  try {
    // Step 1: Tokenize the card
    const tokenResult = await squareCard.tokenize();

    if (tokenResult.status !== 'OK') {
      const errorMessages = tokenResult.errors?.map(e => e.message).join(', ') || 'Card validation failed.';
      errorsEl.textContent = errorMessages;
      payButton.disabled = false;
      const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
      const tipRaw = parseFloat(document.getElementById('tip-input')?.value || '0') || 0;
      const tip = Math.min(tipRaw, 100);
      payButton.innerHTML = `COMPLETE PURCHASE — <span id="pay-total">$${(subtotal * (1 + TAX_RATE) + tip).toFixed(2)}</span>`;
      return;
    }

    await processSquareToken(tokenResult.token);
  } catch (err) {
    console.error('Payment error:', err);
    errorsEl.textContent = 'An unexpected error occurred. Please try again.';
    payButton.disabled = false;
    payButton.innerHTML = 'COMPLETE PURCHASE';
  }
};

async function processSquareToken(token) {
  const cardContainer = document.getElementById('card-container');
  const payButton = document.getElementById('pay-button');
  const processingEl = document.getElementById('payment-processing');
  const successEl = document.getElementById('payment-success');
  const summaryEl = document.getElementById('payment-order-summary');
  const errorsEl = document.getElementById('card-errors');
  const digitalWallets = document.getElementById('digital-wallets');

  // Step 2: Show processing state
  payButton.style.display = 'none';
  cardContainer.style.display = 'none';
  summaryEl.style.display = 'none';
  if (digitalWallets) digitalWallets.style.display = 'none';
  processingEl.style.display = 'block';

  // Step 3: Call Cloud Function
  try {
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    const tipRaw = parseFloat(document.getElementById('tip-input')?.value || '0') || 0;
    const tipCents = Math.round(Math.min(tipRaw, 100) * 100);

    const result = await processSquarePayment({
      sourceId: token,
      items: cart.map(i => ({ id: i.id, qty: i.qty })),
      customerName: nameInput.value.trim(),
      customerPhone: phoneInput.value.trim(),
      tipCents,
    });

    // Step 4: Success!
    processingEl.style.display = 'none';
    successEl.style.display = 'block';

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
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof window.toggleCart === 'function') window.toggleCart(false);

    showToast('Payment successful! Your order is being prepared.');

  } catch (err) {
    console.error('Payment error:', err);
    processingEl.style.display = 'none';
    cardContainer.style.display = 'block';
    summaryEl.style.display = 'block';
    if (digitalWallets) digitalWallets.style.display = 'block';
    payButton.style.display = 'block';
    payButton.disabled = false;

    const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
    const tipRaw = parseFloat(document.getElementById('tip-input')?.value || '0') || 0;
    const tip = Math.min(tipRaw, 100);
    payButton.innerHTML = `COMPLETE PURCHASE — <span id="pay-total">$${(subtotal * (1 + TAX_RATE) + tip).toFixed(2)}</span>`;

    const errorMsg = err.message || 'Payment failed. Please try again.';
    errorsEl.textContent = errorMsg;
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
// COUNTDOWN TIMER
// ─────────────────────────────────────────────────────────────────
function initCountdown() {
  const openingDate = new Date('June 10, 2026 00:00:00').getTime();
  
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');
  
  if (!daysEl) return;
  
  const timer = setInterval(() => {
    const now = new Date().getTime();
    const distance = openingDate - now;
    
    if (distance < 0) {
      clearInterval(timer);
      document.getElementById('countdown').innerHTML = '<div style="font-size: 24px; color: var(--accent); font-weight: 700; font-family: \'Barlow Condensed\';">WE ARE OPEN!</div>';
      return;
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    daysEl.textContent = days.toString().padStart(2, '0');
    hoursEl.textContent = hours.toString().padStart(2, '0');
    minsEl.textContent = minutes.toString().padStart(2, '0');
    secsEl.textContent = seconds.toString().padStart(2, '0');
  }, 1000);
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
  initCountdown();
  initReveal();
  initSquarePayments();
});
