/**
 * Generates an HTML email for Catering Inquiries matching the Bigi Awasaana UI
 * @param {Object} data - The catering inquiry data
 */
exports.generateCateringEmail = (data) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Catering Inquiry</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d0d0d;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0d0d0d;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #333333;
    }
    .header {
      background-color: #000000;
      padding: 30px;
      text-align: center;
      border-bottom: 2px solid #ff4500;
    }
    .header img {
      height: 60px;
      width: auto;
    }
    .content {
      padding: 40px 30px;
    }
    .title {
      color: #ff4500;
      font-size: 24px;
      font-weight: bold;
      margin-top: 0;
      margin-bottom: 30px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .detail-card {
      background-color: #222222;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .detail-row {
      margin-bottom: 16px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888888;
      margin-bottom: 4px;
      display: block;
    }
    .detail-value {
      font-size: 18px;
      color: #ffffff;
      margin: 0;
      font-weight: 500;
    }
    .message-box {
      background-color: #2a2a2a;
      border-left: 4px solid #ff4500;
      padding: 16px;
      color: #dddddd;
      font-style: italic;
      line-height: 1.6;
      border-radius: 0 4px 4px 0;
    }
    .footer {
      background-color: #000000;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #333333;
    }
    .footer p {
      color: #888888;
      font-size: 12px;
      margin: 0;
    }
    .footer a {
      color: #ff4500;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      background-color: #ff4500;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://www.bigiawasaana.com" target="_blank">
          <!-- Always use absolute URLs in emails -->
          <img src="https://www.bigiawasaana.com/logo.webp" alt="Bigi Awasaana">
        </a>
      </div>
      
      <div class="content">
        <h1 class="title">New Catering Inquiry</h1>
        
        <div class="detail-card">
          <div class="detail-row">
            <span class="detail-label">Name</span>
            <p class="detail-value">${data.name}</p>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <p class="detail-value">
              <a href="mailto:${data.email}" style="color: #ff4500; text-decoration: none;">${data.email}</a>
            </p>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Phone</span>
            <p class="detail-value">
              <a href="tel:${data.phone}" style="color: #ffffff; text-decoration: none;">${data.phone}</a>
            </p>
          </div>
        </div>

        <div class="detail-card">
          <div class="detail-row">
            <span class="detail-label">Event Date</span>
            <p class="detail-value">${data.date}</p>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Number of Guests</span>
            <p class="detail-value">${data.guests}</p>
          </div>
        </div>

        ${data.details ? `
        <div class="detail-row">
          <span class="detail-label">Event Details / Requests</span>
          <div class="message-box">
            ${data.details}
          </div>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="mailto:${data.email}" class="button">Reply to Customer</a>
        </div>
      </div>
      
      <div class="footer">
        <p>This automated email was sent from the <a href="https://www.bigiawasaana.com/catering.html">Bigi Awasaana Catering Form</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

function formatMoney(num) {
  const n = typeof num === 'number' && !isNaN(num) ? num : parseFloat(num || 0);
  return '$' + (isNaN(n) ? '0.00' : n.toFixed(2));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an HTML email receipt for customer orders
 * @param {Object} order - The order document
 */
exports.generateOrderReceiptEmail = (order) => {
  const orderId = order.squareOrderId || order.id || 'N/A';
  const shortId = orderId.length > 8 ? orderId.slice(-6).toUpperCase() : orderId.toUpperCase();
  const customerName = escapeHtml(order.customerName || 'Valued Guest');
  const items = Array.isArray(order.items) ? order.items : [];
  
  const subtotal = formatMoney(order.subtotal ?? (order.subtotalCents ? order.subtotalCents / 100 : 0));
  const discount = order.discount || order.discountCents ? formatMoney(order.discount ?? (order.discountCents / 100)) : null;
  const tax = formatMoney(order.tax ?? (order.taxCents ? order.taxCents / 100 : 0));
  const tip = order.tip || order.tipCents ? formatMoney(order.tip ?? (order.tipCents / 100)) : null;
  const total = formatMoney(order.total ?? (order.totalCents ? order.totalCents / 100 : 0));

  const pickupType = order.pickup?.type || 'asap';
  const isScheduled = pickupType === 'scheduled';
  let pickupDesc = 'ASAP Pickup (~15–20 min)';
  if (isScheduled) {
    const rawTime = order.pickup?.time || order.pickup?.pickupTime;
    if (rawTime) {
      try {
        const d = new Date(rawTime);
        pickupDesc = 'Scheduled: ' + d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } catch (e) {
        pickupDesc = `Scheduled: ${rawTime}`;
      }
    } else {
      pickupDesc = 'Scheduled Pickup';
    }
  }

  const statusUrl = `https://www.bigiawasaana.com/order-status.html?orderId=${orderId}&token=${order.accessToken || ''}`;
  const cardInfo = order.cardLast4 ? `${order.cardBrand || 'Card'} ending in ${order.cardLast4}` : 'Credit / Debit Card';

  const itemsHtml = items.map(item => {
    const qty = item.quantity || item.qty || 1;
    const price = formatMoney((item.price || 0) * qty);
    const variant = item.selectedVariant ? `<div style="font-size: 13px; color: #ff9966;">Option: ${escapeHtml(item.selectedVariant)}</div>` : '';
    const addOns = Array.isArray(item.selectedAddOns) && item.selectedAddOns.length > 0
      ? `<div style="font-size: 12px; color: #aaaaaa;">Add-ons: ${item.selectedAddOns.map(a => escapeHtml(a.name || a)).join(', ')}</div>`
      : '';
    const meal = item.isMeal ? `<div style="font-size: 12px; color: #f9a825;">+ Upgraded to Combo Meal</div>` : '';

    return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a2a; vertical-align: top;">
          <div style="font-weight: 600; color: #ffffff; font-size: 15px;">${qty}x ${escapeHtml(item.name || 'Menu Item')}</div>
          ${variant}
          ${addOns}
          ${meal}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a2a; vertical-align: top; text-align: right; font-weight: 600; color: #ffffff; font-size: 15px;">
          ${price}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Bigi Awasaana Order Receipt #${shortId}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #0d0d0d; padding: 32px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161616; border-radius: 12px; overflow: hidden; border: 1px solid #262626; }
    .header { background-color: #000000; padding: 24px 30px; text-align: center; border-bottom: 2px solid #ff4500; }
    .header img { height: 50px; width: auto; }
    .content { padding: 32px 30px; }
    .badge-confirmed { display: inline-block; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .title { color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: 0.5px; }
    .subtitle { color: #aaaaaa; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0; }
    .card { background-color: #202020; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #2f2f2f; }
    .card-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #ff4500; margin-bottom: 12px; font-weight: 700; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .info-label { color: #888888; }
    .info-val { color: #ffffff; font-weight: 500; text-align: right; }
    .button-track { display: inline-block; background-color: #ff4500; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; text-align: center; width: 100%; box-sizing: border-box; }
    .footer { background-color: #000000; padding: 24px 30px; text-align: center; border-top: 1px solid #262626; color: #777777; font-size: 12px; }
    .footer a { color: #ff4500; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://www.bigiawasaana.com" target="_blank">
          <img src="https://www.bigiawasaana.com/logo.webp" alt="Bigi Awasaana">
        </a>
      </div>

      <div class="content">
        <div style="text-align: center;">
          <span class="badge-confirmed">Order Confirmed</span>
          <h1 class="title">Thanks for your order, ${customerName}!</h1>
          <p class="subtitle">We've received your order and our chefs are firing up the grill. Here is your receipt.</p>
        </div>

        <!-- Pickup Info Card -->
        <div class="card">
          <div class="card-title">Pickup Details</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            <tr>
              <td style="color: #888888; padding: 4px 0;">Order Number:</td>
              <td style="color: #ffffff; font-weight: 700; text-align: right; padding: 4px 0;">#${shortId}</td>
            </tr>
            <tr>
              <td style="color: #888888; padding: 4px 0;">Pickup Time:</td>
              <td style="color: #4ade80; font-weight: 700; text-align: right; padding: 4px 0;">${pickupDesc}</td>
            </tr>
            <tr>
              <td style="color: #888888; padding: 4px 0;">Location:</td>
              <td style="color: #ffffff; font-weight: 500; text-align: right; padding: 4px 0;">18411 Victory Blvd, Reseda, CA</td>
            </tr>
            <tr>
              <td style="color: #888888; padding: 4px 0;">Payment Method:</td>
              <td style="color: #ffffff; font-weight: 500; text-align: right; padding: 4px 0;">${escapeHtml(cardInfo)}</td>
            </tr>
          </table>
        </div>

        <!-- Items Card -->
        <div class="card">
          <div class="card-title">Order Summary</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; font-size: 14px;">
            <tr>
              <td style="color: #888888; padding: 4px 0;">Subtotal</td>
              <td style="color: #ffffff; text-align: right; padding: 4px 0;">${subtotal}</td>
            </tr>
            ${discount ? `
            <tr>
              <td style="color: #4ade80; padding: 4px 0;">Discount</td>
              <td style="color: #4ade80; text-align: right; padding: 4px 0;">-${discount}</td>
            </tr>` : ''}
            <tr>
              <td style="color: #888888; padding: 4px 0;">Sales Tax</td>
              <td style="color: #ffffff; text-align: right; padding: 4px 0;">${tax}</td>
            </tr>
            ${tip ? `
            <tr>
              <td style="color: #888888; padding: 4px 0;">Tip</td>
              <td style="color: #ffffff; text-align: right; padding: 4px 0;">${tip}</td>
            </tr>` : ''}
            <tr>
              <td style="color: #ffffff; font-size: 18px; font-weight: 800; padding: 12px 0 0 0; border-top: 1px solid #333333;">Total Paid</td>
              <td style="color: #ff4500; font-size: 18px; font-weight: 800; text-align: right; padding: 12px 0 0 0; border-top: 1px solid #333333;">${total}</td>
            </tr>
          </table>
        </div>

        <!-- Live Tracker Button -->
        <div style="margin-top: 28px; text-align: center;">
          <a href="${statusUrl}" class="button-track" target="_blank">Track Order Status Live →</a>
          <p style="font-size: 12px; color: #888888; margin-top: 12px;">You can view live kitchen progress, estimated pickup countdown, and order details at any time.</p>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0 0 8px 0; color: #ffffff; font-weight: 600;">Bigi Awasaana • 100% Halal Afghan Cuisine</p>
        <p style="margin: 0 0 8px 0;">18411 Victory Blvd, Reseda, CA 91335 | Phone: <a href="tel:+13239211646">(323) 921-1646</a></p>
        <p style="margin: 0;">Have a question about your order? Reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generates an HTML email notification when an order is cancelled or refunded
 * @param {Object} order - The order document
 */
exports.generateOrderCancelledRefundedEmail = (order) => {
  const orderId = order.squareOrderId || order.id || 'N/A';
  const shortId = orderId.length > 8 ? orderId.slice(-6).toUpperCase() : orderId.toUpperCase();
  const customerName = escapeHtml(order.customerName || 'Valued Guest');
  
  const refundAmount = order.refundedAmount || (order.refundedAmountCents ? order.refundedAmountCents / 100 : order.total || 0);
  const refundFormatted = formatMoney(refundAmount);
  const totalFormatted = formatMoney(order.total ?? (order.totalCents ? order.totalCents / 100 : 0));
  const reason = escapeHtml(order.cancellationReason || order.refundReason || 'Returned Goods / Cancelled on Square');
  const cardInfo = order.cardLast4 ? `${order.cardBrand || 'Card'} ending in ${order.cardLast4}` : 'your original payment method';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order #${shortId} Refund & Cancellation Notice</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #0d0d0d; padding: 32px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161616; border-radius: 12px; overflow: hidden; border: 1px solid #262626; }
    .header { background-color: #000000; padding: 24px 30px; text-align: center; border-bottom: 2px solid #ef4444; }
    .header img { height: 50px; width: auto; }
    .content { padding: 32px 30px; }
    .badge-refund { display: inline-block; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .title { color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 10px 0; }
    .subtitle { color: #aaaaaa; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0; }
    .card { background-color: #202020; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #2f2f2f; }
    .card-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #f87171; margin-bottom: 12px; font-weight: 700; }
    .refund-highlight { background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 6px 6px 0; margin-bottom: 20px; }
    .footer { background-color: #000000; padding: 24px 30px; text-align: center; border-top: 1px solid #262626; color: #777777; font-size: 12px; }
    .footer a { color: #ff4500; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://www.bigiawasaana.com" target="_blank">
          <img src="https://www.bigiawasaana.com/logo.webp" alt="Bigi Awasaana">
        </a>
      </div>

      <div class="content">
        <div style="text-align: center;">
          <span class="badge-refund">Order Cancelled & Refunded</span>
          <h1 class="title">Refund Issued for Order #${shortId}</h1>
          <p class="subtitle">Hello ${customerName}, your order has been cancelled and a refund has been issued.</p>
        </div>

        <div class="refund-highlight">
          <div style="font-size: 12px; text-transform: uppercase; color: #f87171; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">Refund Details</div>
          <div style="font-size: 26px; font-weight: 800; color: #ffffff;">${refundFormatted}</div>
          <div style="font-size: 13px; color: #cccccc; margin-top: 6px;">Reason: <strong>${reason}</strong></div>
        </div>

        <div class="card">
          <div class="card-title">Order & Refund Summary</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            <tr>
              <td style="color: #888888; padding: 6px 0;">Order Reference:</td>
              <td style="color: #ffffff; font-weight: 700; text-align: right; padding: 6px 0;">#${shortId}</td>
            </tr>
            <tr>
              <td style="color: #888888; padding: 6px 0;">Original Total:</td>
              <td style="color: #ffffff; text-align: right; padding: 6px 0;">${totalFormatted}</td>
            </tr>
            <tr>
              <td style="color: #888888; padding: 6px 0;">Refund Amount:</td>
              <td style="color: #4ade80; font-weight: 700; text-align: right; padding: 6px 0;">${refundFormatted}</td>
            </tr>
            <tr>
              <td style="color: #888888; padding: 6px 0;">Refunded To:</td>
              <td style="color: #ffffff; font-weight: 500; text-align: right; padding: 6px 0;">${escapeHtml(cardInfo)}</td>
            </tr>
            <tr>
              <td style="color: #888888; padding: 6px 0;">Expected Processing:</td>
              <td style="color: #fbbf24; font-weight: 500; text-align: right; padding: 6px 0;">2–7 Business Days</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 16px; border: 1px solid #2a2a2a; font-size: 13px; color: #aaaaaa; line-height: 1.6;">
          <strong style="color: #ffffff;">When will I see the refund?</strong><br>
          Depending on your bank or credit card issuer, the refunded funds usually reflect on your statement within <strong>2 to 7 business days</strong>. If you do not see the credit after 7 days, please contact your financial institution or reach out to us.
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0 0 8px 0; color: #ffffff; font-weight: 600;">Bigi Awasaana • Halal Afghan Cuisine</p>
        <p style="margin: 0 0 8px 0;">Questions? Reply directly to this email or call <a href="tel:+13239211646">(323) 921-1646</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generates an internal HTML email alert to the restaurant kitchen / manager
 * @param {Object} order - The order document
 */
exports.generateRestaurantOrderAlertEmail = (order) => {
  const orderId = order.squareOrderId || order.id || 'N/A';
  const shortId = orderId.length > 8 ? orderId.slice(-6).toUpperCase() : orderId.toUpperCase();
  const customerName = escapeHtml(order.customerName || 'Customer');
  const customerPhone = escapeHtml(order.customerPhone || 'N/A');
  const items = Array.isArray(order.items) ? order.items : [];
  const total = formatMoney(order.total ?? (order.totalCents ? order.totalCents / 100 : 0));
  
  const pickupType = order.pickup?.type || 'asap';
  const isScheduled = pickupType === 'scheduled';
  let pickupDesc = 'ASAP Pickup (~15–20 min)';
  if (isScheduled) {
    const rawTime = order.pickup?.time || order.pickup?.pickupTime;
    pickupDesc = `SCHEDULED: ${rawTime || 'Later'}`;
  }

  const itemsList = items.map(i => {
    const qty = i.quantity || i.qty || 1;
    const variant = i.selectedVariant ? ` (${escapeHtml(i.selectedVariant)})` : '';
    const addOns = Array.isArray(i.selectedAddOns) && i.selectedAddOns.length > 0 ? ` + ${i.selectedAddOns.map(a => escapeHtml(a.name || a)).join(', ')}` : '';
    const meal = i.isMeal ? ' [COMBO MEAL]' : '';
    return `<li style="margin-bottom: 8px;"><strong>${qty}x ${escapeHtml(i.name)}</strong>${variant}${addOns}${meal}</li>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Order #${shortId}</title>
</head>
<body style="background: #111; color: #fff; font-family: sans-serif; padding: 24px;">
  <div style="max-width: 550px; margin: 0 auto; background: #1c1c1c; border-radius: 8px; padding: 24px; border: 1px solid #333;">
    <h2 style="color: #ff4500; margin-top: 0;">NEW ORDER #${shortId} (${total})</h2>
    <div style="background: ${isScheduled ? '#1e3a8a' : '#14532d'}; padding: 12px; border-radius: 6px; font-weight: bold; margin-bottom: 16px; font-size: 16px;">
      ${pickupDesc}
    </div>
    <p><strong>Customer:</strong> ${customerName}</p>
    <p><strong>Phone:</strong> <a href="tel:${customerPhone}" style="color: #f9a825;">${customerPhone}</a></p>
    <p><strong>Items:</strong></p>
    <ul style="line-height: 1.6; padding-left: 20px;">
      ${itemsList}
    </ul>
    <p><strong>Total:</strong> ${total}</p>
    <div style="margin-top: 24px;">
      <a href="https://www.bigiawasaana.com/admin?view=live-orders#live-orders-view" style="background: #ff4500; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Open Order Manager →</a>
    </div>
  </div>
</body>
</html>
  `;
};
