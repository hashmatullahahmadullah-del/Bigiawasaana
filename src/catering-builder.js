/**
 * BIGI AWASAANA — Luxury Custom Catering Package Builder
 * Interactive Multi-Step Client Engine
 */

import { db, app } from './firebase.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DEFAULT_CATERING_CATALOG, DEFAULT_PACKAGE_TEMPLATES, OPTIONAL_CATERING_SERVICES } from './lib/catering-catalog-data.js';

// Live catalog cache with fallback to DEFAULT_CATERING_CATALOG
export let activeCateringCatalog = [...DEFAULT_CATERING_CATALOG];

export async function loadLiveCateringCatalog() {
  try {
    const snap = await getDocs(collection(db, 'catering_catalog'));
    if (!snap.empty) {
      const items = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.published !== false) {
          items.push({ id: d.id, ...data });
        }
      });
      if (items.length > 0) {
        items.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
        activeCateringCatalog = items;
      }
    }
  } catch (err) {
    console.warn('Using default catering catalog fallback:', err);
  }
}
loadLiveCateringCatalog();

// State
export const builderState = {
  currentStep: 1, // 1: Event Info, 2: Package Type, 3: Food Selection, 4: Optional Services, 5: Review & Submit
  eventDetails: {
    type: 'Family Gathering',
    date: '',
    time: '17:00',
    guests: 50,
    fulfillment: 'delivery',
    deliveryAddress: '',
    specialInstructions: ''
  },
  packageType: 'custom_scratch', // 'custom_scratch' | 'template'
  selectedTemplateId: null,
  cartItems: {}, // { [dishId]: { id, nameEn, portionSize, unitPrice, imageUrl, quantity, servingYield } }
  selectedServices: {}, // { [serviceId]: true }
  activeCategory: 'all'
};

window.builderState = builderState;
window.nextStep = () => goToStep(Math.min(5, (builderState.currentStep || 1) + 1));
window.prevStep = () => goToStep(Math.max(1, (builderState.currentStep || 1) - 1));

export function clearBuilderCart() {
  builderState.cartItems = {};
  builderState.selectedServices = {};
  builderState.selectedTemplateId = null;
  builderState.packageType = 'custom_scratch';
  updatePriceBreakdown();
  if (builderState.currentStep === 1) renderStep1();
  if (builderState.currentStep === 2) renderStep2();
  if (builderState.currentStep === 3) renderStep3();
  if (builderState.currentStep === 4) renderStep4();
  if (builderState.currentStep === 5) renderStep5();
}
window.clearBuilderCart = clearBuilderCart;

export function removeDishFromCart(dishId) {
  if (builderState.cartItems[dishId]) {
    delete builderState.cartItems[dishId];
    renderPortionAssistant();
    renderBanquetRail();
    updatePriceBreakdown();
    if (builderState.currentStep === 3) renderStep3();
    if (builderState.currentStep === 5) renderStep5();
  }
}
window.removeDishFromCart = removeDishFromCart;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Open / Close Builder
 */
export function openPackageBuilder(presetGuests = null) {
  const modal = document.getElementById('catering-package-builder-modal');
  if (!modal) return;

  if (presetGuests && parseInt(presetGuests) > 0) {
    builderState.eventDetails.guests = parseInt(presetGuests);
  }

  // Pre-fill default date to 7 days from now if blank
  if (!builderState.eventDetails.date) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    builderState.eventDetails.date = futureDate.toISOString().split('T')[0];
  }

  // Start fresh with clean cart for custom scratch orders
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  goToStep(builderState.currentStep || 1);
}
window.openPackageBuilder = openPackageBuilder;

export function closePackageBuilder() {
  const modal = document.getElementById('catering-package-builder-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}
window.closePackageBuilder = closePackageBuilder;

/**
 * Step Navigation
 */
export function goToStep(stepNum) {
  // Validate Step 1 before moving forward
  if (stepNum > 1 && builderState.currentStep === 1) {
    const dateInput = document.getElementById('builder-event-date');
    if (dateInput && !dateInput.value) {
      alert('Please select your preferred event date.');
      dateInput.focus();
      return;
    }
  }

  builderState.currentStep = stepNum;

  // Update step navigation tabs
  for (let i = 1; i <= 5; i++) {
    const tab = document.getElementById(`builder-tab-${i}`);
    const pane = document.getElementById(`builder-pane-step-${i}`);
    if (tab) {
      tab.classList.toggle('active', i === stepNum);
      tab.classList.toggle('completed', i < stepNum);
    }
    if (pane) {
      pane.style.display = i === stepNum ? 'block' : 'none';
    }
  }

  const nextBtn = document.getElementById('builder-next-btn');
  const mobileNextBtn = document.getElementById('builder-mobile-next-btn');
  if (nextBtn) {
    nextBtn.style.display = stepNum === 5 ? 'none' : 'inline-flex';
  }
  if (mobileNextBtn) {
    mobileNextBtn.style.display = stepNum === 5 ? 'none' : 'inline-flex';
  }

  // Update step specific view
  if (stepNum === 1) renderStep1();
  if (stepNum === 2) renderStep2();
  if (stepNum === 3) renderStep3();
  if (stepNum === 4) renderStep4();
  if (stepNum === 5) renderStep5();

  updatePriceBreakdown();

  // Scroll to top of modal container
  const container = document.querySelector('.builder-modal-container');
  if (container) container.scrollTop = 0;
}
window.goToStep = goToStep;

/**
 * Step 1: Event Details & Guest Count
 */
const EVENT_TYPES = [
  { id: 'Wedding / Engagement', label: 'Wedding / Engagement', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' },
  { id: 'Family Gathering', label: 'Family Celebration', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { id: 'Corporate Lunch', label: 'Corporate Event', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
  { id: 'Birthday Party', label: 'Birthday Party', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v2"/><path d="M12 8v2"/><path d="M17 8v2"/></svg>' },
  { id: 'Graduation', label: 'Graduation', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' },
  { id: 'Other', label: 'Other Special Banquet', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' }
];

function renderStep1() {
  const typeContainer = document.getElementById('builder-event-type-grid');
  if (typeContainer) {
    typeContainer.innerHTML = EVENT_TYPES.map(t => {
      const isSel = builderState.eventDetails.type === t.id;
      return `
        <div class="event-type-card ${isSel ? 'active' : ''}" onclick="window.selectEventType('${t.id}')">
          <div class="event-type-icon">${t.icon}</div>
          <div style="font-weight: 700; font-size: 13px; color: ${isSel ? '#FF4500' : '#fff'};">${t.label}</div>
        </div>
      `;
    }).join('');
  }

  const dateInput = document.getElementById('builder-event-date');
  const timeInput = document.getElementById('builder-event-time');
  const guestCustomInput = document.getElementById('builder-guests-custom');
  const addressContainer = document.getElementById('builder-address-container');
  const addressInput = document.getElementById('builder-delivery-address');
  const instructionsInput = document.getElementById('builder-special-instructions');

  if (dateInput) dateInput.value = builderState.eventDetails.date;
  if (timeInput) timeInput.value = builderState.eventDetails.time;
  if (guestCustomInput) guestCustomInput.value = builderState.eventDetails.guests;
  if (addressInput) addressInput.value = builderState.eventDetails.deliveryAddress;
  if (instructionsInput) instructionsInput.value = builderState.eventDetails.specialInstructions;

  if (addressContainer) {
    addressContainer.style.display = builderState.eventDetails.fulfillment === 'delivery' ? 'block' : 'none';
  }

  // Highlight active guest pill
  document.querySelectorAll('.guest-pill').forEach(pill => {
    const val = parseInt(pill.getAttribute('data-guests'), 10);
    pill.classList.toggle('active', val === builderState.eventDetails.guests);
  });

  // Update guest recommendation note
  const hintEl = document.getElementById('builder-guest-hint');
  if (hintEl) {
    const g = builderState.eventDetails.guests || 25;
    const trayCount = Math.max(3, Math.round(g / 8));
    hintEl.textContent = `Recommended for ${g} guests: ~${trayCount} party trays for a generous Afghan family-style feast.`;
  }
}

export function selectEventType(type) {
  builderState.eventDetails.type = type;
  renderStep1();
}
window.selectEventType = selectEventType;

export function selectGuestPill(count) {
  builderState.eventDetails.guests = count;
  const customInput = document.getElementById('builder-guests-custom');
  if (customInput) customInput.value = count;
  renderStep1();
  updatePriceBreakdown();
}
window.selectGuestPill = selectGuestPill;

export function handleGuestCustomChange(val) {
  const count = Math.max(5, parseInt(val, 10) || 25);
  builderState.eventDetails.guests = count;
  renderStep1();
  updatePriceBreakdown();
}
window.handleGuestCustomChange = handleGuestCustomChange;

export function selectFulfillment(val) {
  builderState.eventDetails.fulfillment = val;
  const pickCard = document.getElementById('fulfillment-card-pickup');
  const delCard = document.getElementById('fulfillment-card-delivery');
  if (pickCard) pickCard.classList.toggle('active', val === 'pickup');
  if (delCard) delCard.classList.toggle('active', val === 'delivery');

  const addressContainer = document.getElementById('builder-address-container');
  if (addressContainer) {
    addressContainer.style.display = val === 'delivery' ? 'block' : 'none';
  }
  updatePriceBreakdown();
}
window.selectFulfillment = selectFulfillment;

/**
 * Step 2: Choose Package Type (Scratch vs Preset Template)
 */
function renderStep2() {
  const scratchCard = document.getElementById('start-path-scratch');
  const templateCard = document.getElementById('start-path-template');
  const templatesListContainer = document.getElementById('builder-templates-grid');

  if (scratchCard) scratchCard.classList.toggle('active', builderState.packageType === 'custom_scratch');
  if (templateCard) templateCard.classList.toggle('active', builderState.packageType === 'template');

  if (templatesListContainer) {
    let html = '';
    DEFAULT_PACKAGE_TEMPLATES.forEach(tpl => {
      const isSelected = builderState.selectedTemplateId === tpl.id;
      html += `
        <div class="template-card ${isSelected ? 'active' : ''}" onclick="window.selectPackageTemplate('${tpl.id}')">
          <div style="position: relative;">
            <img src="${tpl.imageUrl}" alt="${escapeHtml(tpl.titleEn)}" class="template-card-img" loading="lazy">
            <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; color: #FF4500; border: 1px solid rgba(255,69,0,0.3);">
              ~${tpl.recommendedGuests} Guests
            </div>
          </div>
          <div style="padding: 18px; flex: 1; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <h3 style="font-size: 17px; font-weight: 700; color: #fff; margin: 0;">${escapeHtml(tpl.titleEn)}</h3>
            </div>
            <div style="font-size: 12px; color: #ff6a00; font-family: 'Vazirmatn', sans-serif; direction: rtl; margin-bottom: 8px;">${escapeHtml(tpl.titleFa || '')}</div>
            <p style="font-size: 13px; color: #999; margin: 0 0 14px; line-height: 1.5; flex: 1;">${escapeHtml(tpl.descriptionEn)}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #222; padding-top: 12px;">
              <span style="font-size: 12px; color: #aaa; font-weight: 600;">Includes ${tpl.defaultItems.length} party dishes</span>
              <button type="button" class="btn-primary btn-sm" style="padding: 8px 16px; font-size: 12px; font-weight: 700;">
                ${isSelected ? 'Selected' : 'Select Feast'}
              </button>
            </div>
          </div>
        </div>
      `;
    });
    templatesListContainer.innerHTML = html;
  }
}

export function selectPackageType(type) {
  builderState.packageType = type;
  if (type === 'custom_scratch') {
    builderState.selectedTemplateId = null;
  }
  renderStep2();
}
window.selectPackageType = selectPackageType;
window.startFromScratch = () => {
  selectPackageType('custom_scratch');
  goToStep(3);
};

export function selectPackageTemplate(templateId) {
  builderState.packageType = 'template';
  builderState.selectedTemplateId = templateId;

  const tpl = DEFAULT_PACKAGE_TEMPLATES.find(t => t.id === templateId);
  if (tpl) {
    builderState.cartItems = {};
    tpl.defaultItems.forEach(item => {
      const catalogItem = activeCateringCatalog.find(c => c.id === item.catalogId) || DEFAULT_CATERING_CATALOG.find(c => c.id === item.catalogId);
      if (catalogItem) {
        builderState.cartItems[catalogItem.id] = {
          ...catalogItem,
          quantity: item.quantity
        };
      }
    });
  }

  renderStep2();
  updatePriceBreakdown();
}
window.selectPackageTemplate = selectPackageTemplate;

/**
 * Step 3: Interactive Food Selection & Smart Portion Advisor
 */
function renderStep3() {
  renderPortionAssistant();

  const container = document.getElementById('builder-catalog-grid');
  if (!container) return;

  const catalogSource = (activeCateringCatalog && activeCateringCatalog.length > 0) ? activeCateringCatalog : DEFAULT_CATERING_CATALOG;
  const filteredItems = builderState.activeCategory === 'all'
    ? catalogSource
    : catalogSource.filter(it => it.category === builderState.activeCategory);

  let html = '';
  filteredItems.forEach(dish => {
    const cartEntry = builderState.cartItems[dish.id];
    const qty = cartEntry ? cartEntry.quantity : 0;
    const inCart = qty > 0;

    html += `
      <div class="catalog-food-card ${inCart ? 'in-cart' : ''}" id="dish-card-${dish.id}">
        <div class="food-card-img-wrap">
          <img src="${dish.imageUrl || '/logo.webp'}" alt="${escapeHtml(dish.nameEn)}" loading="lazy">
          <div class="food-card-badge">${escapeHtml(dish.dietary?.[0] || '100% Zabiha')}</div>
        </div>
        <div class="food-card-body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
            <div>
              <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0 0 2px;">${escapeHtml(dish.nameEn)}</h4>
              <div style="font-size: 12px; color: #ff6a00; direction: rtl; font-family: 'Vazirmatn', sans-serif;">${escapeHtml(dish.nameFa || '')}</div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 18px; font-weight: 800; color: #FF4500;">$${dish.unitPrice.toFixed(2)}</div>
              <div style="font-size: 11px; color: #888; text-transform: uppercase;">/${dish.pricingUnit || 'tray'}</div>
            </div>
          </div>

          <p style="font-size: 12px; color: #aaa; margin: 8px 0; line-height: 1.45; flex: 1;">${escapeHtml(dish.descriptionEn || '')}</p>

          <div style="font-size: 12px; color: #10b981; font-weight: 600; margin-bottom: 14px; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span>${escapeHtml(dish.portionSize || 'Party Tray')}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #222; padding-top: 12px; margin-top: auto;">
            <span style="font-size: 13px; color: ${inCart ? '#FF4500' : '#888'}; font-weight: 700;">
              ${inCart ? `$${(dish.unitPrice * qty).toFixed(2)}` : 'Add Tray'}
            </span>

            <div class="food-card-stepper">
              <button type="button" class="stepper-btn" onclick="window.updateDishQuantity('${dish.id}', -1)" aria-label="Decrease quantity">-</button>
              <span class="stepper-qty" id="qty-${dish.id}">${qty}</span>
              <button type="button" class="stepper-btn" onclick="window.updateDishQuantity('${dish.id}', 1)" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  renderBanquetRail();
}

function renderPortionAssistant() {
  const assistantEl = document.getElementById('builder-portion-assistant');
  if (!assistantEl) return;

  const targetGuests = builderState.eventDetails.guests || 25;
  let totalYield = 0;
  Object.values(builderState.cartItems).forEach(it => {
    totalYield += ((it.servingYield || 20) * it.quantity);
  });

  const percentage = Math.min(150, Math.round((totalYield / targetGuests) * 100));
  let badgeColor = '#f59e0b';
  let statusText = `Feeds ~${totalYield} Servings (Target: ${targetGuests} Guests)`;

  if (totalYield >= targetGuests && totalYield <= targetGuests * 1.4) {
    badgeColor = '#10b981';
    statusText = `Balanced Afghan Feast (${totalYield} Servings for ${targetGuests} Guests)`;
  } else if (totalYield > targetGuests * 1.4) {
    badgeColor = '#3b82f6';
    statusText = `Generous Banquet (${totalYield} Servings for ${targetGuests} Guests)`;
  }

  assistantEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 14px;">
      <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(255,69,0,0.15); display: flex; align-items: center; justify-content: center; color: #FF4500;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div>
        <div style="font-size: 14px; font-weight: 700; color: #fff;">Afghan Feast Portion Advisor</div>
        <div style="font-size: 13px; color: ${badgeColor}; font-weight: 600;">${statusText}</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 140px; height: 8px; background: #222; border-radius: 99px; overflow: hidden;">
        <div style="width: ${percentage}%; height: 100%; background: ${badgeColor}; border-radius: 99px; transition: width 0.3s ease;"></div>
      </div>
      <span style="font-size: 12px; font-weight: 700; color: #aaa;">${percentage}%</span>
    </div>
  `;
}

function renderBanquetRail() {
  const railContainer = document.getElementById('builder-banquet-rail');
  if (!railContainer) return;

  const items = Object.values(builderState.cartItems).filter(i => i.quantity > 0);
  const prices = calculatePackagePrices();
  const guests = builderState.eventDetails.guests || 25;
  const perGuest = (prices.estimatedTotal / guests).toFixed(2);

  let itemsHtml = '';
  if (items.length === 0) {
    itemsHtml = '<div style="color: #666; font-size: 13px; text-align: center; padding: 20px 0;">No party trays selected yet.<br><span style="font-size: 11px; color: #555;">Use the cards to add dishes</span></div>';
  } else {
    itemsHtml = items.map(it => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #202020; font-size: 13px; gap: 8px;">
        <div style="flex: 1; padding-right: 4px;">
          <div style="font-weight: 700; color: #fff;">${it.quantity}x ${escapeHtml(it.nameEn)}</div>
          <div style="font-size: 11px; color: #888;">$${it.unitPrice.toFixed(2)} each</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="font-weight: 700; color: #FF4500;">$${(it.unitPrice * it.quantity).toFixed(2)}</div>
          <button type="button" onclick="window.removeDishFromCart('${it.id}')" title="Remove ${escapeHtml(it.nameEn)}" style="background: none; border: none; color: #888; cursor: pointer; padding: 4px; display: flex; align-items: center; transition: color 0.15s ease;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#888'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  railContainer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #FF4500;">
        LIVE BANQUET CART
      </span>
      ${items.length > 0 ? `<button type="button" onclick="window.clearBuilderCart()" style="background:none; border:none; color:#888; font-size:11px; text-decoration:underline; cursor:pointer;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#888'">Clear All</button>` : ''}
    </div>
    <div style="font-size: 13px; color: #888; margin-bottom: 16px;">
      ${guests} Guests • ${builderState.eventDetails.fulfillment.toUpperCase()}
    </div>

    <div style="max-height: 260px; overflow-y: auto; margin-bottom: 16px; padding-right: 4px;">
      ${itemsHtml}
    </div>

    <div style="border-top: 1px solid #282828; padding-top: 14px; margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #aaa; margin-bottom: 6px;">
        <span>Food Subtotal:</span>
        <strong style="color: #fff;">$${prices.foodSubtotal.toFixed(2)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 15px; color: #fff; font-weight: 800;">
        <span>Estimated Total:</span>
        <span style="color: #FF4500;">$${prices.estimatedTotal.toFixed(2)}</span>
      </div>
      <div style="font-size: 11px; color: #888; text-align: right; margin-top: 2px;">
        ~$${perGuest} per guest
      </div>
    </div>

    <button type="button" class="btn-primary" onclick="window.nextStep()" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 700; border-radius: 8px;">
      Continue to Amenities &rarr;
    </button>
  `;
}

export function filterFoodCategory(cat) {
  builderState.activeCategory = cat;
  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
  });
  renderStep3();
}
window.filterFoodCategory = filterFoodCategory;

export function updateDishQuantity(dishId, delta) {
  const catalogSource = (activeCateringCatalog && activeCateringCatalog.length > 0) ? activeCateringCatalog : DEFAULT_CATERING_CATALOG;
  const dish = catalogSource.find(d => d.id === dishId) || DEFAULT_CATERING_CATALOG.find(d => d.id === dishId);
  if (!dish) return;

  const currentQty = builderState.cartItems[dishId] ? builderState.cartItems[dishId].quantity : 0;
  const newQty = Math.max(0, currentQty + delta);

  if (newQty === 0) {
    delete builderState.cartItems[dishId];
  } else {
    builderState.cartItems[dishId] = {
      id: dish.id,
      nameEn: dish.nameEn,
      nameFa: dish.nameFa || '',
      category: dish.category,
      unitPrice: dish.unitPrice,
      portionSize: dish.portionSize,
      imageUrl: dish.imageUrl,
      servingYield: dish.servingYield,
      quantity: newQty
    };
  }

  // Update card UI
  const qtyEl = document.getElementById(`qty-${dishId}`);
  if (qtyEl) qtyEl.textContent = newQty;

  const card = document.getElementById(`dish-card-${dishId}`);
  if (card) {
    card.classList.toggle('in-cart', newQty > 0);
  }

  renderPortionAssistant();
  renderBanquetRail();
  updatePriceBreakdown();
}
window.updateDishQuantity = updateDishQuantity;

/**
 * Step 4: Optional Catering Services
 */
function renderStep4() {
  const container = document.getElementById('builder-services-list');
  if (!container) return;

  let html = '';
  OPTIONAL_CATERING_SERVICES.forEach(srv => {
    const isSelected = !!builderState.selectedServices[srv.id];
    let priceText = `$${srv.price.toFixed(2)}`;
    if (srv.priceUnit === 'per_guest') {
      const g = builderState.eventDetails.guests || 1;
      priceText = `$${(srv.price * g).toFixed(2)} ($${srv.price.toFixed(2)}/guest)`;
    } else if (srv.priceUnit === 'flat_set' || srv.priceUnit === 'flat_fee') {
      priceText = `$${srv.price.toFixed(2)} flat fee`;
    } else if (srv.priceUnit === 'event_shift') {
      priceText = `$${srv.price.toFixed(2)} per staff`;
    }

    html += `
      <div class="service-toggle-card ${isSelected ? 'active' : ''}" onclick="window.toggleServiceOption('${srv.id}')">
        <div style="flex: 1; padding-right: 16px;">
          <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 4px;">${escapeHtml(srv.name)}</div>
          <p style="font-size: 13px; color: #aaa; margin: 0; line-height: 1.4;">${escapeHtml(srv.description)}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="font-size: 15px; font-weight: 700; color: #FF4500; white-space: nowrap;">${priceText}</div>
          <div style="width: 22px; height: 22px; border-radius: 6px; border: 2px solid ${isSelected ? '#FF4500' : '#444'}; background: ${isSelected ? '#FF4500' : 'transparent'}; display: flex; align-items: center; justify-content: center; color: #fff;">
            ${isSelected ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

export function toggleServiceOption(serviceId) {
  if (builderState.selectedServices[serviceId]) {
    delete builderState.selectedServices[serviceId];
  } else {
    builderState.selectedServices[serviceId] = true;
  }
  renderStep4();
  updatePriceBreakdown();
}
window.toggleServiceOption = toggleServiceOption;

/**
 * Step 5: Review Package & Submit
 */
function renderStep5() {
  const summaryDishesContainer = document.getElementById('builder-review-dishes');
  const summaryDetailsContainer = document.getElementById('builder-review-event');

  if (summaryDetailsContainer) {
    const e = builderState.eventDetails;
    summaryDetailsContainer.innerHTML = `
      <div style="background: #141414; border: 1px solid #282828; border-radius: 12px; padding: 22px; margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div><span style="color: #888; font-size: 12px; text-transform: uppercase;">Event Type</span><br><strong style="color: #fff; font-size: 15px;">${escapeHtml(e.type)}</strong></div>
          <div><span style="color: #888; font-size: 12px; text-transform: uppercase;">Event Date & Time</span><br><strong style="color: #fff; font-size: 15px;">${escapeHtml(e.date)} at ${escapeHtml(e.time)}</strong></div>
          <div><span style="color: #888; font-size: 12px; text-transform: uppercase;">Guest Count</span><br><strong style="color: #FF4500; font-size: 15px;">${escapeHtml(String(e.guests))} Guests</strong></div>
          <div><span style="color: #888; font-size: 12px; text-transform: uppercase;">Fulfillment</span><br><strong style="color: #10b981; font-size: 15px;">${e.fulfillment === 'delivery' ? 'Delivery (Greater LA)' : 'Trailer Pickup (Reseda)'}</strong></div>
        </div>
        ${e.fulfillment === 'delivery' && e.deliveryAddress ? `<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #222;"><span style="color: #888; font-size: 12px;">Delivery Address:</span> <strong style="color: #fff;">${escapeHtml(e.deliveryAddress)}</strong></div>` : ''}
        ${e.specialInstructions ? `<div style="margin-top: 10px;"><span style="color: #888; font-size: 12px;">Special Requests:</span> <span style="color: #ddd;">${escapeHtml(e.specialInstructions)}</span></div>` : ''}
      </div>
    `;
  }

  if (summaryDishesContainer) {
    const items = Object.values(builderState.cartItems).filter(i => i.quantity > 0);
    if (items.length === 0) {
      summaryDishesContainer.innerHTML = `
        <div style="text-align: center; padding: 28px; color: #888; background: #141414; border-radius: 12px;">
          No party trays selected yet. <button type="button" onclick="window.goToStep(3)" style="color: #FF4500; background: none; border: none; cursor: pointer; text-decoration: underline; font-weight: bold;">Select dishes &rarr;</button>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">';
    items.forEach(it => {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #141414; border: 1px solid #282828; border-radius: 10px; padding: 14px 18px; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${it.imageUrl || '/logo.webp'}" alt="${escapeHtml(it.nameEn)}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; background: #111;">
            <div>
              <div style="font-size: 15px; font-weight: 700; color: #fff;">${it.quantity}x ${escapeHtml(it.nameEn)}</div>
              <div style="font-size: 12px; color: #888;">${escapeHtml(it.portionSize || 'Party Tray')} • $${it.unitPrice.toFixed(2)} each</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin-left: auto;">
            <div style="font-size: 16px; font-weight: 700; color: #FF4500;">
              $${(it.unitPrice * it.quantity).toFixed(2)}
            </div>
            <div class="food-card-stepper" style="padding: 2px;">
              <button type="button" class="stepper-btn" onclick="window.updateDishQuantity('${it.id}', -1)" aria-label="Decrease quantity">-</button>
              <span class="stepper-qty" style="min-width: 20px;">${it.quantity}</span>
              <button type="button" class="stepper-btn" onclick="window.updateDishQuantity('${it.id}', 1)" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" onclick="window.removeDishFromCart('${it.id}')" title="Delete ${escapeHtml(it.nameEn)}" style="background: none; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; color: #ef4444; padding: 5px 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
              Delete
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    summaryDishesContainer.innerHTML = html;
  }
}

/**
 * Authoritative Price Breakdown Calculator
 */
export function calculatePackagePrices() {
  let foodSubtotal = 0;
  Object.values(builderState.cartItems).forEach(it => {
    foodSubtotal += (it.unitPrice * it.quantity);
  });

  let servicesTotal = 0;
  Object.keys(builderState.selectedServices).forEach(sId => {
    const s = OPTIONAL_CATERING_SERVICES.find(srv => srv.id === sId);
    if (s) {
      if (s.priceUnit === 'per_guest') {
        servicesTotal += (s.price * (builderState.eventDetails.guests || 1));
      } else {
        servicesTotal += s.price;
      }
    }
  });

  const deliveryFee = (foodSubtotal > 0 && builderState.eventDetails.fulfillment === 'delivery') ? 50.00 : 0;
  const taxable = foodSubtotal + servicesTotal;
  const taxAmount = Math.round(taxable * 0.1025 * 100) / 100;
  const estimatedTotal = (foodSubtotal > 0 || servicesTotal > 0) ? (taxable + deliveryFee + taxAmount) : 0;

  return {
    foodSubtotal,
    servicesTotal,
    deliveryFee,
    taxAmount,
    estimatedTotal
  };
}

export function updatePriceBreakdown() {
  const prices = calculatePackagePrices();
  const itemsCount = Object.values(builderState.cartItems).reduce((sum, i) => sum + (i.quantity || 0), 0);

  // Desktop & Modal summaries
  const subEl = document.getElementById('calc-food-subtotal');
  const srvEl = document.getElementById('calc-services-total');
  const delEl = document.getElementById('calc-delivery-fee');
  const taxEl = document.getElementById('calc-tax-amount');
  const totEl = document.getElementById('calc-estimated-total');

  if (subEl) subEl.textContent = `$${prices.foodSubtotal.toFixed(2)}`;
  if (srvEl) srvEl.textContent = `$${prices.servicesTotal.toFixed(2)}`;
  if (delEl) delEl.textContent = prices.deliveryFee > 0 ? `$${prices.deliveryFee.toFixed(2)}` : 'Pickup ($0.00)';
  if (taxEl) taxEl.textContent = `$${prices.taxAmount.toFixed(2)}`;
  if (totEl) totEl.textContent = `$${prices.estimatedTotal.toFixed(2)}`;

  const footerTotEl = document.getElementById('builder-footer-total');
  if (footerTotEl) {
    if (itemsCount === 0 && (builderState.currentStep === 1 || builderState.currentStep === 2)) {
      footerTotEl.innerHTML = `$0.00 <span style="font-size: 11px; font-weight: normal; color: #888;">(Dishes chosen in Step 3)</span>`;
    } else {
      footerTotEl.innerHTML = `$${prices.estimatedTotal.toFixed(2)} ${itemsCount > 0 ? `<button type="button" onclick="window.clearBuilderCart()" style="background:none; border:none; color:#888; font-size:11px; text-decoration:underline; cursor:pointer; margin-left:6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#888'">Reset</button>` : ''}`;
    }
  }

  const desktopPreview = document.getElementById('builder-desktop-total-preview');
  if (desktopPreview) desktopPreview.style.display = 'block';

  // Mobile bottom sticky bar
  const mobileTotalEl = document.getElementById('builder-mobile-total-display');
  if (mobileTotalEl) {
    if (itemsCount === 0 && (builderState.currentStep === 1 || builderState.currentStep === 2)) {
      mobileTotalEl.textContent = '$0.00';
    } else {
      mobileTotalEl.textContent = `$${prices.estimatedTotal.toFixed(2)}`;
    }
  }
}

/**
 * Submit Package Request
 */
export async function submitCateringPackage(e) {
  if (e && e.preventDefault) e.preventDefault();

  const clientName = document.getElementById('builder-client-name')?.value.trim();
  const clientEmail = document.getElementById('builder-client-email')?.value.trim();
  const clientPhone = document.getElementById('builder-client-phone')?.value.trim();
  const contactMethod = document.getElementById('builder-client-contact-method')?.value || 'email';
  const notes = document.getElementById('builder-client-notes')?.value.trim();

  if (!clientName || !clientEmail || !clientPhone) {
    alert('Please complete your name, email, and phone number.');
    return;
  }

  const items = Object.values(builderState.cartItems).filter(i => i.quantity > 0);
  if (items.length === 0) {
    alert('Please select at least one party tray for your catering package.');
    goToStep(3);
    return;
  }

  const submitBtn = document.getElementById('builder-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting Package Request...';
  }

  const payload = {
    eventDetails: {
      ...builderState.eventDetails,
      specialInstructions: builderState.eventDetails.specialInstructions || notes
    },
    clientInfo: {
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      preferredContactMethod: contactMethod,
      notes: notes
    },
    items: items.map(it => ({
      catalogId: it.id,
      name: it.nameEn,
      portionSize: it.portionSize,
      quantity: it.quantity,
      unitPrice: it.unitPrice
    })),
    services: Object.keys(builderState.selectedServices).map(sId => {
      const s = OPTIONAL_CATERING_SERVICES.find(srv => srv.id === sId);
      return {
        serviceId: sId,
        name: s ? s.name : sId,
        price: s ? s.price : 0,
        priceUnit: s ? s.priceUnit : 'flat'
      };
    })
  };

  try {
    const functions = getFunctions(app, 'us-central1');
    const submitFn = httpsCallable(functions, 'submitCateringPackageRequest');
    const result = await submitFn(payload);

    showSuccessScreen(result.data.referenceNumber || 'BA-PKG-PENDING', result.data.estimatedTotal);
  } catch (err) {
    console.error('Error submitting catering package via Cloud Function:', err);
    // Direct Firestore fallback
    try {
      const ref = await addDoc(collection(db, 'catering_package_requests'), {
        ...payload,
        status: 'new',
        createdAt: serverTimestamp(),
        source: 'custom_package_builder_fallback'
      });
      showSuccessScreen(`BA-PKG-${ref.id.substring(0, 6).toUpperCase()}`, calculatePackagePrices().estimatedTotal);
    } catch (dbErr) {
      console.error('Firestore fallback failed:', dbErr);
      alert('We experienced a network error submitting your package. Please call us directly at (323) 921-1646.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Request Official Catering Proposal';
      }
    }
  }
}
window.submitCateringPackage = submitCateringPackage;

function showSuccessScreen(refNum, total) {
  const formBody = document.getElementById('builder-form-body');
  const footerActions = document.querySelector('.builder-footer-actions');
  const mobileBar = document.querySelector('.builder-mobile-sticky-bar');
  const stepsNav = document.querySelector('.builder-steps-nav');
  const successView = document.getElementById('builder-success-view');

  if (formBody) formBody.style.display = 'none';
  if (footerActions) footerActions.style.display = 'none';
  if (mobileBar) mobileBar.style.display = 'none';
  if (stepsNav) stepsNav.style.display = 'none';

  if (successView) {
    successView.style.display = 'block';
    const refEl = document.getElementById('success-pkg-ref');
    if (refEl) refEl.textContent = refNum;
    const totEl = document.getElementById('success-pkg-total');
    if (totEl) totEl.textContent = typeof total === 'number' ? `$${total.toFixed(2)}` : total;
  }
}
