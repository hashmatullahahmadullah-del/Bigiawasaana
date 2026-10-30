const { functions, admin, db } = require('./shared');
const nodemailer = require('nodemailer');
const {
  generateOrderReceiptEmail,
  generateOrderCancelledRefundedEmail,
  generateRestaurantOrderAlertEmail
} = require('./emailTemplate');

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

// ─────────────────────────────────────────────────────────────────
// Food Orders: onOrderCreatedEmail
// ─────────────────────────────────────────────────────────────────
exports.onOrderCreatedEmail = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderId = context.params.orderId;
    const order = snap.data();
    if (!order) return null;

    const transporter = getTransporter();
    if (!transporter) return null;

    const shortId = orderId.length > 8 ? orderId.slice(-6).toUpperCase() : orderId.toUpperCase();
    const customerEmail = (order.customerEmail || '').trim();
    const adminEmail = 'bigiawasaanallc@gmail.com';
    const senderEmail = `"Bigi Awasaana" <${adminEmail}>`;

    // 1. Send receipt to customer if customerEmail is provided
    if (customerEmail && customerEmail.includes('@')) {
      const customerMailOptions = {
        from: senderEmail,
        to: customerEmail,
        replyTo: adminEmail,
        subject: `Your Bigi Awasaana Order Receipt #${shortId}`,
        html: generateOrderReceiptEmail({ ...order, id: orderId }),
      };

      try {
        await transporter.sendMail(customerMailOptions);
        console.log(`Order receipt email sent to customer (${customerEmail}) for order ${orderId}`);
      } catch (err) {
        console.error(`Failed to send order receipt email to ${customerEmail}:`, err);
      }
    } else {
      console.log(`No valid customer email for order ${orderId}, skipping customer receipt email.`);
    }

    // 2. Send instant kitchen/manager alert to restaurant
    const total = typeof order.total === 'number' ? `$${order.total.toFixed(2)}` : (order.totalCents ? `$${(order.totalCents / 100).toFixed(2)}` : '$0.00');
    const adminMailOptions = {
      from: senderEmail,
      to: adminEmail,
      replyTo: customerEmail || adminEmail,
      subject: `NEW ORDER #${shortId} - ${order.customerName || 'Customer'} (${total})`,
      html: generateRestaurantOrderAlertEmail({ ...order, id: orderId }),
    };

    try {
      await transporter.sendMail(adminMailOptions);
      console.log(`New order alert email sent to restaurant for order ${orderId}`);
    } catch (err) {
      console.error('Failed to send new order alert to restaurant:', err);
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────────
// Food Orders: onOrderStatusUpdatedEmail
// Triggered when order status changes or a refund is recorded
// ─────────────────────────────────────────────────────────────────
exports.onOrderStatusUpdatedEmail = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const orderId = context.params.orderId;
    const before = change.before.data() || {};
    const after = change.after.data() || {};

    const transporter = getTransporter();
    if (!transporter) return null;

    const shortId = orderId.length > 8 ? orderId.slice(-6).toUpperCase() : orderId.toUpperCase();
    const customerEmail = (after.customerEmail || '').trim();
    const adminEmail = 'bigiawasaanallc@gmail.com';
    const senderEmail = `"Bigi Awasaana" <${adminEmail}>`;

    const wasCancelled = before.status === 'cancelled';
    const isCancelledNow = after.status === 'cancelled';
    const wasPartiallyRefunded = before.status === 'partially_refunded';
    const isPartiallyRefundedNow = after.status === 'partially_refunded';

    const beforeRefunded = before.refundedAmount || (before.refundedAmountCents ? before.refundedAmountCents / 100 : 0);
    const afterRefunded = after.refundedAmount || (after.refundedAmountCents ? after.refundedAmountCents / 100 : 0);
    const refundIncreased = afterRefunded > beforeRefunded && afterRefunded > 0;

    // Trigger if newly cancelled, newly partially refunded, or refund amount increased
    const shouldSendRefundNotice = (!wasCancelled && isCancelledNow) ||
      (!wasPartiallyRefunded && isPartiallyRefundedNow) ||
      refundIncreased;

    if (shouldSendRefundNotice && !after.refundEmailSentAt) {
      // 1. Send refund notification to customer
      if (customerEmail && customerEmail.includes('@')) {
        const mailOptions = {
          from: senderEmail,
          to: customerEmail,
          replyTo: adminEmail,
          subject: `Order #${shortId} Refund & Cancellation Notice - Bigi Awasaana`,
          html: generateOrderCancelledRefundedEmail({ ...after, id: orderId }),
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`Refund notice email sent to customer (${customerEmail}) for order ${orderId}`);
          // Prevent duplicate sends
          await change.after.ref.update({
            refundEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (err) {
          console.error(`Failed to send refund notice to customer ${customerEmail}:`, err);
        }
      }

      // 2. Alert restaurant
      const reason = after.cancellationReason || after.refundReason || 'Returned Goods';
      const adminMailOptions = {
        from: senderEmail,
        to: adminEmail,
        subject: `Order #${shortId} Cancelled / Refunded ($${afterRefunded.toFixed(2)}) - ${reason}`,
        html: `
          <div style="font-family: sans-serif; background: #111; color: #fff; padding: 20px;">
            <h2 style="color: #ef4444;">Order #${shortId} Cancelled / Refunded</h2>
            <p><strong>Customer:</strong> ${after.customerName || 'N/A'} (${after.customerPhone || 'N/A'})</p>
            <p><strong>Refund Amount:</strong> $${afterRefunded.toFixed(2)}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Original Total:</strong> $${(after.total || 0).toFixed(2)}</p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(adminMailOptions);
      } catch (adminErr) {
        console.error('Failed to send admin refund notice:', adminErr);
      }
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────────
// Retail Orders: onRetailOrderCreatedEmail
// ─────────────────────────────────────────────────────────────────
exports.onRetailOrderCreatedEmail = functions.firestore
  .document('retail_orders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderId = context.params.orderId;
    const order = snap.data();
    if (!order) return null;

    const transporter = getTransporter();
    if (!transporter) return null;

    const shortId = orderId.length > 8 ? orderId.slice(-6).toUpperCase() : orderId.toUpperCase();
    const customerEmail = (order.customerEmail || '').trim();
    const adminEmail = 'bigiawasaanallc@gmail.com';
    const senderEmail = `"Bigi Awasaana Shop" <${adminEmail}>`;

    if (customerEmail && customerEmail.includes('@')) {
      const mailOptions = {
        from: senderEmail,
        to: customerEmail,
        replyTo: adminEmail,
        subject: `Bigi Awasaana Shop Order Receipt #${shortId}`,
        html: generateOrderReceiptEmail({
          ...order,
          id: orderId,
          pickup: { type: 'shipping' },
        }),
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Retail order receipt email sent to ${customerEmail} for order ${orderId}`);
      } catch (err) {
        console.error(`Failed to send retail receipt email to ${customerEmail}:`, err);
      }
    }

    // Alert restaurant
    const total = typeof order.total === 'number' ? `$${order.total.toFixed(2)}` : '$0.00';
    try {
      await transporter.sendMail({
        from: senderEmail,
        to: adminEmail,
        subject: `NEW NATIONWIDE SHIPPING ORDER #${shortId} - ${order.customerName || 'Customer'} (${total})`,
        html: `
          <div style="font-family: sans-serif; background: #111; color: #fff; padding: 20px;">
            <h2 style="color: #ff4500;">New Nationwide Shipping Order #${shortId}</h2>
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Phone:</strong> ${order.customerPhone}</p>
            <p><strong>Address:</strong> ${order.address}, ${order.city}, ${order.state} ${order.zip}</p>
            <p><strong>Total:</strong> ${total}</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Failed to send retail admin alert:', err);
    }

    return null;
  });
