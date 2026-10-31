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
    console.error('Missing Gmail credentials. Ensure functions:config:set gmail.email and gmail.password are configured.');
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
 * ─────────────────────────────────────────────────────────────────
 * 1. lookupCustomerQuote
 * Secure verification endpoint for the Customer Catering Portal.
 * Supports:
 *   - Direct access with secure token: ?q=BA-Q-XXXX&token=...
 *   - Manual verification with Quote # + Phone Number or Email
 * ─────────────────────────────────────────────────────────────────
 */
exports.lookupCustomerQuote = functions.https.onCall(async (data, context) => {
  try {
    const { quoteNumber, phone, email, token, contact } = data || {};

    if (!quoteNumber || typeof quoteNumber !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Quote number is required.');
    }

    const cleanQuoteNumber = quoteNumber.trim().toUpperCase();

    // Look up quote by quoteNumber or document ID
    const quotesRef = db.collection('catering_quotes');
    let quoteDoc = null;
    let quoteData = null;

    const qSnap = await quotesRef.where('quoteNumber', '==', cleanQuoteNumber).limit(1).get();
    if (!qSnap.empty) {
      quoteDoc = qSnap.docs[0];
      quoteData = quoteDoc.data();
    } else {
      const directDoc = await quotesRef.doc(cleanQuoteNumber).get();
      if (directDoc.exists) {
        quoteDoc = directDoc;
        quoteData = directDoc.data();
      }
    }

    if (!quoteData) {
      throw new functions.https.HttpsError('not-found', 'Quote proposal not found. Please verify the quote number.');
    }

    // Check authorization:
    // 1. Direct access token match
    let isAuthorized = false;
    if (token && quoteData.security?.directAccessToken && token === quoteData.security.directAccessToken) {
      isAuthorized = true;
    }

    // 2. Phone or Email match
    if (!isAuthorized) {
      const checkContact = contact || phone || email || '';
      const reqPhoneNorm = normalizePhone(checkContact);
      const custPhoneNorm = normalizePhone(quoteData.customer?.phone || quoteData.clientPhone);
      
      if (reqPhoneNorm && custPhoneNorm) {
        if (custPhoneNorm.endsWith(reqPhoneNorm) || reqPhoneNorm.endsWith(custPhoneNorm)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && checkContact) {
        const custEmail = (quoteData.customer?.email || quoteData.clientEmail || '').trim().toLowerCase();
        if (custEmail && checkContact.trim().toLowerCase() === custEmail) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      throw new functions.https.HttpsError('permission-denied', 'Verification failed. Please enter the phone number or email associated with this catering quote.');
    }

    // Log view if sent
    if (quoteData.status === 'sent') {
      try {
        await quoteDoc.ref.update({
          status: 'viewed',
          viewedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        quoteData.status = 'viewed';
      } catch (logErr) {
        console.warn('Could not update viewed status:', logErr);
      }
    }

    // Return sanitized public proposal data
    const sanitized = {
      id: quoteDoc.id,
      quoteNumber: quoteData.quoteNumber || cleanQuoteNumber,
      status: quoteData.status || 'draft',
      createdAt: quoteData.createdAt?.toDate?.()?.toISOString() || null,
      acceptedAt: quoteData.acceptedAt?.toDate?.()?.toISOString() || null,
      depositPaidAt: quoteData.depositPaidAt?.toDate?.()?.toISOString() || null,
      clientName: quoteData.customer?.name || quoteData.clientName || 'Valued Guest',
      clientEmail: quoteData.customer?.email || quoteData.clientEmail || '',
      clientPhone: quoteData.customer?.phone || quoteData.clientPhone || '',
      company: quoteData.customer?.company || quoteData.company || '',
      eventDate: quoteData.event?.date || quoteData.eventDate || '',
      eventTime: quoteData.event?.startTime || quoteData.eventTime || '17:00',
      guestCount: quoteData.event?.guests || quoteData.guestCount || 50,
      serviceStyle: quoteData.event?.serviceType || quoteData.serviceStyle || 'drop_off',
      venueAddress: quoteData.event?.location?.address || quoteData.venueAddress || '18411 Victory Blvd, Reseda, CA 91335',
      notes: quoteData.notes || quoteData.specialInstructions || '',
      items: (quoteData.items || []).map(item => ({
        id: item.id || '',
        name: item.name || '',
        portionSize: item.portionSize || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        img: item.img || item.imageUrl || ''
      })),
      subtotal: Number(quoteData.pricing?.subtotal || quoteData.subtotal) || 0,
      deliveryFee: Number(quoteData.pricing?.deliveryFee || quoteData.deliveryFee) || 0,
      discount: Number(quoteData.pricing?.discount || quoteData.discount) || 0,
      tax: Number(quoteData.pricing?.taxAmount || quoteData.tax) || 0,
      grandTotal: Number(quoteData.pricing?.total || quoteData.grandTotal) || 0,
      depositPercentage: Number(quoteData.pricing?.depositPercentage || quoteData.depositPercentage) || 30,
      depositDue: Number(quoteData.pricing?.depositAmount || quoteData.depositDue) || 0,
      balanceDue: Number(quoteData.pricing?.remainingBalance || quoteData.balanceDue) || 0,
      depositPaid: Number(quoteData.depositPaid) || 0,
      secureToken: quoteData.security?.directAccessToken || null,
      paymentReceipt: quoteData.paymentReceipt || null
    };

    return { success: true, quote: sanitized };
  } catch (err) {
    console.error('Error in lookupCustomerQuote:', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', err.message || 'Internal server error validating quote.');
  }
});

/**
 * ─────────────────────────────────────────────────────────────────
 * 2. acceptCateringQuote
 * Customer digitally accepts the proposal and agrees to terms.
 * ─────────────────────────────────────────────────────────────────
 */
exports.acceptCateringQuote = functions.https.onCall(async (data, context) => {
  try {
    const { quoteNumber, quoteId, token, signerName, signature } = data || {};
    const cleanQuoteId = quoteNumber || quoteId;
    const cleanSigner = signerName || signature;

    if (!cleanQuoteId || !token || !cleanSigner) {
      throw new functions.https.HttpsError('invalid-argument', 'Quote ID, verification token, and digital signature are required.');
    }

    const quotesRef = db.collection('catering_quotes');
    let quoteDoc = null;

    const qSnap = await quotesRef.where('quoteNumber', '==', cleanQuoteId.trim().toUpperCase()).limit(1).get();
    if (!qSnap.empty) {
      quoteDoc = qSnap.docs[0];
    } else {
      const directDoc = await quotesRef.doc(cleanQuoteId).get();
      if (directDoc.exists) quoteDoc = directDoc;
    }

    if (!quoteDoc) {
      throw new functions.https.HttpsError('not-found', 'Quote proposal not found.');
    }

    const quoteData = quoteDoc.data();

    if (quoteData.security?.directAccessToken !== token) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid or expired authorization token.');
    }

    await quoteDoc.ref.update({
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      'security.digitalSignature': cleanSigner.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Alert business owner via Nodemailer
    const transporter = getTransporter();
    if (transporter) {
      const mailOptions = {
        from: `"Bigi Awasaana Catering" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
        to: 'bigiawasaanallc@gmail.com',
        subject: `Catering Quote Accepted: #${quoteData.quoteNumber} by ${cleanSigner}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; background: #0B0B0B; color: #fff; border-radius: 8px;">
            <h2 style="color: #FF4500; margin-top: 0;">Catering Proposal Accepted</h2>
            <p>Customer <strong>${quoteData.customer?.name || quoteData.clientName}</strong> has digitally accepted proposal <strong>#${quoteData.quoteNumber}</strong>.</p>
            <div style="background: #18181b; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #ccc;">
              <div><strong>Event Date:</strong> ${quoteData.event?.date || quoteData.eventDate}</div>
              <div><strong>Guest Count:</strong> ${quoteData.event?.guests || quoteData.guestCount}</div>
              <div><strong>Grand Total:</strong> $${Number(quoteData.pricing?.total || quoteData.grandTotal || 0).toFixed(2)}</div>
              <div><strong>Deposit Required:</strong> $${Number(quoteData.pricing?.depositAmount || quoteData.depositDue || 0).toFixed(2)}</div>
              <div><strong>Digital Signature:</strong> ${cleanSigner}</div>
            </div>
            <p><a href="https://www.bigiawasaana.com/admin#catering" style="display: inline-block; padding: 10px 18px; background: #e11d48; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">View in Admin Panel</a></p>
          </div>
        `
      };
      transporter.sendMail(mailOptions).catch(e => console.warn('Notification email error:', e));
    }

    return { success: true, message: 'Proposal accepted successfully.' };
  } catch (err) {
    console.error('Error in acceptCateringQuote:', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', err.message || 'Internal server error accepting quote.');
  }
});

/**
 * ─────────────────────────────────────────────────────────────────
 * 3. payCateringDeposit
 * Server-side Square payment execution for Catering Deposit (or full balance).
 * Validates price directly from Firestore to prevent any client tampering.
 * ─────────────────────────────────────────────────────────────────
 */
exports.payCateringDeposit = functions.https.onCall(async (data, context) => {
  try {
    const { quoteNumber, quoteId, token, squarePaymentToken, sourceId, paymentType } = data || {};
    const cleanQuoteId = quoteNumber || quoteId;
    const cleanPaymentToken = sourceId || squarePaymentToken;

    if (!cleanQuoteId || !token || !cleanPaymentToken) {
      throw new functions.https.HttpsError('invalid-argument', 'Quote ID, authorization token, and Square payment token are required.');
    }

    const quotesRef = db.collection('catering_quotes');
    let quoteDoc = null;

    const qSnap = await quotesRef.where('quoteNumber', '==', cleanQuoteId.trim().toUpperCase()).limit(1).get();
    if (!qSnap.empty) {
      quoteDoc = qSnap.docs[0];
    } else {
      const directDoc = await quotesRef.doc(cleanQuoteId).get();
      if (directDoc.exists) quoteDoc = directDoc;
    }

    if (!quoteDoc) {
      throw new functions.https.HttpsError('not-found', 'Quote proposal not found.');
    }

    const quote = quoteDoc.data();

    if (quote.security?.directAccessToken !== token) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid or expired authorization token.');
    }

    const isFull = paymentType === 'full' || paymentType === 'full_payment';
    const isBalance = paymentType === 'balance';
    
    let chargeAmount = 0;
    let lineItemTitle = '';

    if (isFull) {
      chargeAmount = Number(quote.pricing?.total || quote.grandTotal) || 0;
      lineItemTitle = `Catering Full Payment - #${quote.quoteNumber}`;
    } else if (isBalance) {
      chargeAmount = Number(quote.pricing?.remainingBalance || quote.balanceDue) || 0;
      lineItemTitle = `Catering Remaining Balance - #${quote.quoteNumber}`;
    } else {
      // Standard Deposit (default 30%)
      chargeAmount = Number(quote.pricing?.depositAmount || quote.depositDue) || 0;
      lineItemTitle = `Catering Deposit (${quote.pricing?.depositPercentage || quote.depositPercentage || 30}%) - #${quote.quoteNumber}`;
    }

    if (chargeAmount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid payment amount calculated.');
    }

    const square = getSquareClient();
    const locationId = getLocationId();

    if (!locationId) {
      throw new functions.https.HttpsError('internal', 'Square location not configured on server.');
    }

    // 1. Create Square Order
    const amountInCents = Math.round(chargeAmount * 100);
    let squareOrderId = null;

    try {
      const orderResp = await square.ordersApi.createOrder({
        order: {
          locationId,
          referenceId: `QUOTE-${quote.quoteNumber}`,
          lineItems: [
            {
              name: lineItemTitle,
              quantity: '1',
              basePriceMoney: {
                amount: BigInt(amountInCents),
                currency: 'USD'
              }
            }
          ]
        }
      });
      squareOrderId = orderResp.result.order?.id;
    } catch (orderErr) {
      console.warn('Square order creation fallback, processing direct payment:', orderErr.message);
    }

    // 2. Process Square Payment
    const idempotencyKey = `sq_cat_${quote.quoteNumber}_${paymentType || 'dep'}_${Date.now()}`;
    const paymentRequest = {
      sourceId: cleanPaymentToken,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD'
      },
      locationId,
      referenceId: `QUOTE-${quote.quoteNumber}`,
      note: lineItemTitle,
      buyerEmailAddress: quote.customer?.email || quote.clientEmail || undefined
    };

    if (squareOrderId) {
      paymentRequest.orderId = squareOrderId;
    }

    const paymentResp = await square.paymentsApi.createPayment(paymentRequest);
    const paymentResult = paymentResp.result.payment;

    if (!paymentResult || paymentResult.status !== 'COMPLETED') {
      throw new functions.https.HttpsError('internal', `Payment failed with status ${paymentResult?.status || 'UNKNOWN'}.`);
    }

    // 3. Atomically update Firestore quote
    const newPayment = {
      type: isFull ? 'full' : isBalance ? 'balance' : 'deposit',
      amount: chargeAmount,
      squarePaymentId: paymentResult.id,
      squareOrderId: squareOrderId || null,
      status: paymentResult.status,
      paidAt: new Date().toISOString(),
      receiptUrl: paymentResult.receiptUrl || null,
      cardBrand: paymentResult.cardDetails?.card?.cardBrand || 'CARD',
      last4: paymentResult.cardDetails?.card?.last4 || '****'
    };

    const remainingBalance = isFull ? 0 : Math.max(0, (Number(quote.pricing?.total || quote.grandTotal) || 0) - chargeAmount);

    const quoteUpdates = {
      payments: admin.firestore.FieldValue.arrayUnion(newPayment),
      depositPaid: chargeAmount,
      balanceDue: remainingBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (isFull || remainingBalance <= 0) {
      quoteUpdates.status = 'paid_in_full';
      quoteUpdates['pricing.depositStatus'] = 'paid';
      quoteUpdates['pricing.remainingBalance'] = 0;
      quoteUpdates.depositPaidAt = admin.firestore.FieldValue.serverTimestamp();
    } else {
      quoteUpdates.status = 'deposit_paid';
      quoteUpdates['pricing.depositStatus'] = 'paid';
      quoteUpdates['pricing.remainingBalance'] = remainingBalance;
      quoteUpdates.depositPaidAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await quoteDoc.ref.update(quoteUpdates);

    // If linked to an inquiry, mark inquiry as resolved
    if (quote.inquiryId) {
      try {
        await db.collection('catering_inquiries').doc(quote.inquiryId).update({
          status: 'resolved',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (inqErr) {
        console.warn('Could not update linked inquiry:', inqErr.message);
      }
    }

    // 4. Send Confirmation Emails
    const transporter = getTransporter();
    const clientEmail = quote.customer?.email || quote.clientEmail;
    if (transporter && clientEmail) {
      const customerEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0B0B0B; color: #FFFFFF; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #FF4500; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px;">Bigi Awasaana</h1>
            <p style="color: #999999; margin: 4px 0 0 0; font-size: 13px;">100% Zabiha Halal Charcoal Grill Catering</p>
          </div>
          
          <div style="background: #18181b; border: 1px solid #27272a; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #10b981; margin-top: 0; font-size: 20px;">Booking Confirmed!</h2>
            <p style="color: #E0E0E0; font-size: 14px; line-height: 1.6;">
              Thank you, <strong>${quote.customer?.name || quote.clientName}</strong>! We have received your catering payment of <strong>$${chargeAmount.toFixed(2)}</strong> for quote <strong>#${quote.quoteNumber}</strong>. Your event date is secured on our master grill schedule.
            </p>
            <div style="background: #09090b; padding: 14px; border-radius: 6px; font-size: 13px; color: #A1A1AA; line-height: 1.8;">
              <div><strong>Confirmation ID:</strong> ${paymentResult.id}</div>
              <div><strong>Payment Type:</strong> ${isFull ? 'Full Payment' : '30% Booking Deposit'}</div>
              <div><strong>Amount Paid:</strong> $${chargeAmount.toFixed(2)}</div>
              <div><strong>Remaining Balance:</strong> $${remainingBalance.toFixed(2)}</div>
            </div>
          </div>
        </div>
      `;

      transporter.sendMail({
        from: `"Bigi Awasaana Catering" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
        to: clientEmail,
        subject: `Catering Booking Confirmed: #${quote.quoteNumber} - Bigi Awasaana`,
        html: customerEmailHtml
      }).catch(err => console.warn('Customer confirmation email failed:', err));

      // Alert business owner
      transporter.sendMail({
        from: `"Bigi Awasaana Catering" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
        to: 'bigiawasaanallc@gmail.com',
        subject: `DEPOSIT RECEIVED: $${chargeAmount.toFixed(2)} for Quote #${quote.quoteNumber}`,
        html: `<p>Payment of <strong>$${chargeAmount.toFixed(2)}</strong> received for Quote <strong>#${quote.quoteNumber}</strong> (${quote.customer?.name || quote.clientName}). Event Date: <strong>${quote.event?.date || quote.eventDate}</strong>.</p>`
      }).catch(err => console.warn('Owner notification email failed:', err));
    }

    return {
      success: true,
      message: 'Deposit payment processed successfully. Booking confirmed!',
      paymentReceipt: {
        paymentId: paymentResult.id,
        amount: chargeAmount,
        status: paymentResult.status
      },
      remainingBalance
    };
  } catch (err) {
    console.error('Error in payCateringDeposit:', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', err.message || 'Payment processing failed.');
  }
});

/**
 * ─────────────────────────────────────────────────────────────────
 * 4. sendCateringQuoteEmail
 * Admin action to dispatch official catering quote proposal link.
 * ─────────────────────────────────────────────────────────────────
 */
exports.sendCateringQuoteEmail = functions.https.onCall(async (data, context) => {
  if (!isAdminContext(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
  }

  const { quoteId } = data || {};
  if (!quoteId) {
    throw new functions.https.HttpsError('invalid-argument', 'Quote ID is required.');
  }

  const quoteDoc = await db.collection('catering_quotes').doc(quoteId).get();
  if (!quoteDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Quote not found.');
  }

  const quote = quoteDoc.data();
  const clientEmail = quote.customer?.email || quote.clientEmail;
  if (!clientEmail) {
    throw new functions.https.HttpsError('failed-precondition', 'Customer email is missing.');
  }

  // Ensure directAccessToken exists
  let token = quote.security?.directAccessToken;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    await quoteDoc.ref.update({
      'security.directAccessToken': token,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  const quoteLink = `https://www.bigiawasaana.com/quote.html?q=${encodeURIComponent(quote.quoteNumber)}&token=${encodeURIComponent(token)}`;

  const transporter = getTransporter();
  if (!transporter) {
    throw new functions.https.HttpsError('internal', 'Email service not configured on server.');
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0B0B0B; color: #FFFFFF; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF4500; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px;">Bigi Awasaana</h1>
        <p style="color: #999999; margin: 4px 0 0 0; font-size: 13px;">100% Zabiha Halal Charcoal Grill Catering</p>
      </div>

      <div style="background: #18181b; border: 1px solid #27272a; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h2 style="color: #FFFFFF; margin-top: 0; font-size: 18px;">Your Catering Proposal is Ready</h2>
        <p style="color: #D4D4D8; font-size: 14px; line-height: 1.6;">
          Dear <strong>${quote.customer?.name || quote.clientName}</strong>,<br><br>
          We have prepared your personalized 100% Zabiha Halal catering proposal for your upcoming event on <strong>${quote.event?.date || quote.eventDate || 'N/A'}</strong>.
        </p>

        <div style="background: #09090b; border: 1px solid #27272a; padding: 14px 18px; border-radius: 6px; margin: 18px 0; font-size: 13px; color: #A1A1AA; line-height: 1.8;">
          <div><strong>Quote Number:</strong> <span style="color: #FF4500;">#${quote.quoteNumber}</span></div>
          <div><strong>Guests:</strong> ${quote.event?.guests || quote.guestCount || 0}</div>
          <div><strong>Grand Total:</strong> $${Number(quote.pricing?.total || quote.grandTotal || 0).toFixed(2)}</div>
          <div><strong>Deposit Required (30%):</strong> <span style="color: #10b981; font-weight: bold;">$${Number(quote.pricing?.depositAmount || quote.depositDue || 0).toFixed(2)}</span></div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${quoteLink}" style="display: inline-block; padding: 14px 32px; background: #FF4500; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; letter-spacing: 0.5px;">
            Review proposal &amp; pay deposit
          </a>
        </div>
      </div>

      <p style="color: #71717A; font-size: 12px; text-align: center; line-height: 1.5;">
        Bigi Awasaana LLC | 18411 Victory Blvd, Reseda, CA 91335<br>
        Direct Phone: (323) 921-1646 | 100% Hand-Slaughtered Zabiha Halal
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Bigi Awasaana Catering" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
    to: clientEmail,
    subject: `Your Catering Proposal from Bigi Awasaana (Quote #${quote.quoteNumber})`,
    html: emailHtml
  });

  await quoteDoc.ref.update({
    status: 'sent',
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, message: 'Proposal email sent successfully.' };
});
