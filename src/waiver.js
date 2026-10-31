import { app } from './firebase.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './lib/button-utils.js';

const functions = getFunctions(app);

const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID;

let activeAgreement = null;
let activeToken = null;
let activeAgreementNumber = null;
let selectedPaymentMethod = 'card'; // 'card' or 'cash'

// Square SDK instances
let squarePayments = null;
let squareCard = null;
let googlePayInstance = null;
let applePayInstance = null;

// Signature canvas state
let canvas = null;
let ctx = null;
let isDrawing = false;
let hasSignature = false;
let lastX = 0;
let lastY = 0;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amt) {
  const num = typeof amt === 'number' ? amt : parseFloat(amt) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  try {
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }
    return dateStr;
  } catch (e) {
    return dateStr;
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
 * Initialize HTML5 Canvas Signature Pad
 */
function initSignaturePad() {
  canvas = document.getElementById('sig-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // Resize canvas to its display size taking devicePixelRatio into account
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFFFFF';
  }

  resizeCanvas();
  window.addEventListener('resize', () => {
    if (!hasSignature) resizeCanvas();
  });

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    document.getElementById('sig-watermark').style.display = 'none';
    document.getElementById('sig-pad-box').classList.add('active');
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
    hasSignature = true;
    document.getElementById('sig-status').textContent = 'Signature Drawn ✓';
    document.getElementById('sig-status').style.color = '#4ade80';
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      isDrawing = false;
    }
  };

  // Pointer & Touch Events
  canvas.addEventListener('pointerdown', startDrawing);
  canvas.addEventListener('pointermove', draw);
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing, { passive: false });

  // Clear button
  document.getElementById('btn-clear-sig')?.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasSignature = false;
    document.getElementById('sig-watermark').style.display = 'block';
    document.getElementById('sig-status').textContent = 'Signature Required';
    document.getElementById('sig-status').style.color = 'var(--text-dim)';
    document.getElementById('sig-pad-box').classList.remove('active');
  });
}

/**
 * Setup Allergy Checkbox Interactions
 */
function initAllergyCheckboxes() {
  const noneCheck = document.getElementById('allergy-none');
  const otherChecks = document.querySelectorAll('input[name="allergy"]');

  if (noneCheck) {
    noneCheck.addEventListener('change', () => {
      if (noneCheck.checked) {
        noneCheck.closest('.allergy-pill').classList.add('selected');
        otherChecks.forEach(cb => {
          cb.checked = false;
          cb.closest('.allergy-pill').classList.remove('selected');
        });
      } else {
        noneCheck.closest('.allergy-pill').classList.remove('selected');
      }
    });
  }

  otherChecks.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        cb.closest('.allergy-pill').classList.add('selected');
        if (noneCheck) {
          noneCheck.checked = false;
          noneCheck.closest('.allergy-pill').classList.remove('selected');
        }
      } else {
        cb.closest('.allergy-pill').classList.remove('selected');
      }
    });
  });
}

/**
 * Load Agreement Data from Cloud Function lookupCateringWaiver
 */
async function loadAgreementData(agreementNumber, token = '', phone = '') {
  const loadingEl = document.getElementById('waiver-loading');
  const lookupEl = document.getElementById('waiver-lookup');
  const contentEl = document.getElementById('waiver-content');
  const receiptEl = document.getElementById('waiver-confirmed-receipt');

  if (loadingEl) loadingEl.style.display = 'block';
  if (lookupEl) lookupEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'none';
  if (receiptEl) receiptEl.style.display = 'none';

  try {
    const lookupFn = httpsCallable(functions, 'lookupCateringWaiver');
    const res = await lookupFn({
      agreementNumber: agreementNumber.trim(),
      token: token.trim(),
      phone: phone.trim()
    });

    activeAgreement = res.data;
    activeAgreementNumber = activeAgreement.agreementNumber;
    activeToken = token.trim();

    if (loadingEl) loadingEl.style.display = 'none';

    // If agreement already signed & paid or cash pending
    if (['signed_cash_pending', 'deposit_paid', 'paid_in_full'].includes(activeAgreement.status)) {
      renderConfirmedReceipt(activeAgreement);
      return;
    }

    renderWaiverForm(activeAgreement);
  } catch (err) {
    console.error('Error looking up catering waiver:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (lookupEl) {
      lookupEl.style.display = 'block';
      const errEl = document.getElementById('manual-lookup-err');
      if (errEl) {
        errEl.textContent = err.message || 'Agreement proposal not found. Please verify the Agreement # and phone number.';
        errEl.style.display = 'block';
      }
    }
  }
}

/**
 * Render Active Waiver Form
 */
function renderWaiverForm(ag) {
  const contentEl = document.getElementById('waiver-content');
  if (!contentEl) return;
  contentEl.style.display = 'block';

  // Agreement Header
  document.getElementById('view-agreement-num').textContent = ag.agreementNumber;
  const statusEl = document.getElementById('view-status-badge');
  if (statusEl) {
    statusEl.textContent = (ag.status || 'Awaiting Signature').replace(/_/g, ' ');
  }

  // Pricing
  const total = ag.pricing?.estimatedTotal || 0;
  const deposit = ag.pricing?.depositRequired || (total * 0.3);
  const balance = ag.pricing?.balanceDue || (total - deposit);
  const delFee = ag.pricing?.deliveryFee !== undefined ? ag.pricing.deliveryFee : ag.event?.deliveryFee;

  document.getElementById('view-estimated-total').textContent = formatCurrency(total);
  document.getElementById('view-deposit-required').textContent = formatCurrency(deposit);
  document.getElementById('view-balance-due').textContent = formatCurrency(balance);
  document.getElementById('btn-card-amt').textContent = formatCurrency(deposit);
  document.getElementById('cash-amt-display').textContent = formatCurrency(deposit);

  const subEl = document.getElementById('view-pricing-subbreakdown');
  if (subEl) {
    if (ag.event?.fulfillment === 'delivery') {
      const feeNum = Number(delFee) || 0;
      const foodSub = ag.pricing?.foodSubtotal !== undefined ? ag.pricing.foodSubtotal : Math.max(0, total - feeNum);
      subEl.textContent = `Food: $${foodSub.toFixed(2)} • Delivery: $${feeNum.toFixed(2)}`;
    } else {
      subEl.textContent = 'Food Subtotal (Trailer Pickup: Free)';
    }
  }

  // Event info
  const dateStr = formatDate(ag.event?.date);
  const timeStr = ag.event?.time || '05:00 PM';
  document.getElementById('view-event-datetime').textContent = `${dateStr} at ${timeStr}`;
  if (ag.event?.fulfillment === 'delivery') {
    const feeNum = Number(delFee) || 0;
    document.getElementById('view-fulfillment').textContent = feeNum > 0 ? `White-Glove Delivery ($${feeNum.toFixed(2)})` : 'White-Glove Delivery';
  } else {
    document.getElementById('view-fulfillment').textContent = 'Trailer Pickup (Free)';
  }
  document.getElementById('view-guest-count').textContent = `${ag.event?.guestCount || 20} Guests`;

  // Menu breakdown
  let menuHtml = ag.event?.menuSummary || '';
  if (ag.event?.dishes && ag.event.dishes.length > 0) {
    const listHtml = ag.event.dishes.map(d => `• ${d.quantity || 1}x ${d.name} (${d.portion || 'Party Tray'}) — $${(Number(d.unitPrice || 0) * (d.quantity || 1)).toFixed(2)}`).join('\n');
    menuHtml = (menuHtml ? menuHtml + '\n\n' : '') + listHtml;
  }
  document.getElementById('view-menu-summary').textContent = menuHtml || 'Agreed Custom Catering Feast';

  // Customer Prefills
  if (ag.client?.name) {
    document.getElementById('cust-full-name').value = ag.client.name;
    document.getElementById('sig-typed-name').value = ag.client.name;
  }
  if (ag.client?.phone) {
    document.getElementById('cust-phone').value = ag.client.phone;
  }
  if (ag.client?.email) {
    document.getElementById('cust-email').value = ag.client.email;
  }
  if (ag.client?.confirmedAddress || ag.event?.deliveryAddress) {
    document.getElementById('cust-address').value = ag.client.confirmedAddress || ag.event.deliveryAddress;
  }

  // Init canvas and Square
  initSignaturePad();
  initSquarePayments(deposit);
}

/**
 * Initialize Square Web Payments SDK for 30% Downpayment
 */
async function initSquarePayments(depositAmount) {
  if (!SQUARE_APP_ID || !SQUARE_LOCATION_ID) {
    console.warn('Square credentials not set.');
    return;
  }

  try {
    const Square = await ensureSquareLoaded();
    squarePayments = Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);

    // Initialize Card Element
    const cardContainer = document.getElementById('card-container');
    if (cardContainer && !squareCard) {
      cardContainer.innerHTML = '';
      squareCard = await squarePayments.card({
        style: {
          '.input-container': {
            borderColor: '#27272a',
            borderRadius: '6px'
          },
          '.input-container.is-focus': {
            borderColor: '#FF4500'
          },
          input: {
            color: '#FFFFFF',
            backgroundColor: '#09090b',
            fontFamily: 'Outfit, sans-serif'
          },
          'input::placeholder': {
            color: '#71717A'
          }
        }
      });
      await squareCard.attach('#card-container');
    }

    // Google Pay
    try {
      const gpayBtn = document.getElementById('google-pay-button');
      if (gpayBtn && !googlePayInstance) {
        const paymentRequest = squarePayments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: {
            amount: depositAmount.toFixed(2),
            label: 'Bigi Awasaana 30% Deposit'
          }
        });
        googlePayInstance = await squarePayments.googlePay(paymentRequest);
        await googlePayInstance.attach('#google-pay-button');
        gpayBtn.style.display = 'block';

        googlePayInstance.addEventListener('payment_method_selected', async () => {
          handleWaiverSubmission('google_pay');
        });
      }
    } catch (gErr) {
      console.warn('Google Pay not available:', gErr.message);
    }

    // Apple Pay
    try {
      const appleBtn = document.getElementById('apple-pay-button');
      if (appleBtn && !applePayInstance) {
        const paymentRequest = squarePayments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: {
            amount: depositAmount.toFixed(2),
            label: 'Bigi Awasaana 30% Deposit'
          }
        });
        applePayInstance = await squarePayments.applePay(paymentRequest);
        await applePayInstance.attach('#apple-pay-button');
        appleBtn.style.display = 'block';

        applePayInstance.addEventListener('payment_method_selected', async () => {
          handleWaiverSubmission('apple_pay');
        });
      }
    } catch (aErr) {
      console.warn('Apple Pay not available:', aErr.message);
    }
  } catch (err) {
    console.error('Error initializing Square Payments in waiver:', err);
  }
}

/**
 * Handle Payment Tab Switching
 */
function initPaymentTabs() {
  const cardTab = document.getElementById('tab-btn-card');
  const cashTab = document.getElementById('tab-btn-cash');
  const cardContainer = document.getElementById('path-card-container');
  const cashContainer = document.getElementById('path-cash-container');

  if (cardTab && cashTab) {
    cardTab.addEventListener('click', () => {
      selectedPaymentMethod = 'card';
      cardTab.classList.add('active');
      cashTab.classList.remove('active');
      cardContainer.style.display = 'block';
      cashContainer.style.display = 'none';
    });

    cashTab.addEventListener('click', () => {
      selectedPaymentMethod = 'cash';
      cashTab.classList.add('active');
      cardTab.classList.remove('active');
      cardContainer.style.display = 'none';
      cashContainer.style.display = 'block';
    });
  }
}

/**
 * Form Validation Helper
 */
function validateWaiverForm() {
  const name = document.getElementById('cust-full-name')?.value.trim();
  const phone = document.getElementById('cust-phone')?.value.trim();
  const email = document.getElementById('cust-email')?.value.trim();
  const address = document.getElementById('cust-address')?.value.trim();
  const termsAgreed = document.getElementById('waiver-terms-checkbox')?.checked;
  const typedName = document.getElementById('sig-typed-name')?.value.trim();

  if (!name) return { valid: false, message: 'Please enter your Full Legal Name.' };
  if (!phone) return { valid: false, message: 'Please enter your Direct Phone Number.' };
  if (!email || !email.includes('@')) return { valid: false, message: 'Please enter a valid Email Address for your receipt.' };
  if (!termsAgreed) return { valid: false, message: 'You must check the box agreeing to the catering terms and $199 cancellation penalty.' };
  if (!hasSignature) return { valid: false, message: 'Please draw your digital signature on the pad.' };
  if (!typedName) return { valid: false, message: 'Please type your legal name to verify your signature.' };

  // Collect allergies
  const allergies = [];
  document.querySelectorAll('input[name="allergy"]:checked').forEach(cb => allergies.push(cb.value));
  const customAllergy = document.getElementById('cust-allergy-notes')?.value.trim();
  if (customAllergy) allergies.push(customAllergy);
  const allergyString = allergies.length > 0 ? allergies.join(', ') : 'None Declared';

  return {
    valid: true,
    clientInfo: {
      fullName: name,
      phone,
      email,
      confirmedAddress: address || 'Trailer Pickup',
      allergies: allergyString,
      specialInstructions: document.getElementById('cust-setup-notes')?.value.trim() || ''
    }
  };
}

/**
 * Handle Waiver Submission
 */
async function handleWaiverSubmission(methodOverride = null) {
  const method = methodOverride || selectedPaymentMethod;
  const errEl = document.getElementById('waiver-submit-error');
  if (errEl) errEl.style.display = 'none';

  const validation = validateWaiverForm();
  if (!validation.valid) {
    if (errEl) {
      errEl.textContent = validation.message;
      errEl.style.display = 'block';
      errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert(validation.message);
    }
    return;
  }

  const submitBtn = method === 'cash' 
    ? document.getElementById('btn-submit-cash-agreement')
    : document.getElementById('btn-submit-card-pay');
  
  if (submitBtn) {
    window.setButtonLoading(submitBtn, true, 'Processing Signature & Booking...');
  }

  try {
    const signatureDataUrl = canvas.toDataURL('image/png');

    // 1. Sign Catering Waiver in Backend
    const signFn = httpsCallable(functions, 'signCateringWaiver');
    await signFn({
      agreementNumber: activeAgreementNumber,
      token: activeToken,
      clientInfo: validation.clientInfo,
      signatureDataUrl,
      paymentMethod: method === 'cash' ? 'cash' : 'card'
    });

    // 2. If Card / Wallet, tokenize and pay 30% deposit via Square
    if (method !== 'cash') {
      let sourceId = null;
      let verificationToken = null;

      if (method === 'google_pay' && googlePayInstance) {
        const tokenResult = await googlePayInstance.tokenize();
        if (tokenResult.status !== 'OK') throw new Error(tokenResult.errors?.[0]?.message || 'Google Pay tokenization failed.');
        sourceId = tokenResult.token;
      } else if (method === 'apple_pay' && applePayInstance) {
        const tokenResult = await applePayInstance.tokenize();
        if (tokenResult.status !== 'OK') throw new Error(tokenResult.errors?.[0]?.message || 'Apple Pay tokenization failed.');
        sourceId = tokenResult.token;
      } else {
        if (!squareCard) throw new Error('Square card field is not initialized. Please refresh.');
        const tokenResult = await squareCard.tokenize();
        if (tokenResult.status !== 'OK') {
          throw new Error(tokenResult.errors?.[0]?.message || 'Card payment details are incomplete or invalid.');
        }
        sourceId = tokenResult.token;
      }

      // Execute deposit payment Cloud Function
      const payFn = httpsCallable(functions, 'payWaiverDeposit');
      const payRes = await payFn({
        agreementNumber: activeAgreementNumber,
        token: activeToken,
        sourceId,
        verificationToken
      });

      renderConfirmedReceipt({
        agreementNumber: activeAgreementNumber,
        status: 'deposit_paid',
        client: validation.clientInfo,
        pricing: {
          depositPaid: payRes.data?.paymentReceipt?.amount || (activeAgreement.pricing?.depositRequired || 0)
        },
        legalProof: {
          signatureDataUrl,
          signedName: validation.clientInfo.fullName,
          signedAt: new Date().toISOString()
        }
      });
      return;
    }

    // Cash path
    renderConfirmedReceipt({
      agreementNumber: activeAgreementNumber,
      status: 'signed_cash_pending',
      client: validation.clientInfo,
      pricing: {
        depositRequired: activeAgreement.pricing?.depositRequired || 0
      },
      legalProof: {
        signatureDataUrl,
        signedName: validation.clientInfo.fullName,
        signedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('Submission error:', err);
    if (errEl) {
      errEl.textContent = err.message || 'An error occurred while confirming your agreement. Please try again.';
      errEl.style.display = 'block';
    } else {
      alert(err.message || 'Submission error');
    }
  } finally {
    if (submitBtn) {
      window.setButtonLoading(submitBtn, false);
    }
  }
}

/**
 * Render Confirmed Legal Receipt View
 */
function renderConfirmedReceipt(data) {
  const contentEl = document.getElementById('waiver-content');
  const receiptEl = document.getElementById('waiver-confirmed-receipt');
  if (contentEl) contentEl.style.display = 'none';
  if (receiptEl) receiptEl.style.display = 'block';

  document.getElementById('receipt-num').textContent = data.agreementNumber;
  document.getElementById('receipt-signer').textContent = data.client?.name || data.legalProof?.signedName || 'Signer';
  
  const signedDate = data.legalProof?.signedAt ? new Date(data.legalProof.signedAt) : new Date();
  document.getElementById('receipt-timestamp').textContent = signedDate.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const payStatusEl = document.getElementById('receipt-payment-status');
  const subTitleEl = document.getElementById('receipt-subtitle');

  if (data.status === 'signed_cash_pending') {
    const depAmt = data.pricing?.depositRequired || 0;
    payStatusEl.textContent = `Cash Downpayment Pending ($${Number(depAmt).toFixed(2)})`;
    payStatusEl.style.color = '#facc15';
    subTitleEl.textContent = `Agreement signed! Please bring your 30% cash deposit ($${Number(depAmt).toFixed(2)}) to 18411 Victory Blvd, Reseda, CA to lock in your catering booking.`;
  } else {
    const paidAmt = data.pricing?.depositPaid || data.pricing?.depositRequired || 0;
    payStatusEl.textContent = `30% Deposit Paid ($${Number(paidAmt).toFixed(2)}) via Card/Square`;
    payStatusEl.style.color = '#4ade80';
    subTitleEl.textContent = 'Your catering agreement has been signed and your 30% deposit is secured!';
  }

  const sigImg = document.getElementById('receipt-sig-img');
  if (sigImg && data.legalProof?.signatureDataUrl) {
    sigImg.src = data.legalProof.signatureDataUrl;
  }
}

/**
 * Initialization on DOM Ready
 */
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const agreementParam = urlParams.get('w') || urlParams.get('a') || urlParams.get('agreement');
  const tokenParam = urlParams.get('token') || '';

  initAllergyCheckboxes();
  initPaymentTabs();

  // Submit buttons
  document.getElementById('btn-submit-card-pay')?.addEventListener('click', () => handleWaiverSubmission('card'));
  document.getElementById('btn-submit-cash-agreement')?.addEventListener('click', () => handleWaiverSubmission('cash'));

  // Manual lookup button
  document.getElementById('btn-manual-lookup')?.addEventListener('click', () => {
    const num = document.getElementById('manual-waiver-num')?.value.trim();
    const phone = document.getElementById('manual-waiver-phone')?.value.trim();
    if (!num) {
      alert('Please enter your Agreement #');
      return;
    }
    loadAgreementData(num, '', phone);
  });

  if (agreementParam) {
    loadAgreementData(agreementParam, tokenParam);
  } else {
    document.getElementById('waiver-loading').style.display = 'none';
    document.getElementById('waiver-lookup').style.display = 'block';
  }
});
