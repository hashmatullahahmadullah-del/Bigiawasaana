const { functions, admin, db, getSquareClient, getLocationId, isAdminContext } = require('./shared');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

/**
 * Creates and returns an authenticated Nodemailer transporter for Gmail.
 */
function getTransporter() {
  let gmailEmail = process.env.GMAIL_EMAIL;
  let gmailPassword = process.env.GMAIL_PASSWORD;

  try {
    if (functions.config().gmail) {
      gmailEmail = functions.config().gmail.email || gmailEmail;
      gmailPassword = functions.config().gmail.password || gmailPassword;
    }
  } catch (e) {
    /* ignore config error */
  }

  if (!gmailEmail || !gmailPassword) {
    console.error('Missing Gmail credentials.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: gmailPassword,
    },
  });
}

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Helper to generate unique agreement numbers: BA-W-YYMM-XXXX
 */
function generateAgreementNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `BA-W-${yy}${mm}-${rand}`;
}

/**
 * ─────────────────────────────────────────────────────────────────
 * 1. createCateringWaiver (Admin only)
 * Quick entry tool for phone or in-person catering orders.
 * ─────────────────────────────────────────────────────────────────
 */
exports.createCateringWaiver = functions.https.onCall(async (data, context) => {
  if (!isAdminContext(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
  }

  const {
    clientName,
    clientPhone,
    clientEmail,
    eventDate,
    eventTime,
    guestCount,
    fulfillment,
    deliveryAddress,
    menuSummary,
    dishes,
    estimatedTotal,
    depositAmount,
    specialInstructions,
    notes
  } = data || {};

  if (!clientName || !clientPhone || !eventDate) {
    throw new functions.https.HttpsError('invalid-argument', 'Client Name, Phone, and Event Date are required.');
  }

  const total = Number(estimatedTotal) || 0;
  if (total <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Estimated total must be greater than $0.');
  }

  const deposit = Number(depositAmount) > 0 ? Number(depositAmount) : Math.round(total * 0.3 * 100) / 100;
  const agreementNumber = generateAgreementNumber();
  const token = crypto.randomBytes(24).toString('hex');

  const agreementData = {
    agreementNumber,
    token,
    status: 'sent',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    event: {
      date: String(eventDate).trim(),
      time: eventTime ? String(eventTime).trim() : '05:00 PM',
      guestCount: Number(guestCount) || 20,
      fulfillment: fulfillment === 'delivery' ? 'delivery' : 'pickup',
      deliveryAddress: deliveryAddress ? String(deliveryAddress).trim() : '',
      menuSummary: menuSummary ? String(menuSummary).trim() : '',
      dishes: Array.isArray(dishes) ? dishes : [],
      specialInstructions: specialInstructions ? String(specialInstructions).trim() : ''
    },

    pricing: {
      estimatedTotal: total,
      depositRequired: deposit,
      depositPaid: 0,
      balanceDue: total - deposit,
      penaltyFee: 199.00
    },

    client: {
      name: String(clientName).trim(),
      phone: String(clientPhone).trim(),
      email: clientEmail ? String(clientEmail).trim() : '',
      confirmedAddress: deliveryAddress ? String(deliveryAddress).trim() : '',
      allergies: '',
      notes: notes ? String(notes).trim() : ''
    },

    legalProof: null,

    payment: {
      method: null,
      paymentStatus: 'unpaid',
      squarePaymentId: null,
      cashReceivedAt: null,
      cashReceivedBy: null
    },

    security: {
      directAccessToken: token,
      ipLog: []
    }
  };

  const docRef = await db.collection('catering_agreements').add(agreementData);

  const waiverUrl = `https://www.bigiawasaana.com/waiver.html?w=${encodeURIComponent(agreementNumber)}&token=${encodeURIComponent(token)}`;

  return {
    success: true,
    agreementId: docRef.id,
    agreementNumber,
    token,
    waiverUrl
  };
});

/**
 * ─────────────────────────────────────────────────────────────────
 * 2. lookupCateringWaiver (Public with token or phone verification)
 * ─────────────────────────────────────────────────────────────────
 */
exports.lookupCateringWaiver = functions.https.onCall(async (data, context) => {
  const { agreementNumber, token, phone } = data || {};

  if (!agreementNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Agreement number is required.');
  }

  const cleanNumber = String(agreementNumber).trim().toUpperCase();
  const snap = await db.collection('catering_agreements')
    .where('agreementNumber', '==', cleanNumber)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', 'Catering agreement not found. Please check your agreement link.');
  }

  const doc = snap.docs[0];
  const item = doc.data();

  // Validate security token or phone number
  let isAuthorized = false;
  if (token && item.security?.directAccessToken && token === item.security.directAccessToken) {
    isAuthorized = true;
  } else if (phone) {
    const p1 = normalizePhone(phone);
    const p2 = normalizePhone(item.client?.phone);
    if (p1 && p2 && (p1.endsWith(p2) || p2.endsWith(p1))) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw new functions.https.HttpsError('permission-denied', 'Verification token or matching phone number required.');
  }

  // Return public sanitized object
  return {
    id: doc.id,
    agreementNumber: item.agreementNumber,
    status: item.status,
    event: item.event,
    pricing: item.pricing,
    client: {
      name: item.client?.name || '',
      phone: item.client?.phone || '',
      email: item.client?.email || '',
      confirmedAddress: item.client?.confirmedAddress || '',
      allergies: item.client?.allergies || ''
    },
    legalProof: item.legalProof ? {
      signedName: item.legalProof.signedName,
      signedAt: item.legalProof.signedAt ? item.legalProof.signedAt.toDate().toISOString() : null,
      termsVersion: item.legalProof.termsVersion,
      penaltyAcknowledged: item.legalProof.penaltyAcknowledged
    } : null,
    payment: {
      method: item.payment?.method || null,
      paymentStatus: item.payment?.paymentStatus || 'unpaid',
      depositPaid: item.pricing?.depositPaid || 0,
      balanceDue: item.pricing?.balanceDue || 0
    }
  };
});

/**
 * ─────────────────────────────────────────────────────────────────
 * 3. signCateringWaiver (Client e-signature submission)
 * ─────────────────────────────────────────────────────────────────
 */
exports.signCateringWaiver = functions.https.onCall(async (data, context) => {
  const {
    agreementNumber,
    token,
    clientInfo,
    signatureDataUrl,
    paymentMethod
  } = data || {};

  if (!agreementNumber || !token) {
    throw new functions.https.HttpsError('invalid-argument', 'Agreement number and security token are required.');
  }

  if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid signature drawing is required.');
  }

  if (!clientInfo || !clientInfo.fullName || !clientInfo.phone) {
    throw new functions.https.HttpsError('invalid-argument', 'Legal full name and phone number are required.');
  }

  if (!['cash', 'card'].includes(paymentMethod)) {
    throw new functions.https.HttpsError('invalid-argument', 'Please select a valid payment method (Cash or Card).');
  }

  const cleanNumber = String(agreementNumber).trim().toUpperCase();
  const snap = await db.collection('catering_agreements')
    .where('agreementNumber', '==', cleanNumber)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', 'Agreement not found.');
  }

  const doc = snap.docs[0];
  const item = doc.data();

  if (token !== item.security?.directAccessToken) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid security token.');
  }

  // Extract client metadata for audit trail
  const ipAddress = (context.rawRequest && (context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.ip)) || 'unknown';
  const userAgent = (context.rawRequest && context.rawRequest.headers['user-agent']) || 'unknown';

  const newStatus = paymentMethod === 'cash' ? 'signed_cash_pending' : 'awaiting_card_deposit';

  const updateData = {
    status: newStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    'client.name': String(clientInfo.fullName).trim(),
    'client.phone': String(clientInfo.phone).trim(),
    'client.email': clientInfo.email ? String(clientInfo.email).trim() : (item.client?.email || ''),
    'client.confirmedAddress': clientInfo.confirmedAddress ? String(clientInfo.confirmedAddress).trim() : (item.client?.confirmedAddress || ''),
    'client.allergies': clientInfo.allergies ? String(clientInfo.allergies).trim() : '',
    'client.specialInstructions': clientInfo.specialInstructions ? String(clientInfo.specialInstructions).trim() : (item.event?.specialInstructions || ''),
    
    legalProof: {
      signatureDataUrl,
      signedName: String(clientInfo.fullName).trim(),
      signedAt: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
      termsVersion: '2026.1',
      penaltyAcknowledged: true,
      penaltyFee: 199.00
    },

    'payment.method': paymentMethod
  };

  await doc.ref.update(updateData);

  // Send email alert to owner
  const transporter = getTransporter();
  if (transporter) {
    const depositReq = Number(item.pricing?.depositRequired || 0).toFixed(2);
    const paymentNotice = paymentMethod === 'cash'
      ? `<p style="color: #ff9800; font-weight: bold;">💵 Client selected CASH downpayment ($${depositReq}) and agreed to visit the trailer at 18411 Victory Blvd, Reseda, CA.</p>`
      : `<p style="color: #4caf50; font-weight: bold;">💳 Client selected CARD payment and is tokenizing 30% deposit ($${depositReq}) online.</p>`;

    transporter.sendMail({
      from: `"Bigi Awasaana Agreements" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
      to: 'bigiawasaanallc@gmail.com',
      subject: `WAIVER SIGNED: ${item.agreementNumber} - ${clientInfo.fullName} ($${depositReq} Deposit)`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #0B0B0B; color: #FFF; padding: 20px; border-radius: 8px;">
          <h2 style="color: #FF4500; margin-top: 0;">Catering Agreement &amp; Waiver Signed</h2>
          <p><strong>Agreement #:</strong> ${item.agreementNumber}</p>
          <p><strong>Signer:</strong> ${escapeHtml(clientInfo.fullName)} (${escapeHtml(clientInfo.phone)})</p>
          <p><strong>Event Date:</strong> ${escapeHtml(item.event?.date || 'N/A')}</p>
          <p><strong>Estimated Total:</strong> $${Number(item.pricing?.estimatedTotal || 0).toFixed(2)}</p>
          <p><strong>30% Deposit:</strong> $${depositReq}</p>
          <p><strong>Allergies Declared:</strong> ${escapeHtml(clientInfo.allergies || 'None declared')}</p>
          <p><strong>Address:</strong> ${escapeHtml(clientInfo.confirmedAddress || item.event?.deliveryAddress || 'Pickup at Trailer')}</p>
          ${paymentNotice}
          <p><strong>$199 Cancellation Penalty:</strong> Explicitly acknowledged and accepted by client.</p>
          <hr style="border: 1px solid #282828; margin: 20px 0;">
          <p style="font-size: 12px; color: #888;">IP: ${escapeHtml(ipAddress)} | User-Agent: ${escapeHtml(userAgent)}</p>
        </div>
      `
    }).catch(err => console.warn('Owner email notification error:', err));
  }

  return {
    success: true,
    status: newStatus,
    message: paymentMethod === 'cash'
      ? 'Waiver signed successfully! Please visit our trailer at 18411 Victory Blvd, Reseda, CA to submit your 30% cash deposit.'
      : 'Waiver signed successfully! Please complete your 30% card deposit.'
  };
});

/**
 * ─────────────────────────────────────────────────────────────────
 * 4. payWaiverDeposit (Square Payment Processing for 30% Deposit)
 * ─────────────────────────────────────────────────────────────────
 */
exports.payWaiverDeposit = functions.https.onCall(async (data, context) => {
  const { agreementNumber, token, sourceId, verificationToken } = data || {};

  if (!agreementNumber || !token || !sourceId) {
    throw new functions.https.HttpsError('invalid-argument', 'Agreement number, token, and payment sourceId are required.');
  }

  const cleanNumber = String(agreementNumber).trim().toUpperCase();
  const snap = await db.collection('catering_agreements')
    .where('agreementNumber', '==', cleanNumber)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', 'Agreement not found.');
  }

  const doc = snap.docs[0];
  const item = doc.data();

  if (token !== item.security?.directAccessToken) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid security token.');
  }

  if (item.status === 'deposit_paid' || item.payment?.paymentStatus === 'deposit_received') {
    throw new functions.https.HttpsError('failed-precondition', 'Deposit has already been paid for this catering agreement.');
  }

  const depositAmount = Number(item.pricing?.depositRequired) || (Number(item.pricing?.estimatedTotal || 0) * 0.3);
  const amountCents = Math.round(depositAmount * 100);

  if (amountCents <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Deposit amount must be greater than zero.');
  }

  const squareClient = getSquareClient();
  const locationId = getLocationId();

  const idempotencyKey = `waiver-dep-${cleanNumber}-${Date.now()}`;
  const paymentRequest = {
    sourceId,
    idempotencyKey,
    amountMoney: {
      amount: BigInt(amountCents),
      currency: 'USD'
    },
    locationId,
    note: `Bigi Awasaana 30% Catering Deposit - Agreement #${cleanNumber}`,
    buyerEmailAddress: item.client?.email || undefined
  };

  if (verificationToken) {
    paymentRequest.verificationToken = verificationToken;
  }

  let paymentResult;
  try {
    const response = await squareClient.paymentsApi.createPayment(paymentRequest);
    paymentResult = response.result.payment;
  } catch (err) {
    console.error('Square Payment error for catering waiver:', err);
    const detail = (err.errors && err.errors[0] && err.errors[0].detail) || err.message || 'Payment processing failed.';
    throw new functions.https.HttpsError('internal', `Square Payment Error: ${detail}`);
  }

  const total = Number(item.pricing?.estimatedTotal || 0);
  const remainingBalance = Math.max(0, total - depositAmount);

  await doc.ref.update({
    status: 'deposit_paid',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    'pricing.depositPaid': depositAmount,
    'pricing.balanceDue': remainingBalance,
    'payment.paymentStatus': 'deposit_received',
    'payment.squarePaymentId': paymentResult.id,
    'payment.paidAt': admin.firestore.FieldValue.serverTimestamp()
  });

  // Send confirmation emails
  const transporter = getTransporter();
  if (transporter) {
    // Notify Owner
    transporter.sendMail({
      from: `"Bigi Awasaana Catering" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
      to: 'bigiawasaanallc@gmail.com',
      subject: `DEPOSIT PAID: $${depositAmount.toFixed(2)} for Agreement #${cleanNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #0B0B0B; color: #FFF; padding: 20px; border-radius: 8px;">
          <h2 style="color: #4CAF50; margin-top: 0;">30% Deposit Paid Successfully</h2>
          <p><strong>Agreement #:</strong> ${cleanNumber}</p>
          <p><strong>Client:</strong> ${escapeHtml(item.client?.name || '')} (${escapeHtml(item.client?.phone || '')})</p>
          <p><strong>Deposit Paid:</strong> $${depositAmount.toFixed(2)}</p>
          <p><strong>Remaining Balance Due at Handover:</strong> $${remainingBalance.toFixed(2)}</p>
          <p><strong>Square Payment ID:</strong> ${escapeHtml(paymentResult.id)}</p>
          <p><strong>Event Date:</strong> ${escapeHtml(item.event?.date || 'N/A')}</p>
        </div>
      `
    }).catch(err => console.warn('Email notify error:', err));

    // Notify Client
    if (item.client?.email) {
      transporter.sendMail({
        from: `"Bigi Awasaana Catering" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
        to: item.client.email,
        subject: `Catering Booking Confirmed (Agreement #${cleanNumber}) - Bigi Awasaana`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #0B0B0B; color: #FFF; padding: 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #FF4500; margin-top: 0;">Booking Confirmed!</h1>
            <p>Dear <strong>${escapeHtml(item.client?.name || 'Valued Customer')}</strong>,</p>
            <p>We have successfully received your 30% deposit of <strong>$${depositAmount.toFixed(2)}</strong> for your upcoming event on <strong>${escapeHtml(item.event?.date || 'N/A')}</strong>.</p>
            <div style="background: #18181b; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <div><strong>Agreement #:</strong> ${cleanNumber}</div>
              <div><strong>Payment Receipt ID:</strong> ${escapeHtml(paymentResult.id)}</div>
              <div><strong>Deposit Paid:</strong> $${depositAmount.toFixed(2)}</div>
              <div><strong>Remaining Balance Due:</strong> $${remainingBalance.toFixed(2)}</div>
            </div>
            <p style="font-size: 13px; color: #aaa;">Bigi Awasaana | 18411 Victory Blvd, Reseda, CA 91335 | (323) 921-1646</p>
          </div>
        `
      }).catch(err => console.warn('Client email notify error:', err));
    }
  }

  return {
    success: true,
    message: 'Deposit payment processed successfully. Catering booking locked in!',
    paymentReceipt: {
      paymentId: paymentResult.id,
      amount: depositAmount,
      status: paymentResult.status
    },
    remainingBalance
  };
});

/**
 * ─────────────────────────────────────────────────────────────────
 * 5. markWaiverCashReceived (Admin records in-person cash deposit)
 * ─────────────────────────────────────────────────────────────────
 */
exports.markWaiverCashReceived = functions.https.onCall(async (data, context) => {
  if (!isAdminContext(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
  }

  const { agreementNumber, amountReceived, notes } = data || {};
  if (!agreementNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Agreement number is required.');
  }

  const cleanNumber = String(agreementNumber).trim().toUpperCase();
  const snap = await db.collection('catering_agreements')
    .where('agreementNumber', '==', cleanNumber)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', 'Agreement not found.');
  }

  const doc = snap.docs[0];
  const item = doc.data();

  const total = Number(item.pricing?.estimatedTotal || 0);
  const depositReq = Number(item.pricing?.depositRequired) || (total * 0.3);
  const paid = Number(amountReceived) > 0 ? Number(amountReceived) : depositReq;
  const balanceDue = Math.max(0, total - paid);

  await doc.ref.update({
    status: 'deposit_paid',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    'pricing.depositPaid': paid,
    'pricing.balanceDue': balanceDue,
    'payment.paymentStatus': 'deposit_received',
    'payment.method': 'cash',
    'payment.cashReceivedAt': admin.firestore.FieldValue.serverTimestamp(),
    'payment.cashReceivedBy': context.auth?.token?.email || 'admin',
    'payment.notes': notes ? String(notes).trim() : ''
  });

  return {
    success: true,
    message: `Cash deposit of $${paid.toFixed(2)} recorded successfully. Agreement marked Confirmed.`,
    depositPaid: paid,
    balanceDue
  };
});

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
