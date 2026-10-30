const { functions, admin, db, isAdminContext } = require('./shared');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { DEFAULT_CATERING_CATALOG, OPTIONAL_CATERING_SERVICES } = require('./catering-catalog-data');

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
    console.error('Missing Gmail credentials in functions config.');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailEmail, pass: gmailPassword },
  });
}

function generatePackageRequestNumber() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `BA-PKG-${year}${month}-${randomHex}`;
}

function generateQuoteNumber() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `BA-Q-${year}${month}-${randomHex}`;
}

function generateSecureToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Authoritatively calculates package pricing on the server.
 */
function calculateAuthoritativeEstimate(items, services, guestCount, fulfillment) {
  let foodSubtotalCents = 0;
  const sanitizedItems = [];

  // Match items against authoritative catalog
  for (const it of (items || [])) {
    const catalogItem = DEFAULT_CATERING_CATALOG.find(c => c.id === it.id);
    const unitPrice = catalogItem ? catalogItem.unitPrice : (Number(it.unitPrice) || 0);
    const quantity = Math.max(1, Math.min(50, parseInt(it.quantity, 10) || 1));
    const itemTotalCents = Math.round(unitPrice * 100) * quantity;
    foodSubtotalCents += itemTotalCents;

    sanitizedItems.push({
      id: it.id,
      name: catalogItem ? catalogItem.nameEn : (it.name || 'Catering Dish'),
      portionSize: it.portionSize || 'Party Tray',
      imageUrl: it.imageUrl || '',
      quantity,
      unitPrice,
      totalPrice: itemTotalCents / 100
    });
  }

  // Match optional services
  let servicesTotalCents = 0;
  const sanitizedServices = [];
  for (const s of (services || [])) {
    const sDef = OPTIONAL_CATERING_SERVICES.find(srv => srv.id === s.id);
    if (sDef) {
      let sPriceCents = Math.round(sDef.price * 100);
      if (sDef.priceUnit === 'per_guest') {
        sPriceCents = Math.round(sDef.price * 100) * (guestCount || 1);
      }
      servicesTotalCents += sPriceCents;
      sanitizedServices.push({
        id: sDef.id,
        name: sDef.name,
        price: sPriceCents / 100
      });
    }
  }

  // Delivery fee (Standard $50 for local valley delivery, or 0 for pickup)
  const deliveryFeeCents = (fulfillment === 'delivery') ? 5000 : 0;

  // 10.25% Sales tax (LA County)
  const taxableCents = foodSubtotalCents + servicesTotalCents;
  const taxCents = Math.round(taxableCents * 0.1025);
  const totalCents = taxableCents + deliveryFeeCents + taxCents;

  return {
    foodSubtotal: foodSubtotalCents / 100,
    servicesTotal: servicesTotalCents / 100,
    deliveryFee: deliveryFeeCents / 100,
    taxAmount: taxCents / 100,
    estimatedTotal: totalCents / 100,
    sanitizedItems,
    sanitizedServices
  };
}

/**
 * Callable: submitCateringPackageRequest
 * Validates, recalculates, saves package request to Firestore, and notifies admin.
 */
exports.submitCateringPackageRequest = functions.https.onCall(async (data, context) => {
  if (!data) {
    throw new functions.https.HttpsError('invalid-argument', 'Request body cannot be empty.');
  }

  const { customerContact, eventDetails, items, services, packageType, templateId } = data;

  if (!customerContact || !customerContact.name || !customerContact.email || !customerContact.phone) {
    throw new functions.https.HttpsError('invalid-argument', 'Customer contact (name, email, phone) is required.');
  }

  if (!eventDetails || !eventDetails.date) {
    throw new functions.https.HttpsError('invalid-argument', 'Event date is required.');
  }

  const guestCount = Math.max(5, parseInt(eventDetails.guests, 10) || 25);
  const fulfillment = eventDetails.fulfillment === 'pickup' ? 'pickup' : 'delivery';

  // Calculate authoritative pricing
  const calc = calculateAuthoritativeEstimate(items, services, guestCount, fulfillment);

  const requestNumber = generatePackageRequestNumber();

  const packageDoc = {
    requestNumber,
    customerContact: {
      name: String(customerContact.name).trim().substring(0, 100),
      email: String(customerContact.email).trim().toLowerCase().substring(0, 100),
      phone: String(customerContact.phone).trim().substring(0, 30),
      preferredContact: customerContact.preferredContact || 'phone'
    },
    eventDetails: {
      type: String(eventDetails.type || 'Celebration').substring(0, 50),
      date: String(eventDetails.date).substring(0, 20),
      time: String(eventDetails.time || '17:00').substring(0, 10),
      guests: guestCount,
      fulfillment,
      deliveryAddress: String(eventDetails.deliveryAddress || '').substring(0, 300),
      specialInstructions: String(eventDetails.specialInstructions || '').substring(0, 1000)
    },
    packageType: packageType === 'template' ? 'template' : 'custom_scratch',
    templateId: templateId || null,
    selectedItems: calc.sanitizedItems,
    selectedServices: calc.sanitizedServices,
    estimatedPriceBreakdown: {
      foodSubtotal: calc.foodSubtotal,
      servicesTotal: calc.servicesTotal,
      deliveryFee: calc.deliveryFee,
      taxAmount: calc.taxAmount,
      estimatedTotal: calc.estimatedTotal
    },
    status: 'new',
    linkedQuoteId: null,
    adminNotes: '',
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('catering_package_requests').add(packageDoc);

  // Send admin email notification
  const transporter = getTransporter();
  if (transporter) {
    const itemsListHtml = calc.sanitizedItems.map(it => 
      `<li style="margin-bottom: 6px;"><strong>${it.quantity}x</strong> ${it.name} (${it.portionSize}) — $${it.totalPrice.toFixed(2)}</li>`
    ).join('');

    const servicesListHtml = calc.sanitizedServices.length > 0 
      ? calc.sanitizedServices.map(s => `<li>${s.name} — $${s.price.toFixed(2)}</li>`).join('')
      : '<li>No optional services selected</li>';

    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0B0B; color: #f4f4f4; padding: 24px; border-radius: 8px; border: 1px solid #222;">
        <h2 style="color: #FF4500; margin: 0 0 16px;">New Catering Package Request: ${requestNumber}</h2>
        <div style="background: #171717; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
          <p><strong>Customer:</strong> ${packageDoc.customerContact.name} (<a href="tel:${packageDoc.customerContact.phone}" style="color: #FF4500;">${packageDoc.customerContact.phone}</a> | ${packageDoc.customerContact.email})</p>
          <p><strong>Event:</strong> ${packageDoc.eventDetails.type} on <strong>${packageDoc.eventDetails.date}</strong> at ${packageDoc.eventDetails.time}</p>
          <p><strong>Guests:</strong> ${packageDoc.eventDetails.guests} guests | <strong>Fulfillment:</strong> ${packageDoc.eventDetails.fulfillment.toUpperCase()}</p>
          ${packageDoc.eventDetails.deliveryAddress ? `<p><strong>Address:</strong> ${packageDoc.eventDetails.deliveryAddress}</p>` : ''}
          ${packageDoc.eventDetails.specialInstructions ? `<p><strong>Notes:</strong> ${packageDoc.eventDetails.specialInstructions}</p>` : ''}
        </div>

        <h3 style="color: #fff; margin-bottom: 8px;">Selected Trays & Platters:</h3>
        <ul style="color: #ccc; line-height: 1.6; padding-left: 20px;">${itemsListHtml}</ul>

        <h3 style="color: #fff; margin-bottom: 8px;">Optional Services:</h3>
        <ul style="color: #ccc; line-height: 1.6; padding-left: 20px;">${servicesListHtml}</ul>

        <div style="background: #1a1a1a; padding: 16px; border-radius: 6px; margin-top: 20px; border-top: 2px solid #FF4500;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Food Subtotal:</span><strong>$${calc.foodSubtotal.toFixed(2)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Services:</span><strong>$${calc.servicesTotal.toFixed(2)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Delivery Fee:</span><strong>$${calc.deliveryFee.toFixed(2)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Tax (10.25%):</span><strong>$${calc.taxAmount.toFixed(2)}</strong></div>
          <div style="display: flex; justify-content: space-between; font-size: 18px; margin-top: 8px; border-top: 1px solid #333; padding-top: 8px;">
            <span>Estimated Total:</span><strong style="color: #FF4500;">$${calc.estimatedTotal.toFixed(2)}</strong>
          </div>
        </div>

        <p style="margin-top: 24px; text-align: center;">
          <a href="https://www.bigiawasaana.com/admin#catering" style="background: #FF4500; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Open Admin Panel & Convert to Quote
          </a>
        </p>
      </div>
    `;

    transporter.sendMail({
      from: `"Bigi Awasaana Catering" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
      to: 'bigiawasaanallc@gmail.com',
      replyTo: packageDoc.customerContact.email,
      subject: `New Catering Package Request [${requestNumber}] — ${packageDoc.customerContact.name}`,
      html: adminEmailHtml
    }).catch(err => console.error('Failed to send admin package email:', err));

    // Customer confirmation email
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0B0B; color: #f4f4f4; padding: 24px; border-radius: 8px; border: 1px solid #222;">
        <h2 style="color: #FF4500; margin: 0 0 12px;">Catering Package Request Received!</h2>
        <p>Dear ${packageDoc.customerContact.name},</p>
        <p>Thank you for choosing Bigi Awasaana for your upcoming event! We have received your custom catering package request.</p>
        <div style="background: #171717; padding: 14px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Request Reference Number:</strong> <span style="color: #FF4500; font-weight: bold;">${requestNumber}</span></p>
          <p style="margin: 6px 0 0 0;"><strong>Event Date:</strong> ${packageDoc.eventDetails.date} for ${packageDoc.eventDetails.guests} guests</p>
          <p style="margin: 6px 0 0 0;"><strong>Estimated Total:</strong> $${calc.estimatedTotal.toFixed(2)}</p>
        </div>
        <p>Our catering team will review your menu selections and date availability. We will prepare your official quote with a private proposal link shortly.</p>
        <p style="font-size: 12px; color: #888;">* Note: This is an estimated price. Final pricing and event date availability are confirmed once your formal quote is issued and secured with a deposit.</p>
        <hr style="border: none; border-top: 1px solid #222; margin: 20px 0;">
        <p style="font-size: 13px; color: #999; margin: 0;">
          Bigi Awasaana — 100% Zabiha Halal Afghan Charcoal Grill<br>
          18411 Victory Blvd, Reseda, CA 91335 &bull; (323) 921-1646
        </p>
      </div>
    `;

    transporter.sendMail({
      from: `"Bigi Awasaana Catering" <${process.env.GMAIL_EMAIL || 'bigiawasaanallc@gmail.com'}>`,
      to: packageDoc.customerContact.email,
      subject: `Your Bigi Awasaana Catering Package Request [${requestNumber}]`,
      html: customerEmailHtml
    }).catch(err => console.error('Failed to send customer confirmation email:', err));
  }

  return {
    success: true,
    requestId: docRef.id,
    requestNumber,
    estimatedTotal: calc.estimatedTotal
  };
});

/**
 * Callable: convertPackageRequestToQuote
 * Admin only: Converts an existing package request into an official quote in catering_quotes.
 */
exports.convertPackageRequestToQuote = functions.https.onCall(async (data, context) => {
  if (!isAdminContext(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Only administrators can convert packages to quotes.');
  }

  const { requestId, depositPercentage, customDiscount } = data;
  if (!requestId) {
    throw new functions.https.HttpsError('invalid-argument', 'requestId is required.');
  }

  const pkgRef = db.collection('catering_package_requests').doc(requestId);
  const pkgSnap = await pkgRef.get();
  if (!pkgSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Package request not found.');
  }

  const pkg = pkgSnap.data();
  if (pkg.linkedQuoteId) {
    // Already converted, return existing quote
    const existingQuoteSnap = await db.collection('catering_quotes').doc(pkg.linkedQuoteId).get();
    if (existingQuoteSnap.exists) {
      const q = existingQuoteSnap.data();
      return {
        success: true,
        alreadyConverted: true,
        quoteId: pkg.linkedQuoteId,
        quoteNumber: q.quoteNumber,
        token: q.token
      };
    }
  }

  const quoteNumber = generateQuoteNumber();
  const token = generateSecureToken();

  const foodSubtotal = Number(pkg.estimatedPriceBreakdown?.foodSubtotal) || 0;
  const servicesTotal = Number(pkg.estimatedPriceBreakdown?.servicesTotal) || 0;
  const deliveryFee = Number(pkg.estimatedPriceBreakdown?.deliveryFee) || 50;
  const discount = Math.max(0, Number(customDiscount) || 0);

  const taxable = Math.max(0, foodSubtotal + servicesTotal - discount);
  const tax = Math.round(taxable * 0.1025 * 100) / 100;
  const total = taxable + deliveryFee + tax;

  const depositPct = Math.min(100, Math.max(10, parseInt(depositPercentage, 10) || 30));
  const depositAmount = Math.round(total * (depositPct / 100) * 100) / 100;

  const newQuote = {
    quoteNumber,
    token,
    status: 'draft',
    packageRequestId: requestId,
    customer: {
      name: pkg.customerContact.name,
      phone: pkg.customerContact.phone,
      email: pkg.customerContact.email,
      company: ''
    },
    event: {
      title: `${pkg.eventDetails.type} Catering`,
      date: pkg.eventDetails.date,
      startTime: pkg.eventDetails.time || '17:00',
      endTime: '21:00',
      guests: pkg.eventDetails.guests,
      serviceType: pkg.eventDetails.fulfillment === 'delivery' ? 'buffet_dropoff' : 'pickup',
      location: {
        address: pkg.eventDetails.deliveryAddress || '18411 Victory Blvd, Reseda, CA 91335',
        notes: pkg.eventDetails.specialInstructions || ''
      }
    },
    items: (pkg.selectedItems || []).map(it => ({
      id: it.id,
      name: it.name,
      description: it.portionSize || '',
      imageUrl: it.imageUrl || '',
      portionSize: it.portionSize || '',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice
    })),
    pricing: {
      subtotal: foodSubtotal + servicesTotal,
      deliveryFee,
      setupFee: 0,
      taxRate: 0.1025,
      taxAmount: tax,
      discount,
      total,
      depositPercentage: depositPct,
      depositAmount,
      balanceDue: Math.max(0, total - depositAmount)
    },
    terms: {
      depositPercentage: depositPct,
      paymentTerms: `${depositPct}% deposit required to secure booking date. Remaining balance due on day of event.`,
      cancellationPolicy: 'Full refund of deposit if canceled 7 days prior to event.',
      customNotes: 'Includes Afghan flatbread, green cilantro chutney, and garlic yogurt sauce.'
    },
    activityLog: [
      {
        action: 'converted_from_package_request',
        timestamp: new Date().toISOString(),
        details: `Converted from Package Request ${pkg.requestNumber}`
      }
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const quoteRef = await db.collection('catering_quotes').add(newQuote);

  // Link quote to package request and mark as quoted
  await pkgRef.update({
    status: 'quoted',
    linkedQuoteId: quoteRef.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    success: true,
    quoteId: quoteRef.id,
    quoteNumber,
    token
  };
});
