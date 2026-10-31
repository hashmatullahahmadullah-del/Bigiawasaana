import { app } from './firebase.js';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app);

const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID;

let activeQuote = null;
let activeToken = null;
let squarePayments = null;
let squareCard = null;
let googlePayInstance = null;
let applePayInstance = null;
let currentPaymentRequest = null;
let selectedPaymentType = 'deposit'; // 'deposit' or 'full'

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  try {
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
}

/**
 * Ensures Square Web Payments SDK is loaded before initializing
 */
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
    script.addEventListener('error', () => reject(new Error('Failed to load Square Payments SDK.')));
  });
}

/**
 * Load quote data from Cloud Function lookupCustomerQuote
 */
async function loadQuoteData(quoteNumber, token = '', contact = '') {
  const loadingEl = document.getElementById('portal-loading');
  const authCardEl = document.getElementById('portal-auth-card');
  const contentEl = document.getElementById('portal-content');
  const errorEl = document.getElementById('auth-error-banner');

  if (loadingEl) loadingEl.style.display = 'flex';
  if (authCardEl) authCardEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  try {
    const lookupFn = httpsCallable(functions, 'lookupCustomerQuote');
    const res = await lookupFn({
      quoteNumber: quoteNumber.trim(),
      token: token.trim(),
      contact: contact.trim()
    });

    const data = res.data;
    if (!data || !data.success || !data.quote) {
      throw new Error(data?.message || 'Could not find a catering proposal matching those details.');
    }

    activeQuote = data.quote;
    activeToken = data.quote.security?.directAccessToken || data.quote.secureToken || token;

    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    renderQuoteUI(activeQuote);
  } catch (err) {
    console.error('Quote lookup error:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (authCardEl) authCardEl.style.display = 'block';
    if (errorEl) {
      errorEl.textContent = err.message || 'Verification failed. Please check your Quote Number and contact info.';
      errorEl.style.display = 'block';
    }
  }
}

/**
 * Render the Catering Portal UI
 */
function renderQuoteUI(quote) {
  // Title & Badges
  const quoteNumEl = document.getElementById('portal-quote-number');
  if (quoteNumEl) quoteNumEl.textContent = quote.quoteNumber || 'BA-Q-PROPOSAL';

  const titleEl = document.getElementById('portal-client-title');
  if (titleEl) {
    titleEl.textContent = `Catering Proposal for ${quote.clientName || 'Valued Guest'}`;
  }

  const badgeEl = document.getElementById('portal-status-badge');
  if (badgeEl) {
    badgeEl.className = 'portal-badge';
    const status = quote.status || 'sent';
    if (status === 'draft') {
      badgeEl.classList.add('status-draft');
      badgeEl.textContent = 'Draft Proposal';
    } else if (status === 'sent') {
      badgeEl.classList.add('status-sent');
      badgeEl.textContent = 'Proposal Ready';
    } else if (status === 'viewed') {
      badgeEl.classList.add('status-viewed');
      badgeEl.textContent = 'Proposal Viewed';
    } else if (status === 'accepted') {
      badgeEl.classList.add('status-accepted');
      badgeEl.textContent = 'Accepted — Awaiting Deposit';
    } else if (status === 'deposit_paid') {
      badgeEl.classList.add('status-deposit-paid');
      badgeEl.textContent = 'Confirmed Booking (Deposit Paid)';
    } else if (status === 'paid_in_full') {
      badgeEl.classList.add('status-paid-full');
      badgeEl.textContent = 'Paid in Full';
    }
  }

  // Event Details
  const eventDateStr = formatDate(quote.eventDate);
  const eventTimeStr = formatTime(quote.eventTime);
  const dateTimeEl = document.getElementById('portal-event-datetime');
  if (dateTimeEl) dateTimeEl.textContent = `${eventDateStr}${eventTimeStr ? ' @ ' + eventTimeStr : ''}`;

  const guestsEl = document.getElementById('portal-guest-count');
  if (guestsEl) guestsEl.textContent = `${quote.guestCount || 50} Guests (${escapeHtml(quote.eventType || 'Special Event')})`;

  const fulfillEl = document.getElementById('portal-fulfillment-type');
  if (fulfillEl) {
    const isDelivery = quote.fulfillmentType === 'delivery';
    fulfillEl.textContent = isDelivery ? 'White-Glove Delivery & Setup' : 'Hot Pickup @ Reseda Kitchen';
  }

  const addressRow = document.getElementById('portal-address-row');
  const addressEl = document.getElementById('portal-delivery-address');
  if (addressRow && addressEl) {
    if (quote.fulfillmentType === 'delivery' && quote.deliveryAddress) {
      addressRow.style.display = 'flex';
      addressEl.textContent = quote.deliveryAddress;
    } else {
      addressRow.style.display = 'none';
    }
  }

  // Items / Menu Cards
  const itemsContainer = document.getElementById('portal-items-list');
  if (itemsContainer) {
    const dishes = quote.selectedDishes || [];
    if (dishes.length === 0) {
      itemsContainer.innerHTML = '<div style="color: #888; font-size: 14px; text-align: center; padding: 24px;">Custom catering package items will be listed here.</div>';
    } else {
      itemsContainer.innerHTML = dishes.map(dish => {
        const itemTotal = (dish.pricePerTray || dish.price || 0) * (dish.quantity || 1);
        const dietaryHtml = (dish.dietary || []).map(d => `<span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #ccc; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">${escapeHtml(d)}</span>`).join('');
        return `
          <div class="food-item-card">
            ${dish.image ? `<img src="${escapeHtml(dish.image)}" alt="${escapeHtml(dish.name)}" class="food-item-img" loading="lazy">` : `<div class="food-item-img" style="display: flex; align-items: center; justify-content: center; background: #1a1a1a; color: #555;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg></div>`}
            <div style="flex: 1; padding: 4px 0;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0 0 4px;">${escapeHtml(dish.name)}</h3>
                <span style="font-size: 15px; font-weight: 700; color: #fff; white-space: nowrap;">${formatCurrency(itemTotal)}</span>
              </div>
              <p style="font-size: 13px; color: #999; margin: 0 0 8px; line-height: 1.4;">${escapeHtml(dish.description || '')}</p>
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; color: #aaa;">
                <span style="font-weight: 600; color: var(--accent);">${dish.quantity || 1}× ${escapeHtml(dish.portionLabel || 'Large Party Tray')}</span>
                <span>&bull;</span>
                <span>Serves ~${(dish.servingsPerTray || 25) * (dish.quantity || 1)} guests</span>
                ${dietaryHtml ? `<span>&bull;</span>` + dietaryHtml : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Price Breakdown
  const p = quote.priceBreakdown || quote.pricing || {};
  const subtotal = p.subtotal || quote.subtotal || 0;
  const tax = p.tax || p.taxAmount || 0;
  const delivery = p.deliveryFee || 0;
  const setup = p.setupFee || 0;
  const discount = p.discount || p.discountAmount || 0;
  const grandTotal = p.grandTotal || p.total || quote.grandTotal || 0;
  const depositPct = quote.depositPercentage || p.depositPercentage || 30;
  const depositDue = p.depositDue || p.depositAmount || (grandTotal * (depositPct / 100));

  activeQuote.grandTotal = grandTotal;
  activeQuote.depositDue = depositDue;
  activeQuote.depositPercentage = depositPct;

  const subtotalEl = document.getElementById('portal-subtotal');
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);

  const discountRow = document.getElementById('portal-discount-row');
  const discountEl = document.getElementById('portal-discount');
  if (discountRow && discountEl) {
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountEl.textContent = `-${formatCurrency(discount)}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  const taxEl = document.getElementById('portal-tax');
  if (taxEl) taxEl.textContent = formatCurrency(tax);

  const deliveryRow = document.getElementById('portal-delivery-row');
  const deliveryEl = document.getElementById('portal-delivery');
  if (deliveryRow && deliveryEl) {
    if (delivery > 0) {
      deliveryRow.style.display = 'flex';
      deliveryEl.textContent = formatCurrency(delivery);
    } else {
      deliveryRow.style.display = 'none';
    }
  }

  const setupRow = document.getElementById('portal-setup-row');
  const setupEl = document.getElementById('portal-setup');
  if (setupRow && setupEl) {
    if (setup > 0) {
      setupRow.style.display = 'flex';
      setupEl.textContent = formatCurrency(setup);
    } else {
      setupRow.style.display = 'none';
    }
  }

  const grandTotalEl = document.getElementById('portal-grand-total');
  if (grandTotalEl) grandTotalEl.textContent = formatCurrency(grandTotal);

  const depositLabelEl = document.getElementById('portal-deposit-label');
  if (depositLabelEl) depositLabelEl.textContent = `${depositPct}% Deposit to Book Event`;

  const depositAmountEl = document.getElementById('portal-deposit-amount');
  if (depositAmountEl) depositAmountEl.textContent = formatCurrency(depositDue);

  const payDepositVal = document.getElementById('pay-deposit-val');
  if (payDepositVal) payDepositVal.textContent = formatCurrency(depositDue);

  const payDepositTitle = document.getElementById('label-pay-deposit-title');
  if (payDepositTitle) payDepositTitle.textContent = `Pay ${depositPct}% Booking Deposit`;

  const payFullVal = document.getElementById('pay-full-val');
  if (payFullVal) payFullVal.textContent = formatCurrency(grandTotal);

  const payBtnText = document.getElementById('btn-pay-text');
  if (payBtnText) {
    const isDeposit = selectedPaymentType === 'deposit';
    payBtnText.textContent = isDeposit ? `Pay ${depositPct}% Deposit — ${formatCurrency(depositDue)}` : `Pay Full Amount — ${formatCurrency(grandTotal)}`;
  }

  // Cards display based on status
  const acceptanceCard = document.getElementById('portal-acceptance-card');
  const paymentCard = document.getElementById('portal-payment-card');
  const confirmedCard = document.getElementById('portal-confirmed-card');

  if (quote.status === 'deposit_paid' || quote.status === 'paid_in_full') {
    if (acceptanceCard) acceptanceCard.style.display = 'none';
    if (paymentCard) paymentCard.style.display = 'none';
    if (confirmedCard) {
      confirmedCard.style.display = 'block';
      const txEl = document.getElementById('receipt-tx-id');
      const paidEl = document.getElementById('receipt-paid-amount');
      const balEl = document.getElementById('receipt-balance-amount');
      if (txEl) txEl.textContent = quote.paymentReceipt?.paymentId || quote.quoteNumber;
      if (paidEl) paidEl.textContent = formatCurrency(quote.depositPaid || quote.depositDue);
      if (balEl) balEl.textContent = formatCurrency(quote.balanceDue || 0);
    }
  } else if (quote.status === 'accepted') {
    if (acceptanceCard) acceptanceCard.style.display = 'none';
    if (confirmedCard) confirmedCard.style.display = 'none';
    if (paymentCard) {
      paymentCard.style.display = 'block';
      initSquarePayments();
    }
  } else {
    // draft, sent, viewed
    if (confirmedCard) confirmedCard.style.display = 'none';
    if (acceptanceCard) acceptanceCard.style.display = 'block';
    if (paymentCard) paymentCard.style.display = 'none';
  }
}

/**
 * Switch payment amount between 30% Deposit and Full Balance
 */
window.selectPaymentOption = function(opt) {
  selectedPaymentType = opt;
  const pillDeposit = document.getElementById('pill-opt-deposit');
  const pillFull = document.getElementById('pill-opt-full');
  const radioDeposit = document.getElementById('radio-pay-deposit');
  const radioFull = document.getElementById('radio-pay-full');
  const payBtnText = document.getElementById('btn-pay-text');

  const isDeposit = opt === 'deposit';
  const amountVal = isDeposit ? (activeQuote?.depositDue || 0) : (activeQuote?.grandTotal || 0);
  const totalAmountStr = Number(amountVal).toFixed(2);
  const depositPct = activeQuote?.depositPercentage || 30;

  if (isDeposit) {
    if (pillDeposit) pillDeposit.classList.add('active');
    if (pillFull) pillFull.classList.remove('active');
    if (radioDeposit) radioDeposit.checked = true;
    if (payBtnText && activeQuote) {
      payBtnText.textContent = `Pay ${depositPct}% Deposit — ${formatCurrency(amountVal)}`;
    }
  } else {
    if (pillDeposit) pillDeposit.classList.remove('active');
    if (pillFull) pillFull.classList.add('active');
    if (radioFull) radioFull.checked = true;
    if (payBtnText && activeQuote) {
      payBtnText.textContent = `Pay Full Amount — ${formatCurrency(amountVal)}`;
    }
  }

  // Update digital wallet payment request total dynamically
  if (currentPaymentRequest && typeof currentPaymentRequest.update === 'function') {
    try {
      currentPaymentRequest.update({
        total: {
          amount: totalAmountStr,
          label: isDeposit ? `Bigi Awasaana Catering (${depositPct}% Deposit)` : `Bigi Awasaana Catering (Full Balance)`
        }
      });
    } catch (e) {
      console.warn('Could not update payment request:', e);
    }
  }
};

/**
 * Initialize Square Card and Digital Wallets (Apple Pay & Google Pay)
 */
async function initSquarePayments() {
  try {
    const Square = await ensureSquareLoaded();
    if (!Square) return;

    if (!squarePayments) {
      squarePayments = Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
    }

    // 1. Initialize Square Card Form
    if (!squareCard) {
      try {
        squareCard = await squarePayments.card();
        await squareCard.attach('#card-container');
        console.log('Square Card attached for catering portal.');
      } catch (err) {
        console.error('Square Card attach error:', err);
        showPaymentError('Could not load card form: ' + err.message);
      }
    }

    // 2. Initialize Digital Wallets (Apple Pay & Google Pay)
    await initDigitalWallets();
  } catch (err) {
    console.error('Failed to initialize Square Web Payments:', err);
    showPaymentError('Payment system could not load: ' + err.message);
  }
}

/**
 * Initialize Express Digital Wallets (Apple Pay & Google Pay)
 */
async function initDigitalWallets() {
  if (!squarePayments || !activeQuote) return;

  const isDeposit = selectedPaymentType === 'deposit';
  const amountVal = isDeposit ? (activeQuote.depositDue || 0) : (activeQuote.grandTotal || 0);
  const totalAmountStr = Number(amountVal).toFixed(2);
  const depositPct = activeQuote.depositPercentage || 30;
  const labelStr = isDeposit ? `Bigi Awasaana Catering (${depositPct}% Deposit)` : `Bigi Awasaana Catering (Full Balance)`;

  // Clean previous wallet instances
  if (googlePayInstance) {
    try { await googlePayInstance.destroy(); } catch (e) {}
    googlePayInstance = null;
  }
  applePayInstance = null;
  currentPaymentRequest = null;

  const gpEl = document.getElementById('google-pay-button');
  const apEl = document.getElementById('apple-pay-button');
  const dividerEl = document.getElementById('wallets-or-divider');
  if (gpEl) { gpEl.innerHTML = ''; gpEl.style.display = 'none'; }
  if (apEl) { apEl.style.display = 'none'; }
  if (dividerEl) { dividerEl.style.display = 'none'; }

  let hasWallet = false;

  try {
    const req = squarePayments.paymentRequest({
      countryCode: 'US',
      currencyCode: 'USD',
      total: {
        amount: totalAmountStr,
        label: labelStr
      }
    });
    currentPaymentRequest = req;

    // ── Apple Pay (Native Web Payments SDK) ──
    try {
      const applePay = await squarePayments.applePay(req);
      applePayInstance = applePay;
      if (apEl) {
        apEl.style.display = 'block';
        hasWallet = true;

        apEl.onclick = async (e) => {
          e.preventDefault();
          try {
            showPaymentProcessing(true);
            const tokenResult = await applePay.tokenize();
            if (tokenResult.status === 'OK') {
              await executeDepositPayment(tokenResult.token);
            } else {
              showPaymentProcessing(false);
              const msg = tokenResult.errors?.[0]?.message || 'Apple Pay authorization was cancelled or failed.';
              showPaymentError(msg);
            }
          } catch (apErr) {
            showPaymentProcessing(false);
            console.error('Apple Pay error:', apErr);
            showPaymentError(apErr.message || 'Apple Pay payment failed.');
          }
        };
      }
    } catch (apErr) {
      console.log('Apple Pay not supported on this device/browser:', apErr.message || apErr);
    }

    // ── Google Pay (Square Web Payments SDK) ──
    try {
      const googlePay = await squarePayments.googlePay(req);
      googlePayInstance = googlePay;
      if (gpEl) {
        gpEl.innerHTML = '';
        await googlePay.attach('#google-pay-button', {
          buttonColor: 'default',
          buttonType: 'long',
          buttonSizeMode: 'fill',
          buttonRadius: 6
        });
        gpEl.style.display = 'block';
        hasWallet = true;

        gpEl.onclick = async (e) => {
          e.preventDefault();
          try {
            showPaymentProcessing(true);
            const tokenResult = await googlePay.tokenize();
            if (tokenResult.status === 'OK') {
              await executeDepositPayment(tokenResult.token);
            } else {
              showPaymentProcessing(false);
              const msg = tokenResult.errors?.[0]?.message || 'Google Pay authorization was cancelled or failed.';
              showPaymentError(msg);
            }
          } catch (gpErr) {
            showPaymentProcessing(false);
            console.error('Google Pay error:', gpErr);
            showPaymentError(gpErr.message || 'Google Pay payment failed.');
          }
        };
      }
    } catch (gpErr) {
      console.log('Google Pay not supported or unavailable:', gpErr.message || gpErr);
    }

    if (dividerEl && hasWallet) {
      dividerEl.style.display = 'flex';
    }
  } catch (err) {
    console.warn('Digital wallets init error:', err);
  }
}

function showPaymentError(msg) {
  const errBox = document.getElementById('payment-error-msg');
  if (errBox) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }
}

function showPaymentProcessing(show) {
  const btn = document.getElementById('btn-submit-payment');
  const cardContainer = document.getElementById('card-container');
  const walletsContainer = document.getElementById('digital-wallets');
  const processingEl = document.getElementById('portal-payment-processing');
  const errBox = document.getElementById('payment-error-msg');

  if (show && errBox) errBox.style.display = 'none';

  if (btn) btn.style.display = show ? 'none' : 'flex';
  if (cardContainer) cardContainer.style.display = show ? 'none' : 'block';
  if (walletsContainer) walletsContainer.style.display = show ? 'none' : 'block';
  if (processingEl) processingEl.style.display = show ? 'block' : 'none';
}

/**
 * Handle Card Payment Submission
 */
window.handlePaymentSubmit = async function() {
  const errBox = document.getElementById('payment-error-msg');
  if (errBox) errBox.style.display = 'none';

  if (!squareCard) {
    alert('Payment form is not ready yet. Please refresh the page.');
    return;
  }

  showPaymentProcessing(true);

  try {
    const tokenResult = await squareCard.tokenize();
    if (tokenResult.status !== 'OK') {
      const msg = tokenResult.errors?.[0]?.message || 'Please check your card details and try again.';
      throw new Error(msg);
    }

    await executeDepositPayment(tokenResult.token);
  } catch (err) {
    console.error('Payment execution error:', err);
    showPaymentProcessing(false);
    showPaymentError(err.message || 'Payment could not be processed.');
  }
};

/**
 * Shared execution function for Card, Google Pay, and Apple Pay tokens
 */
async function executeDepositPayment(sourceId) {
  const isDeposit = selectedPaymentType === 'deposit';
  const amountVal = isDeposit ? (activeQuote.depositDue || 0) : (activeQuote.grandTotal || 0);
  const amountCents = Math.round(amountVal * 100);

  const payFn = httpsCallable(functions, 'payCateringDeposit');
  const res = await payFn({
    quoteNumber: activeQuote.quoteNumber,
    token: activeToken,
    sourceId: sourceId,
    paymentType: isDeposit ? 'deposit' : 'full_payment',
    amountCents: amountCents
  });

  if (res.data && res.data.success) {
    activeQuote.status = isDeposit ? 'deposit_paid' : 'paid_in_full';
    activeQuote.depositPaid = amountVal;
    activeQuote.balanceDue = isDeposit ? (activeQuote.grandTotal - amountVal) : 0;
    activeQuote.paymentReceipt = res.data.paymentReceipt;
    showPaymentProcessing(false);
    renderQuoteUI(activeQuote);
  } else {
    showPaymentProcessing(false);
    throw new Error(res.data?.message || 'Payment processing was declined by Square.');
  }
}

/**
 * Manual Portal Auth Form Submit
 */
window.handlePortalAuthSubmit = function(e) {
  e.preventDefault();
  const quoteInput = document.getElementById('auth-quote-input')?.value?.trim();
  const contactInput = document.getElementById('auth-contact-input')?.value?.trim();
  if (!quoteInput || !contactInput) return;
  loadQuoteData(quoteInput, '', contactInput);
};

/**
 * Digital Proposal Acceptance Form Submit
 */
window.handleProposalAccept = async function(e) {
  e.preventDefault();
  const signerName = document.getElementById('signer-name-input')?.value?.trim();
  const acceptedCheckbox = document.getElementById('accept-terms-checkbox')?.checked;
  const btn = document.getElementById('btn-accept-proposal');

  if (!signerName || !acceptedCheckbox) {
    alert('Please sign with your full name and check the acceptance box.');
    return;
  }

  if (!activeQuote) return;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Recording Acceptance...</span>';
  }

  try {
    const acceptFn = httpsCallable(functions, 'acceptCateringQuote');
    const res = await acceptFn({
      quoteNumber: activeQuote.quoteNumber,
      token: activeToken,
      signerName: signerName,
      customerEmail: activeQuote.clientEmail || ''
    });

    if (res.data && res.data.success) {
      activeQuote.status = 'accepted';
      const acceptanceCard = document.getElementById('portal-acceptance-card');
      const paymentCard = document.getElementById('portal-payment-card');
      if (acceptanceCard) acceptanceCard.style.display = 'none';
      if (paymentCard) {
        paymentCard.style.display = 'block';
        initSquarePayments();
        paymentCard.scrollIntoView({ behavior: 'smooth' });
      }
      renderQuoteUI(activeQuote);
    } else {
      throw new Error(res.data?.message || 'Failed to record acceptance.');
    }
  } catch (err) {
    console.error('Accept error:', err);
    alert('Error accepting proposal: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Accept &amp; Proceed to Payment</span>';
    }
  }
};

/**
 * Safe Portal Initialization on Page Load
 */
function initQuotePortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const qNum = urlParams.get('q') || urlParams.get('quote') || urlParams.get('id');
  const token = urlParams.get('token') || urlParams.get('t');

  if (qNum && token) {
    loadQuoteData(qNum, token);
  } else if (qNum) {
    const loadingEl = document.getElementById('portal-loading');
    const authCardEl = document.getElementById('portal-auth-card');
    const authQuoteInput = document.getElementById('auth-quote-input');
    if (loadingEl) loadingEl.style.display = 'none';
    if (authCardEl) authCardEl.style.display = 'block';
    if (authQuoteInput) authQuoteInput.value = qNum;
  } else {
    const loadingEl = document.getElementById('portal-loading');
    const authCardEl = document.getElementById('portal-auth-card');
    if (loadingEl) loadingEl.style.display = 'none';
    if (authCardEl) authCardEl.style.display = 'block';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuotePortal);
} else {
  initQuotePortal();
}
