/**
 * BIGI AWASAANA — Custom Catering Package Builder
 * Interactive Multi-Step Client Engine
 */

import { db, app } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DEFAULT_CATERING_CATALOG, DEFAULT_PACKAGE_TEMPLATES, OPTIONAL_CATERING_SERVICES } from './lib/catering-catalog-data.js';

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
  cartItems: {}, // { [dishId]: { id, name, portionSize, unitPrice, imageUrl, quantity, servingYield } }
  selectedServices: {}, // { [serviceId]: true }
  activeCategory: 'all'
};
window.builderState = builderState;
window.nextStep = () => goToStep(Math.min(5, (builderState.currentStep || 1) + 1));
window.prevStep = () => goToStep(Math.max(1, (builderState.currentStep || 1) - 1));

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

  // If cart is completely empty, start with 1 Qabuli Pulao and 1 Chapli Kabob
  if (Object.keys(builderState.cartItems).length === 0) {
    const defaultRice = DEFAULT_CATERING_CATALOG.find(d => d.id === 'qabuli-pulao-tray');
    const defaultKabob = DEFAULT_CATERING_CATALOG.find(d => d.id === 'chapli-kabob-tray');
    if (defaultRice) builderState.cartItems[defaultRice.id] = { ...defaultRice, quantity: 2 };
    if (defaultKabob) builderState.cartItems[defaultKabob.id] = { ...defaultKabob, quantity: 2 };
  }

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
 * Step 1: Event Details
 */
function renderStep1() {
  const typeSelect = document.getElementById('builder-event-type');
  const dateInput = document.getElementById('builder-event-date');
  const timeInput = document.getElementById('builder-event-time');
  const guestCustomInput = document.getElementById('builder-guests-custom');
  const fulfillmentSelect = document.getElementById('builder-fulfillment');
  const addressContainer = document.getElementById('builder-address-container');
  const addressInput = document.getElementById('builder-delivery-address');
  const instructionsInput = document.getElementById('builder-special-instructions');

  if (typeSelect) typeSelect.value = builderState.eventDetails.type;
  if (dateInput) dateInput.value = builderState.eventDetails.date;
  if (timeInput) timeInput.value = builderState.eventDetails.time;
  if (guestCustomInput) guestCustomInput.value = builderState.eventDetails.guests;
  if (fulfillmentSelect) fulfillmentSelect.value = builderState.eventDetails.fulfillment;
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
}

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

export function handleFulfillmentChange(val) {
  builderState.eventDetails.fulfillment = val;
  const addressContainer = document.getElementById('builder-address-container');
  if (addressContainer) {
    addressContainer.style.display = val === 'delivery' ? 'block' : 'none';
  }
  updatePriceBreakdown();
}
window.handleFulfillmentChange = handleFulfillmentChange;

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
          <img src="${tpl.imageUrl}" alt="${escapeHtml(tpl.titleEn)}" class="template-card-img" loading="lazy">
          <div style="padding: 16px; flex: 1; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0;">${escapeHtml(tpl.titleEn)}</h4>
              <span style="font-size: 11px; background: rgba(255,69,0,0.15); color: #ff6a00; padding: 2px 8px; border-radius: 99px; font-weight: 700;">Serves ~${tpl.recommendedGuests}</span>
            </div>
            <div style="font-size: 12px; color: #ff6a00; margin-bottom: 6px; direction: rtl; font-family: 'Vazirmatn', sans-serif;">${escapeHtml(tpl.titleFa || '')}</div>
            <p style="font-size: 13px; color: #999; margin: 0 0 12px; flex: 1; line-height: 1.4;">${escapeHtml(tpl.descriptionEn)}</p>
            <button type="button" class="btn-outline btn-sm" style="width: 100%; border-color: ${isSelected ? '#FF4500' : '#333'}; color: ${isSelected ? '#FF4500' : '#fff'}; font-weight: 700;">
              ${isSelected ? 'Selected Package' : 'Select Template'}
            </button>
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

export function selectPackageTemplate(templateId) {
  builderState.packageType = 'template';
  builderState.selectedTemplateId = templateId;

  const tpl = DEFAULT_PACKAGE_TEMPLATES.find(t => t.id === templateId);
  if (tpl) {
    // Clear and populate with template dishes
    builderState.cartItems = {};
    tpl.defaultItems.forEach(item => {
      const catalogItem = DEFAULT_CATERING_CATALOG.find(c => c.id === item.catalogId);
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
 * Step 3: Interactive Food Selection & Portion Helper
 */
function renderStep3() {
  renderPortionAssistant();

  const container = document.getElementById('builder-catalog-grid');
  if (!container) return;

  const filteredItems = builderState.activeCategory === 'all'
    ? DEFAULT_CATERING_CATALOG
    : DEFAULT_CATERING_CATALOG.filter(it => it.category === builderState.activeCategory);

  let html = '';
  filteredItems.forEach(dish => {
    const cartEntry = builderState.cartItems[dish.id];
    const qty = cartEntry ? cartEntry.quantity : 0;
    const inCart = qty > 0;

    html += `
      <div class="catalog-food-card ${inCart ? 'in-cart' : ''}" id="dish-card-${dish.id}">
        <div class="food-card-top">
          <img src="${dish.imageUrl}" alt="${escapeHtml(dish.nameEn)}" class="food-card-thumb" loading="lazy">
          <div style="flex: 1; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div>
                <h4 style="font-size: 15px; font-weight: 700; color: #fff; margin: 0 0 2px;">${escapeHtml(dish.nameEn)}</h4>
                <div style="font-size: 12px; color: #ff6a00; direction: rtl; font-family: 'Vazirmatn', sans-serif;">${escapeHtml(dish.nameFa || '')}</div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-size: 16px; font-weight: 700; color: #FF4500;">$${dish.unitPrice.toFixed(2)}</div>
                <div style="font-size: 11px; color: #888; text-transform: uppercase;">/${dish.pricingUnit}</div>
              </div>
            </div>

            <p style="font-size: 12px; color: #aaa; margin: 6px 0; line-height: 1.4; flex: 1;">${escapeHtml(dish.descriptionEn)}</p>

            <div style="font-size: 12px; color: #4caf50; font-weight: 600; margin-bottom: 10px;">
              ${escapeHtml(dish.portionSize)}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #222; padding-top: 10px;">
              <span style="font-size: 12px; color: ${inCart ? '#FF4500' : '#888'}; font-weight: 700;">
                ${inCart ? `Tray Total: $${(dish.unitPrice * qty).toFixed(2)}` : 'Add to package'}
              </span>

              <div class="food-card-stepper">
                <button type="button" class="stepper-btn" onclick="window.updateDishQuantity('${dish.id}', -1)" aria-label="Decrease quantity">-</button>
                <span class="stepper-qty" id="qty-${dish.id}">${qty}</span>
                <button type="button" class="stepper-btn" onclick="window.updateDishQuantity('${dish.id}', 1)" aria-label="Increase quantity">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
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
  const dish = DEFAULT_CATERING_CATALOG.find(d => d.id === dishId);
  if (!dish) return;

  const currentQty = builderState.cartItems[dishId] ? builderState.cartItems[dishId].quantity : 0;
  const newQty = Math.max(0, currentQty + delta);

  if (newQty === 0) {
    delete builderState.cartItems[dishId];
  } else {
    builderState.cartItems[dishId] = {
      ...dish,
      quantity: newQty
    };
  }

  // Update card UI
  const qtyEl = document.getElementById(`qty-${dishId}`);
  const cardEl = document.getElementById(`dish-card-${dishId}`);
  if (qtyEl) qtyEl.textContent = newQty;
  if (cardEl) cardEl.classList.toggle('in-cart', newQty > 0);

  renderPortionAssistant();
  updatePriceBreakdown();
}
window.updateDishQuantity = updateDishQuantity;

function renderPortionAssistant() {
  const bar = document.getElementById('builder-portion-assistant');
  if (!bar) return;

  const guests = builderState.eventDetails.guests || 50;

  // Recommendations:
  const recRice = Math.ceil(guests / 25);
  const recKabobs = Math.ceil(guests / 25);
  const recSides = Math.ceil(guests / 25);

  // Current calculated capacity
  let totalYield = 0;
  Object.values(builderState.cartItems).forEach(it => {
    if (it.category === 'rice_traditional' || it.category === 'kabobs_mains') {
      totalYield += (it.servingYield || 25) * it.quantity;
    }
  });

  const approxCapacity = Math.round(totalYield / 1.8); // Adjusted for multi-course meals

  bar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4500" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
      <div>
        <div style="font-size: 13px; font-weight: 700; color: #fff;">
          Serving Recommendation for ${guests} Guests
        </div>
        <div style="font-size: 12px; color: #bbb;">
          Suggested: <strong>${recRice}</strong> Rice Trays &bull; <strong>${recKabobs}</strong> Kabob Platters &bull; <strong>${recSides}</strong> Sides/Appetizers
        </div>
      </div>
    </div>
    <div style="text-align: right;">
      <span style="font-size: 12px; color: ${approxCapacity >= guests ? '#4caf50' : '#ff9800'}; font-weight: 700;">
        Current Package Serves: ~${approxCapacity} Guests
      </span>
    </div>
  `;
}

/**
 * Step 4: Optional Catering Services
 */
function renderStep4() {
  const container = document.getElementById('builder-services-list');
  if (!container) return;

  let html = '';
  OPTIONAL_CATERING_SERVICES.forEach(s => {
    const isChecked = !!builderState.selectedServices[s.id];
    let priceText = `$${s.price.toFixed(2)}`;
    if (s.priceUnit === 'per_guest') {
      priceText = `$${s.price.toFixed(2)} / guest ($${(s.price * (builderState.eventDetails.guests || 1)).toFixed(2)} total)`;
    }

    html += `
      <div class="service-toggle-card ${isChecked ? 'active' : ''}" onclick="window.toggleServiceOption('${s.id}')">
        <div style="display: flex; align-items: flex-start; gap: 14px;">
          <input type="checkbox" ${isChecked ? 'checked' : ''} style="margin-top: 4px; accent-color: #FF4500; width: 18px; height: 18px;" onclick="event.stopPropagation(); window.toggleServiceOption('${s.id}')">
          <div>
            <h4 style="font-size: 15px; font-weight: 700; color: #fff; margin: 0 0 4px;">${escapeHtml(s.name)}</h4>
            <p style="font-size: 13px; color: #999; margin: 0; line-height: 1.4;">${escapeHtml(s.description)}</p>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <div style="font-size: 15px; font-weight: 700; color: #FF4500;">${priceText}</div>
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
      <div style="background: #151515; border: 1px solid #252525; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          <div><span style="color: #888;">Event Type:</span> <strong style="color: #fff;">${escapeHtml(e.type)}</strong></div>
          <div><span style="color: #888;">Date:</span> <strong style="color: #fff;">${escapeHtml(e.date)} at ${escapeHtml(e.time)}</strong></div>
          <div><span style="color: #888;">Guests:</span> <strong style="color: #fff;">${escapeHtml(String(e.guests))} Guests</strong></div>
          <div><span style="color: #888;">Fulfillment:</span> <strong style="color: #FF4500;">${e.fulfillment.toUpperCase()}</strong></div>
        </div>
        ${e.fulfillment === 'delivery' && e.deliveryAddress ? `<div style="margin-top: 8px;"><span style="color: #888;">Delivery Address:</span> <strong style="color: #fff;">${escapeHtml(e.deliveryAddress)}</strong></div>` : ''}
        ${e.specialInstructions ? `<div style="margin-top: 8px;"><span style="color: #888;">Special Requests:</span> <span style="color: #ddd;">${escapeHtml(e.specialInstructions)}</span></div>` : ''}
      </div>
    `;
  }

  if (summaryDishesContainer) {
    const items = Object.values(builderState.cartItems);
    if (items.length === 0) {
      summaryDishesContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: #888; background: #151515; border-radius: 8px;">
          No party trays selected yet. <button type="button" onclick="window.goToStep(3)" style="color: #FF4500; background: none; border: none; cursor: pointer; text-decoration: underline; font-weight: bold;">Select dishes</button>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">';
    items.forEach(it => {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #151515; border: 1px solid #252525; border-radius: 8px; padding: 12px 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${it.imageUrl}" alt="${escapeHtml(it.nameEn)}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover; background: #111;">
            <div>
              <div style="font-size: 14px; font-weight: 700; color: #fff;">${it.quantity}x ${escapeHtml(it.nameEn)}</div>
              <div style="font-size: 12px; color: #888;">${escapeHtml(it.portionSize)}</div>
            </div>
          </div>
          <div style="font-size: 15px; font-weight: 700; color: #fff;">
            $${(it.unitPrice * it.quantity).toFixed(2)}
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

  const deliveryFee = builderState.eventDetails.fulfillment === 'delivery' ? 50.00 : 0;
  const taxable = foodSubtotal + servicesTotal;
  const taxAmount = Math.round(taxable * 0.1025 * 100) / 100;
  const estimatedTotal = taxable + deliveryFee + taxAmount;

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
  if (footerTotEl) footerTotEl.textContent = `$${prices.estimatedTotal.toFixed(2)}`;
  const desktopPreview = document.getElementById('builder-desktop-total-preview');
  if (desktopPreview) desktopPreview.style.display = 'block';

  // Mobile bottom sticky bar
  const mobileTotalEl = document.getElementById('builder-mobile-total-display');
  if (mobileTotalEl) {
    mobileTotalEl.textContent = `$${prices.estimatedTotal.toFixed(2)}`;
  }
}

/**
 * Submit Package Request to Firebase / Cloud Function
 */
export async function submitCateringPackage(event) {
  if (event) event.preventDefault();

  const nameInput = document.getElementById('builder-client-name');
  const emailInput = document.getElementById('builder-client-email');
  const phoneInput = document.getElementById('builder-client-phone');
  const contactMethodInput = document.getElementById('builder-client-contact-method');
  const notesInput = document.getElementById('builder-client-notes');
  const submitBtn = document.getElementById('builder-submit-btn');

  if (!nameInput || !emailInput || !phoneInput) return;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !email || !phone) {
    alert('Please complete your name, email, and phone number.');
    return;
  }

  const items = Object.values(builderState.cartItems);
  if (items.length === 0) {
    alert('Please select at least one party tray for your catering package.');
    goToStep(3);
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Package...';
  }

  const payload = {
    customerContact: {
      name,
      email,
      phone,
      preferredContact: contactMethodInput ? contactMethodInput.value : 'phone'
    },
    eventDetails: {
      ...builderState.eventDetails,
      specialInstructions: notesInput ? notesInput.value.trim() : builderState.eventDetails.specialInstructions
    },
    packageType: builderState.packageType,
    templateId: builderState.selectedTemplateId,
    items: items.map(it => ({
      id: it.id,
      name: it.nameEn,
      portionSize: it.portionSize,
      imageUrl: it.imageUrl,
      quantity: it.quantity,
      unitPrice: it.unitPrice
    })),
    services: Object.keys(builderState.selectedServices).map(sId => {
      const s = OPTIONAL_CATERING_SERVICES.find(srv => srv.id === sId);
      return { id: sId, name: s ? s.name : sId };
    })
  };

  try {
    const functions = getFunctions(app, 'us-central1');
    const submitFn = httpsCallable(functions, 'submitCateringPackageRequest');
    const result = await submitFn(payload);

    const refNumber = result.data?.requestNumber || 'BA-PKG-CONFIRMED';
    showSubmissionSuccess(refNumber, name, email);

  } catch (err) {
    console.error('Failed to submit via Cloud Function, falling back to direct Firestore:', err);
    try {
      // Direct Firestore fallback
      const prices = calculatePackagePrices();
      const requestNumber = 'BA-PKG-' + Math.random().toString(16).substring(2, 6).toUpperCase();
      await addDoc(collection(db, 'catering_package_requests'), {
        requestNumber,
        ...payload,
        estimatedPriceBreakdown: prices,
        status: 'new',
        linkedQuoteId: null,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      showSubmissionSuccess(requestNumber, name, email);
    } catch (dbErr) {
      console.error('Final submission error:', dbErr);
      alert('Could not submit catering package. Please check your network connection or call us at (323) 921-1646.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit My Catering Package';
      }
    }
  }
}
window.submitCateringPackage = submitCateringPackage;

function showSubmissionSuccess(refNumber, name, email) {
  const container = document.getElementById('builder-success-view');
  const body = document.getElementById('builder-form-body');
  const refEl = document.getElementById('success-ref-number');
  const nameEl = document.getElementById('success-client-name');
  const emailEl = document.getElementById('success-client-email');

  if (refEl) refEl.textContent = refNumber;
  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;

  if (body) body.style.display = 'none';
  if (container) container.style.display = 'block';

  // Clear cart
  builderState.cartItems = {};
  builderState.selectedServices = {};
}
