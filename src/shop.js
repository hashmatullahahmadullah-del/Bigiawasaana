import './style.css';
import { db, app } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { iconShoppingBag } from './icons.js';

let retailItems = [];
let shopCart = JSON.parse(localStorage.getItem('shopCart')) || [];
let selectedShippingCents = 500; // Default flat rate fallback

// ─────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────
async function initShop() {
  try {
    const querySnapshot = await getDocs(collection(db, 'retail_items'));
    retailItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderShopItems();
    updateCartIcon();
    renderCart();
  } catch (error) {
    console.error("Error loading shop items:", error);
  }
}

function renderShopItems() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
  grid.style.gap = '24px';
  
  if (retailItems.length === 0) {
    grid.innerHTML = '<p style="color:var(--gray); text-align:center; padding: 40px 0; grid-column: 1/-1;">No items available right now.</p>';
    return;
  }

  retailItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: var(--surface); 
      border: 1px solid var(--border); 
      border-radius: 12px; 
      overflow: hidden; 
      display: flex; 
      flex-direction: column; 
      transition: all 0.3s ease; 
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: fadeIn 0.5s ease forwards;
      animation-delay: ${index * 0.05}s;
      opacity: 0;
    `;
    
    // Add keyframes if not exists
    if (!document.getElementById('shop-animations')) {
      const style = document.createElement('style');
      style.id = 'shop-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
    
    const hrefSlug = item.slug || item.id;
    card.onclick = () => window.location.href = '/shop/item/' + hrefSlug;
    card.onmouseenter = () => {
      card.style.borderColor = 'var(--accent)';
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 8px 24px rgba(230, 81, 0, 0.2)';
    };
    card.onmouseleave = () => {
      card.style.borderColor = 'var(--border)';
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    };

    card.innerHTML = `
      <div style="background-image: url('${item.image || '/logo.webp'}'); background-position: center; background-size: cover; background-color: #000; height: 260px; border-bottom: 1px solid var(--border); position: relative;">
      </div>
      <div style="padding: 24px; display: flex; flex-direction: column; flex: 1;">
        <h3 style="font-family: 'Barlow Condensed'; font-size: 26px; font-weight: 700; margin: 0 0 10px 0; color: var(--white); text-transform: uppercase; letter-spacing: 1px;">${item.name}</h3>
        <p style="color: var(--gray); font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.description || 'Authentic Afghan spices for your home cooking.'}</p>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
            <div>
              <p style="color: var(--gray); font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Size / SKU</p>
              <p style="color: var(--white); font-size: 14px; margin: 0; font-weight: 500;">${item.weight} oz ${item.sku ? ' • ' + item.sku : ''}</p>
            </div>
            <p style="color: var(--accent); font-weight: 700; font-size: 26px; margin: 0; line-height: 1;">$${item.price.toFixed(2)}</p>
        </div>
        <button type="button" onclick="event.stopPropagation(); window.addShopItemToCart('${item.id}')" style="background: transparent; color: var(--accent); border: 1px solid var(--accent); border-radius: 6px; padding: 14px; font-family: 'Barlow Condensed'; font-size: 18px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; width: 100%; transition: background 0.2s, color 0.2s, transform 0.1s;" onmouseover="this.style.background='var(--accent)'; this.style.color='var(--white)'" onmouseout="this.style.background='transparent'; this.style.color='var(--accent)'" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
          Add to Cart
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────────
// CART OPERATIONS
// ─────────────────────────────────────────────────────────────────
window.addShopItemToCart = async (id, qtyToAdd = 1) => {
  let item = retailItems.find(i => i.id === id);
  
  if (!item) {
    try {
        const { getDoc, doc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'retail_items', id));
        if (snap.exists()) {
            item = { id: snap.id, ...snap.data() };
            retailItems.push(item);
        } else {
            console.error("Item not found");
            return;
        }
    } catch(e) {
        console.error(e);
        return;
    }
  }

  const existing = shopCart.find(i => i.id === id);
  if (existing) {
    existing.qty += qtyToAdd;
  } else {
    shopCart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: qtyToAdd,
      image: item.image,
      weight: item.weight
    });
  }
  
  saveCart();
  updateCartIcon();
  renderCart();
  window.toggleCart(true);
};

function saveCart() {
  localStorage.setItem('shopCart', JSON.stringify(shopCart));
}

function updateCartIcon() {
  const count = shopCart.reduce((acc, item) => acc + item.qty, 0);
  const badge = document.getElementById('cart-count-badge');
  if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

window.toggleCart = (forceOpen) => {
    const overlay = document.getElementById('cart-overlay') || document.querySelector('.cart-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    
    let actualOverlay = overlay;
    if (!actualOverlay) {
        actualOverlay = document.createElement('div');
        actualOverlay.id = 'cart-overlay';
        actualOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1999; display: none;';
        actualOverlay.onclick = () => window.toggleCart(false);
        document.body.appendChild(actualOverlay);
    }

    const isOpen = drawer.style.right === '0px';
    const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;

    if (shouldOpen) {
      drawer.style.right = '0px';
      actualOverlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    } else {
      drawer.style.right = '-100%';
      actualOverlay.style.display = 'none';
      document.body.style.overflow = '';
    }
};

function renderCart() {
  const container = document.getElementById('cart-items');
  if (!container) return;

  if (shopCart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="display: flex; justify-content: center; margin-bottom: 16px; color: var(--accent);">${iconShoppingBag(48)}</div>
        <p style="color: var(--gray); font-size: 16px; margin: 0 0 16px 0;">Your shopping bag is empty.</p>
        <button type="button" onclick="window.toggleCart(false)" class="btn-outline" style="padding: 10px 20px; font-size: 14px;">Continue Shopping</button>
      </div>
    `;
    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = '$0.00';
    return;
  }

  let subtotal = 0;
  container.innerHTML = shopCart.map((item, index) => {
    subtotal += item.price * item.qty;
    return `
      <div style="display: flex; gap: 16px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border); align-items: center;">
        <img src="${item.image || '/logo.webp'}" alt="${item.name}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 4px 0; font-family: 'Barlow Condensed'; font-size: 18px; text-transform: uppercase;">${item.name}</h4>
          <p style="margin: 0 0 8px 0; color: var(--accent); font-weight: 700; font-size: 15px;">$${item.price.toFixed(2)}</p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; background: var(--surface);">
              <button type="button" onclick="updateShopCartQty(${index}, -1)" style="background: none; border: none; color: var(--white); width: 28px; height: 28px; font-weight: bold; cursor: pointer;">-</button>
              <span style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold;">${item.qty}</span>
              <button type="button" onclick="updateShopCartQty(${index}, 1)" style="background: none; border: none; color: var(--white); width: 28px; height: 28px; font-weight: bold; cursor: pointer;">+</button>
            </div>
            <button type="button" onclick="removeShopCartItem(${index})" style="background: none; border: none; color: var(--gray); font-size: 12px; cursor: pointer; text-decoration: underline; margin-left: auto;">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const shipping = (selectedShippingCents / 100);
  const total = subtotal + shipping;
  
  const subtotalEl = document.getElementById('cart-subtotal');
  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  
  const shippingEl = document.getElementById('cart-shipping');
  if (shippingEl) shippingEl.textContent = `$${shipping.toFixed(2)}`;
  
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

window.updateShopCartQty = (index, delta) => {
  shopCart[index].qty += delta;
  if (shopCart[index].qty <= 0) {
    shopCart.splice(index, 1);
  }
  saveCart();
  updateCartIcon();
  renderCart();
};

window.removeShopCartItem = (index) => {
  shopCart.splice(index, 1);
  saveCart();
  updateCartIcon();
  renderCart();
};

// ─────────────────────────────────────────────────────────────────
// CHECKOUT MODAL & SQUARE INITIALIZATION
// ─────────────────────────────────────────────────────────────────
let squarePaymentLoaded = false;
let squarePayments = null;
let squareCard = null;
let squareReq = null;
let applePay = null;
let googlePay = null;
let walletShippingCents = null;

let isInitializingSquare = false;

window.initAddressAutocomplete = () => {
  if (window.addressAutocompleteInitialized) return;
  const input = document.getElementById('ship-address');
  if (!input) return;

  const autocomplete = new window.google.maps.places.Autocomplete(input, {
    fields: ['address_components'],
    types: ['address']
  });
  window.addressAutocompleteInitialized = true;

  const countrySelect = document.getElementById('ship-country');
  if (countrySelect && countrySelect.value) {
    autocomplete.setComponentRestrictions({ country: countrySelect.value.toLowerCase() });
  }

  if (countrySelect) {
    countrySelect.addEventListener('change', () => {
      autocomplete.setComponentRestrictions({ country: countrySelect.value.toLowerCase() });
    });
  }

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.address_components) return;

    let streetNumber = '';
    let route = '';
    
    document.getElementById('ship-city').value = '';
    document.getElementById('ship-state').value = '';
    document.getElementById('ship-zip').value = '';

    for (const component of place.address_components) {
      const type = component.types[0];
      if (type === 'street_number') streetNumber = component.long_name;
      else if (type === 'route') route = component.long_name;
      else if (type === 'locality' || type === 'postal_town') document.getElementById('ship-city').value = component.long_name;
      else if (type === 'administrative_area_level_1') document.getElementById('ship-state').value = component.short_name;
      else if (type === 'postal_code') document.getElementById('ship-zip').value = component.long_name;
      else if (type === 'country') document.getElementById('ship-country').value = component.short_name;
    }
    
    input.value = `${streetNumber} ${route}`.trim();
    
    if (document.getElementById('ship-zip').value) {
      window.window.fetchShippingRates();
    }
  });
};

window.showCheckoutModal = async () => {
  if (shopCart.length === 0) {
    alert('Your shopping bag is empty!');
    return;
  }
  window.toggleCart(false);
  
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.style.display = 'flex';
  
  window.updateCartTotalWithShipping();
  
  const zipEl = document.getElementById('ship-zip');
  if (zipEl && zipEl.value.trim().length >= 5) {
    window.window.fetchShippingRates();
  }

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleApiKey && googleApiKey !== 'your_actual_api_key_here') {
    if (!window.google) {
      if (!window.googleMapsLoading) {
        window.googleMapsLoading = true;
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = window.initAddressAutocomplete;
        document.head.appendChild(script);
      }
    } else {
      window.initAddressAutocomplete();
    }
  }
  
  await initSquare();
};

window.closeCheckoutModal = () => {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.style.display = 'none';
};

async function initSquare() {
  if (squarePaymentLoaded) {
    window.updateCartTotalWithShipping();
    return;
  }
  if (isInitializingSquare) return;
  isInitializingSquare = true;

  // Poll for Square SDK if still loading
  if (!window.Square) {

    let attempts = 0;
    while (!window.Square && attempts < 10) {
      await new Promise(r => setTimeout(r, 200));
      attempts++;
    }
  }

  if (!window.Square) {
    console.error('Square SDK failed to load');
    const errEl = document.getElementById('card-errors');
    if (errEl) errEl.textContent = 'Payment service unavailable. Please check your internet connection.';
    isInitializingSquare = false;
    return;
  }

  const appId = import.meta.env.VITE_SQUARE_APP_ID;
  const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

  try {
    if (!squarePayments) {
      squarePayments = window.Square.payments(appId, locationId);
    }
    
    // Attach Credit/Debit Card Form
    if (!squareCard) {
      squareCard = await squarePayments.card();
    }
    
    try {
      await squareCard.attach('#card-container');
    } catch (attachErr) {
      /* ignore */
    }
    
    squarePaymentLoaded = true;
    
    setupPaymentForm(squareCard);
    setupDigitalWallets();
    
  } catch (e) {
    console.error('Initializing Square failed', e);
    const errEl = document.getElementById('card-errors');
    if (errEl) errEl.textContent = 'Failed to load card entry: ' + (e.message || 'Please refresh.');
  } finally {
    isInitializingSquare = false;
  }
}

async function setupDigitalWallets() {
  let subtotal = 0;
  shopCart.forEach(i => { subtotal += i.price * i.qty; });
  const total = subtotal + (selectedShippingCents / 100);
  
  try {
    squareReq = squarePayments.paymentRequest({
      countryCode: 'US',
      currencyCode: 'USD',
      total: {
        amount: total.toFixed(2),
        label: 'Bigi Spices Order',
      },
      requestShippingContact: true,
      requestBillingContact: true,
    });
    
    walletShippingCents = 500;

    squareReq.addEventListener('shippingcontactchanged', async (contact) => {
      try {
        const getShippingRates = httpsCallable(getFunctions(app), 'getShippingRates');
        const res = await getShippingRates({
          address: contact.addressLines?.[0] || '',
          city: contact.city || '',
          state: contact.state || '',
          zip: contact.postalCode || '',
          country: contact.country || 'US',
          items: shopCart
        });
        const rates = res.data.rates || [];
        if (rates.length > 0) {
          const cheapest = rates[0];
          walletShippingCents = cheapest.cents;
          const newShipping = cheapest.cents / 100;
          const newTotal = subtotal + newShipping;
          
          return {
            shippingOptions: rates.map(r => ({
              id: r.object_id,
              amount: (r.cents / 100).toFixed(2),
              label: `${r.provider} ${r.service}`
            })),
            lineItems: [
              { amount: subtotal.toFixed(2), label: 'Subtotal' },
              { amount: newShipping.toFixed(2), label: 'Shipping' }
            ],
            total: { amount: newTotal.toFixed(2), label: 'Bigi Spices Order' }
          };
        } else {
          return { errors: [{ message: 'No shipping available for this address.' }] };
        }
      } catch (e) {
        return { errors: [{ message: 'Failed to calculate shipping rates.' }] };
      }
    });

    squareReq.addEventListener('shippingoptionchanged', (option) => {
      const selectedShipping = parseFloat(option.amount);
      walletShippingCents = Math.round(selectedShipping * 100);
      const newTotal = subtotal + selectedShipping;
      return {
        lineItems: [
          { amount: subtotal.toFixed(2), label: 'Subtotal' },
          { amount: selectedShipping.toFixed(2), label: 'Shipping' }
        ],
        total: { amount: newTotal.toFixed(2), label: 'Bigi Spices Order' }
      };
    });

    // Clean up previous Google Pay instance if any
    if (googlePay) {
      try { await googlePay.destroy(); } catch(e) {}
      googlePay = null;
    }
    applePay = null;

    // Apple Pay (Native Web Payments SDK - does not use .attach())
    try {
      applePay = await squarePayments.applePay(squareReq);
      const apBtn = document.getElementById('apple-pay-button');
      if (apBtn) {
        apBtn.style.display = 'flex';
        apBtn.onclick = async (e) => {
          e.preventDefault();
          handleDigitalWalletClick(applePay);
        };
      }
    } catch(e) { 
      console.log('Apple Pay not supported (retail):', e.message || e);
      const apBtn = document.getElementById('apple-pay-button');
      if (apBtn) apBtn.style.display = 'none';
    }

    // Google Pay (Square Web Payments SDK)
    try {
      googlePay = await squarePayments.googlePay(squareReq);
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
        gpBtn.onclick = async (e) => {
          e.preventDefault();
          handleDigitalWalletClick(googlePay);
        };
      }
    } catch(e) { 
      console.log('Google Pay not supported or failed to initialize (retail):', e.message || e);
      const gpBtn = document.getElementById('google-pay-button');
      if (gpBtn) gpBtn.style.display = 'none';
    }
  } catch(e) {

  }
}

async function handleDigitalWalletClick(walletInstance) {
  try {
    const tokenResult = await walletInstance.tokenize();
    if (tokenResult.status === 'OK') {
      const contact = tokenResult.details?.shippingContact || tokenResult.details?.billingContact || {};
      
      const name = (contact.givenName && contact.familyName ? `${contact.givenName} ${contact.familyName}` : contact.givenName || contact.familyName) || document.getElementById('ship-name').value.trim();
      const email = contact.email || document.getElementById('ship-email').value.trim();
      const phone = contact.phone || document.getElementById('ship-phone').value.trim();
      const address = contact.addressLines?.[0] || document.getElementById('ship-address').value.trim();
      const city = contact.city || document.getElementById('ship-city').value.trim();
      const state = contact.state || document.getElementById('ship-state').value.trim();
      const zip = contact.postalCode || document.getElementById('ship-zip').value.trim();

      if (!name || !email || !address || !city || !state || !zip) {
        document.getElementById('card-errors').textContent = 'Please fill out your full shipping name & address in the form.';
        return;
      }
      
      const overrideSelectedShippingCents = (typeof walletShippingCents !== 'undefined' && walletShippingCents !== null) 
          ? walletShippingCents 
          : selectedShippingCents;

      await submitRetailOrder(tokenResult.token, { name, email, phone, address, city, state, zip, selectedShippingCents: overrideSelectedShippingCents });
    } else {
      document.getElementById('card-errors').textContent = tokenResult.errors?.[0]?.message || 'Digital wallet payment failed.';
    }
  } catch (e) {
    console.error(e);
    document.getElementById('card-errors').textContent = e.message || 'Payment processing error.';
  }
}

function setupPaymentForm(card) {
  const btnSubmit = document.getElementById('card-button');
  if (!btnSubmit) return;
  
  btnSubmit.onclick = async (e) => {
    e.preventDefault();
    if (!card) return;
    
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Processing...';
    document.getElementById('card-errors').textContent = '';

    const name = document.getElementById('ship-name').value.trim();
    const email = document.getElementById('ship-email').value.trim();
    const phone = document.getElementById('ship-phone').value.trim();
    const address = document.getElementById('ship-address').value.trim();
    const city = document.getElementById('ship-city').value.trim();
    const state = document.getElementById('ship-state').value.trim();
    const zip = document.getElementById('ship-zip').value.trim();

    if (!name || !email || !phone || !address || !city || !state || !zip) {
      document.getElementById('card-errors').textContent = 'Please fill out all shipping details above.';
      btnSubmit.disabled = false;
      window.updateCartTotalWithShipping();
      return;
    }

    try {
      const tokenResult = await card.tokenize();
      if (tokenResult.status === 'OK') {
        await submitRetailOrder(tokenResult.token);
      } else {
        document.getElementById('card-errors').textContent = tokenResult.errors?.[0]?.message || 'Please check your card details.';
      }
    } catch (e) {
      console.error(e);
      document.getElementById('card-errors').textContent = e.message || 'Payment failed.';
    } finally {
      btnSubmit.disabled = false;
      window.updateCartTotalWithShipping();
    }
  };
}

async function submitRetailOrder(sourceId, overrideContact = null) {
  const processRetailPayment = httpsCallable(getFunctions(app), 'processRetailPayment');
  
  const payload = {
    sourceId: sourceId,
    items: shopCart,
    customerName: overrideContact?.name || document.getElementById('ship-name').value.trim(),
    customerEmail: overrideContact?.email || document.getElementById('ship-email').value.trim(),
    customerPhone: overrideContact?.phone || document.getElementById('ship-phone').value.trim(),
    address: overrideContact?.address || document.getElementById('ship-address').value.trim(),
    city: overrideContact?.city || document.getElementById('ship-city').value.trim(),
    state: overrideContact?.state || document.getElementById('ship-state').value.trim(),
    zip: overrideContact?.zip || document.getElementById('ship-zip').value.trim(),
    country: document.getElementById('ship-country')?.value || 'US',
    selectedShippingCents: typeof selectedShippingCents !== 'undefined' ? selectedShippingCents : 500
  };

  const response = await processRetailPayment(payload);
  
  if (response.data && response.data.success) {
    // Clear Cart
    shopCart = [];
    saveCart();
    updateCartIcon();
    renderCart();
    window.closeCheckoutModal();
    alert('Thank you! Your order has been confirmed. We will email you tracking details when it ships!');
    window.location.href = '/shop';
  } else {
    throw new Error(response.data?.message || 'Transaction could not be completed.');
  }
}

// ─────────────────────────────────────────────────────────────────
// LIVE SHIPPING RATES
// ─────────────────────────────────────────────────────────────────
window.fetchShippingRates = async () => {
  const zip = document.getElementById('ship-zip')?.value.trim() || '';
  const country = document.getElementById('ship-country')?.value || 'US';
  const container = document.getElementById('shipping-rates-list');
  if (!container) return;
  
  if (zip.length < 3) {
    container.innerHTML = '<span style="color:var(--gray);">Enter your ZIP / postal code to calculate live rates...</span>';
    return;
  }
  
  container.innerHTML = '<span style="color:var(--accent);">Calculating live carrier rates...</span>';
  
  try {
    const getShippingRates = httpsCallable(getFunctions(app), 'getShippingRates');
    const res = await getShippingRates({
      zip,
      country,
      items: shopCart
    });
    
    const rates = res.data.rates || [];
    if (rates.length === 0) {
      container.innerHTML = '<span style="color:var(--gray);">Standard Ground: $5.00</span>';
      selectedShippingCents = 500;
      window.updateCartTotalWithShipping();
      return;
    }
    
    container.innerHTML = '';
    rates.forEach((rate, idx) => {
       const label = document.createElement('label');
       label.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; margin-bottom: 6px;';
       label.innerHTML = `
         <div style="display: flex; align-items: center; gap: 8px;">
           <input type="radio" name="shippingRate" value="${rate.cents}" ${idx === 0 ? 'checked' : ''} onchange="selectShippingRate(${rate.cents})">
           <div>
             <span style="font-weight: 600; color: var(--white); font-size: 13px;">${rate.provider} - ${rate.service}</span>
             <div style="font-size: 11px; color: var(--gray);">Estimated ${rate.days ? rate.days + ' days' : '3-5 business days'}</div>
           </div>
         </div>
         <div style="font-family: 'Outfit'; font-weight: 700; color: var(--accent); font-size: 14px;">$${rate.amount}</div>
       `;
       container.appendChild(label);
    });
    
    selectedShippingCents = rates[0].cents;
    window.updateCartTotalWithShipping();
    
  } catch(e) {
    console.error('Rates fetch error:', e);
    container.innerHTML = '<span style="color:var(--gray);">Standard Flat Shipping: $5.00</span>';
    selectedShippingCents = 500;
    window.updateCartTotalWithShipping();
  }
};

window.selectShippingRate = (cents) => {
  selectedShippingCents = cents;
  window.updateCartTotalWithShipping();
};

window.updateCartTotalWithShipping = () => {
  let subtotal = 0;
  shopCart.forEach(i => { subtotal += i.price * i.qty; });
  const total = subtotal + (selectedShippingCents / 100);
  
  const submitBtn = document.getElementById('card-button');
  if (submitBtn) {
     submitBtn.textContent = `Pay $${total.toFixed(2)}`;
  }
  
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  
  const cartShippingEl = document.getElementById('cart-shipping');
  if (cartShippingEl) cartShippingEl.textContent = `$${(selectedShippingCents / 100).toFixed(2)}`;
  
  const cartTotalEl = document.getElementById('cart-total');
  if (cartTotalEl) cartTotalEl.textContent = `$${total.toFixed(2)}`;

  if (squareReq) {
    try {
      squareReq.update({
        total: {
          amount: total.toFixed(2),
          label: 'Bigi Spices Order'
        }
      });
    } catch(e) {

    }
  }
};

// ─────────────────────────────────────────────────────────────────
// BOOTSTRAP ON LOAD
// ─────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onPageReady);
} else {
  onPageReady();
}

function onPageReady() {
  initShop();
  
  const zipInput = document.getElementById('ship-zip');
  if (zipInput) {
    zipInput.addEventListener('blur', fetchShippingRates);
    zipInput.addEventListener('input', () => {
      if (zipInput.value.trim().length >= 3) {
        window.window.fetchShippingRates();
      }
    });
  }

  const countrySelect = document.getElementById('ship-country');
  if (countrySelect) {
    countrySelect.addEventListener('change', () => {
      const zipVal = document.getElementById('ship-zip')?.value.trim() || '';
      if (zipVal.length >= 3) {
        window.window.fetchShippingRates();
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────
window.submitReview = async function(event, productId) {
  event.preventDefault();
  const btn = document.getElementById('review-submit-btn');
  const statusEl = document.getElementById('review-status');
  const name = document.getElementById('review-name').value;
  const rating = parseInt(document.getElementById('review-rating').value, 10);
  const text = document.getElementById('review-text').value;

  btn.disabled = true;
  btn.textContent = 'Submitting...';
  statusEl.textContent = '';
  statusEl.style.color = 'var(--white)';

  try {
    const submitRetailReview = httpsCallable(getFunctions(app), 'submitRetailReview');
    await submitRetailReview({ productId, name, rating, reviewText: text });
    
    statusEl.textContent = 'Review submitted! Refreshing...';
    statusEl.style.color = '#4ade80';
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error(error);
    statusEl.textContent = error.message || 'Error submitting review.';
    statusEl.style.color = '#ef4444';
    btn.disabled = false;
    btn.textContent = 'Submit Review';
  }
};
