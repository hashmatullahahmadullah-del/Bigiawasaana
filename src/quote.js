import { app } from './firebase.js';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app);


const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID;

let activeQuote = null;
let activeToken = null;
let squarePayments = null;
let squareCard = null;
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
    activeToken = data.quote.secureToken || token;

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
  if (guestsEl) guestsEl.textContent = `${quote.guestCount || 50} Guests`;

  const serviceMap = {
    drop_off: 'Hot Drop-Off & Buffet Setup',
    food_truck: 'Food Truck Onsite Catering',
    full_service: 'Full-Service Buffet with Attendants',
    pickup: 'Customer Pickup at Trailer (Reseda)'
  };
  const serviceEl = document.getElementById('portal-service-style');
  if (serviceEl) serviceEl.textContent = serviceMap[quote.serviceStyle] || 'Catering Delivery & Setup';

  const venueEl = document.getElementById('portal-venue-location');
  if (venueEl) venueEl.textContent = quote.venueAddress || '18411 Victory Blvd, Reseda, CA 91335';

  // Food Items List
  const itemsContainer = document.getElementById('portal-items-list');
  if (itemsContainer) {
    const items = quote.items || [];
    if (items.length === 0) {
      itemsContainer.innerHTML = '<div style="color: #888; font-size: 14px; padding: 12px 0;">Menu items to be finalized.</div>';
    } else {
      itemsContainer.innerHTML = items.map(item => `
        <div class="food-item-card">
          <img src="${item.img || '/halal-afghan-food-truck-los-angeles.webp'}" alt="${escapeHtml(item.name)}" class="food-item-img" onerror="this.src='/halal-afghan-food-truck-los-angeles.webp'">
          <div style="flex: 1;">
            <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 2px;">${escapeHtml(item.name)}</div>
            <div style="font-size: 13px; color: #ff4500; font-weight: 600;">${escapeHtml(item.portionSize || 'Party Tray')}</div>
            <div style="font-size: 12px; color: #888; margin-top: 4px;">Qty: ${item.quantity || 1} &bull; Unit Price: ${formatCurrency(item.unitPrice)}</div>
          </div>
          <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 800; color: #fff; white-space: nowrap;">
            ${formatCurrency((item.quantity || 1) * (item.unitPrice || 0))}
          </div>
        </div>
      `).join('');
    }
  }

  // Notes
  if (quote.notes) {
    const notesBox = document.getElementById('portal-notes-container');
    const notesText = document.getElementById('portal-notes-text');
    if (notesBox && notesText) {
      notesText.textContent = quote.notes;
      notesBox.style.display = 'block';
    }
  }

  // Financial Breakdown
  const subtotalEl = document.getElementById('portal-subtotal');
  if (subtotalEl) subtotalEl.textContent = formatCurrency(quote.subtotal || 0);

  const deliveryRow = document.getElementById('portal-delivery-row');
  const deliveryFeeEl = document.getElementById('portal-delivery-fee');
  if (deliveryRow && deliveryFeeEl) {
    if (quote.deliveryFee && quote.deliveryFee > 0) {
      deliveryFeeEl.textContent = formatCurrency(quote.deliveryFee);
      deliveryRow.style.display = 'flex';
    } else {
      deliveryRow.style.display = 'none';
    }
  }

  const discountRow = document.getElementById('portal-discount-row');
  const discountEl = document.getElementById('portal-discount');
  if (discountRow && discountEl) {
    if (quote.discount && quote.discount > 0) {
      discountEl.textContent = `-${formatCurrency(quote.discount)}`;
      discountRow.style.display = 'flex';
    } else {
      discountRow.style.display = 'none';
    }
  }

  const taxEl = document.getElementById('portal-tax');
  if (taxEl) taxEl.textContent = formatCurrency(quote.tax || 0);

  const grandTotalEl = document.getElementById('portal-grand-total');
  if (grandTotalEl) grandTotalEl.textContent = formatCurrency(quote.grandTotal || 0);

  const depositEl = document.getElementById('portal-deposit-amount');
  const depositLabelEl = document.getElementById('portal-deposit-label');
  if (depositEl) depositEl.textContent = formatCurrency(quote.depositDue || 0);
  if (depositLabelEl) depositLabelEl.textContent = `${quote.depositPercentage || 30}% Booking Deposit`;

  const balanceEl = document.getElementById('portal-balance-amount');
  if (balanceEl) balanceEl.textContent = formatCurrency(quote.balanceDue || 0);

  const payDepositVal = document.getElementById('pay-deposit-val');
  if (payDepositVal) payDepositVal.textContent = formatCurrency(quote.depositDue || 0);

  const payFullVal = document.getElementById('pay-full-val');
  if (payFullVal) payFullVal.textContent = formatCurrency(quote.grandTotal || 0);

  // Flow State Control (Acceptance vs Payment vs Receipt)
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
      initSquareElements();
    }
  } else {
    // draft, sent, viewed
    if (confirmedCard) confirmedCard.style.display = 'none';
    if (paymentCard) paymentCard.style.display = 'none';
    if (acceptanceCard) acceptanceCard.style.display = 'block';
  }
}

window.handlePortalAuthSubmit = function(e) {
  e.preventDefault();
  const quoteInput = document.getElementById('auth-quote-input')?.value?.trim();
  const contactInput = document.getElementById('auth-contact-input')?.value?.trim();
  if (!quoteInput || !contactInput) return;
  loadQuoteData(quoteInput, '', contactInput);
};

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
        initSquareElements();
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

window.selectPaymentOption = function(opt) {
  selectedPaymentType = opt;
  const pillDeposit = document.getElementById('pill-opt-deposit');
  const pillFull = document.getElementById('pill-opt-full');
  const radioDeposit = document.getElementById('radio-pay-deposit');
  const radioFull = document.getElementById('radio-pay-full');
  const payBtnText = document.getElementById('btn-pay-text');

  if (opt === 'deposit') {
    if (pillDeposit) pillDeposit.classList.add('active');
    if (pillFull) pillFull.classList.remove('active');
    if (radioDeposit) radioDeposit.checked = true;
    if (payBtnText && activeQuote) {
      payBtnText.textContent = `Pay ${activeQuote.depositPercentage || 30}% Deposit — ${formatCurrency(activeQuote.depositDue)}`;
    }
  } else {
    if (pillDeposit) pillDeposit.classList.remove('active');
    if (pillFull) pillFull.classList.add('active');
    if (radioFull) radioFull.checked = true;
    if (payBtnText && activeQuote) {
      payBtnText.textContent = `Pay Full Amount — ${formatCurrency(activeQuote.grandTotal)}`;
    }
  }
};

async function initSquareElements() {
  if (squareCard) return; // already initialized

  if (!window.Square) {
    console.warn('Square SDK not loaded yet.');
    return;
  }

  try {
    if (!squarePayments) {
      squarePayments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
    }
    squareCard = await squarePayments.card();
    await squareCard.attach('#card-container');
    console.log('Square Card attached for catering portal.');
  } catch (err) {
    console.error('Square attach error:', err);
    const errBox = document.getElementById('payment-error-msg');
    if (errBox) {
      errBox.textContent = 'Could not load payment card field: ' + err.message;
      errBox.style.display = 'block';
    }
  }
}

window.handlePaymentSubmit = async function() {
  const btn = document.getElementById('btn-submit-payment');
  const errBox = document.getElementById('payment-error-msg');
  if (errBox) errBox.style.display = 'none';

  if (!squareCard) {
    alert('Payment form is not ready yet. Please refresh the page.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span style="display: flex; align-items: center; gap: 8px;"><div style="width: 14px; height: 14px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>Processing Payment...</span>';
  }

  try {
    const tokenResult = await squareCard.tokenize();
    if (tokenResult.status !== 'OK') {
      const msg = tokenResult.errors?.[0]?.message || 'Please check your card details and try again.';
      throw new Error(msg);
    }

    const sourceId = tokenResult.token;
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
      activeQuote.paymentReceipt = res.data.paymentReceipt;
      renderQuoteUI(activeQuote);
    } else {
      throw new Error(res.data?.message || 'Payment processing declined.');
    }
  } catch (err) {
    console.error('Payment execution error:', err);
    if (errBox) {
      errBox.textContent = err.message || 'Payment could not be processed.';
      errBox.style.display = 'block';
    }
    if (btn) {
      btn.disabled = false;
      const amountVal = selectedPaymentType === 'deposit' ? (activeQuote?.depositDue || 0) : (activeQuote?.grandTotal || 0);
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span id="btn-pay-text">Pay ${selectedPaymentType === 'deposit' ? '30% Deposit' : 'Full Amount'} — ${formatCurrency(amountVal)}</span>`;
    }
  }
};

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
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
});
