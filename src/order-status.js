import { app, db } from './firebase.js';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import { iconFileText, iconPhone, iconRefresh, iconStar, iconUtensils } from './icons.js';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const token = urlParams.get('token');

  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const mainContent = document.getElementById('main-content');
  const errorMsg = document.getElementById('error-msg');

  if (!orderId || !token) {
    showError("Invalid tracking link. Missing order ID or token.");
    return;
  }

  const orderRef = doc(db, 'orders', orderId);
  let previousStatus = null;

  onSnapshot(orderRef, (docSnap) => {
    if (!docSnap.exists()) {
      showError("We couldn't find an order with this link.");
      return;
    }

    const order = docSnap.data();


    // Trigger local HTML5 notification if status changes to ready
    if (previousStatus && previousStatus !== 'ready' && order.status === 'ready') {
      if (Notification.permission === 'granted') {
        new Notification('Order Ready for Pickup!', {
          body: 'Your Bigi Awasaana order is ready. Come and get it!',
          icon: '/android-chrome-192x192.png'
        });
      }
    }
    previousStatus = order.status;

    // Security check: verify token
    if (order.accessToken !== token) {
      showError("Unauthorized. Invalid access token.");
      return;
    }

    renderOrder(orderId, order);
    
    // Request push notification permissions
    if (order.status !== 'completed') {
      setupPushNotifications(orderId, order.fcmToken);
    }
    
  }, (err) => {
    console.error("Firebase read error:", err);
    showError("Failed to connect to real-time updates. Please refresh the page.");
  });

  async function setupPushNotifications(orderId, existingToken) {
    try {
      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // You would normally pass a VAPID key to getToken: getToken(messaging, { vapidKey: '...' })
        // If omitted, Firebase uses the default project sender ID.
        const currentToken = await getToken(messaging);
        if (currentToken && currentToken !== existingToken) {
          const orderRef = doc(db, 'orders', orderId);
  let previousStatus = null;
          await updateDoc(orderRef, { fcmToken: currentToken });

        }
      }
    } catch (err) {

      // Silent fail
    }
  }

  function showError(msg) {
    loadingState.style.display = 'none';
    mainContent.style.display = 'none';
    errorState.style.display = 'block';
    errorMsg.textContent = msg;
  }

  function renderOrder(id, order) {
    loadingState.style.display = 'none';
    mainContent.style.display = 'flex';

    // Populate data
    document.getElementById('order-customer').textContent = order.customerName || 'Guest';
    document.getElementById('order-id').textContent = '#' + id.slice(-4).toUpperCase();
    
    const gross = typeof order.total === 'number' ? order.total : (parseFloat(order.total) || 0);
    const refund = Number(order.refundedAmount || (order.refundedAmountCents ? order.refundedAmountCents / 100 : 0) || 0);
    const net = Math.max(0, gross - refund);
    if (refund > 0) {
      document.getElementById('order-total').innerHTML = `$${net.toFixed(2)} <span style="font-size: 13px; color: #ef4444; text-decoration: line-through; margin-left: 6px;">$${gross.toFixed(2)}</span>`;
    } else {
      document.getElementById('order-total').textContent = `$${gross.toFixed(2)}`;
    }

    const itemsContainer = document.getElementById('order-items');
    itemsContainer.innerHTML = '';
    (order.items || []).forEach(item => {
      const li = document.createElement('li');
      li.className = 'item-row';
      li.innerHTML = `
        <div>
          <span class="item-qty">${item.quantity || item.qty || 1}×</span>
          <span style="color: var(--white);">${item.name}</span>
        </div>
      `;
      itemsContainer.appendChild(li);
    });

    if (order.returns && Array.isArray(order.returns) && order.returns.length > 0) {
      order.returns.forEach(ret => {
        const li = document.createElement('li');
        li.className = 'item-row';
        li.style.cssText = 'color: #fca5a5; font-size: 13px; border-left: 2px solid #ef4444; padding-left: 8px; margin-top: 4px;';
        const itemNames = (ret.items || []).map(i => `${i.quantity || 1}× ${i.name}`).join(', ');
        li.innerHTML = `<div><span>↩️ Refunded: ${itemNames || 'Item'}</span> <strong style="color: #ef4444;">(-$${(ret.amount || 0).toFixed(2)})</strong></div>`;
        itemsContainer.appendChild(li);
      });
    }

    // Update UI based on status
    const statusMap = {
      'pending': { step: 1, title: 'Preparing', desc: "We've received your order and are getting it ready.", fill: '0%' },
      'preparing': { step: 1, title: 'Preparing', desc: "Your food is being freshly prepared in the kitchen.", fill: '15%' },
      'ready': { step: 2, title: 'Ready for Pickup', desc: "Your order is hot and ready at the counter!", fill: '50%', theme: 'ready' },
      'completed': { step: 3, title: 'Thank You!', desc: "We hope you enjoy your meal. Come again soon!", fill: '100%', theme: 'ready' },
      'refunded': { step: 3, title: 'Order Refunded', desc: "This order has been refunded to your original payment method.", fill: '100%', theme: 'cancelled' },
      'partially_refunded': { step: 3, title: 'Partially Refunded', desc: "One or more items in this order have been refunded.", fill: '100%', theme: 'ready' },
      'cancelled': { step: 3, title: 'Order Cancelled', desc: "This order has been cancelled and refunded.", fill: '100%', theme: 'cancelled' }
    };

    const state = statusMap[order.status] || statusMap['pending'];

    document.getElementById('status-title').textContent = state.title;
    document.getElementById('status-desc').textContent = state.desc;
    document.getElementById('progress-fill').style.width = state.fill;

    // Cancellation & Refund Alerts
    const cancelCard = document.getElementById('cancellation-alert-card');
    const partialCard = document.getElementById('partial-refund-alert-card');
    const progressContainer = document.getElementById('progress-container');
    const cardInfo = order.cardBrand ? `${order.cardBrand} ending in •••• ${order.cardLast4}` : 'your original payment method';

    if (order.status === 'cancelled' || order.status === 'refunded') {
      if (progressContainer) progressContainer.style.display = 'none';
      if (partialCard) partialCard.style.display = 'none';
      if (cancelCard) {
        cancelCard.style.display = 'block';
        const cancelTitle = document.getElementById('cancellation-alert-title');
        const reasonText = document.getElementById('cancellation-reason-text');
        const refundText = document.getElementById('refund-details-text');

        if (cancelTitle) {
          cancelTitle.textContent = order.status === 'refunded' ? 'Order Refunded' : 'Order Cancelled & Refunded';
        }
        if (reasonText) {
          reasonText.textContent = order.cancellationReason || order.refundReason || 'Order cancelled by restaurant.';
        }
        if (refundText) {
          const refundAmt = refund > 0 ? refund : gross;
          refundText.textContent = `A full refund of $${refundAmt.toFixed(2)} has been issued to ${cardInfo}. Depending on your bank, it may take 2–7 business days to reflect on your statement.`;
        }
      }

      // Add convenient buttons for the customer
      const postActions = document.getElementById('post-order-actions');
      if (postActions) {
        postActions.innerHTML = `
          <a href="/menu" class="btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 8px; text-align: center; text-decoration: none; padding: 14px; font-weight: 700; border-radius: 8px; font-size: 16px;">
            ${iconUtensils(18)} Order Something Else
          </a>
          <a href="tel:8184574545" class="btn-outline" style="display: flex; align-items: center; justify-content: center; gap: 8px; text-align: center; text-decoration: none; padding: 12px; font-weight: 600; border-radius: 8px; font-size: 14px;">
            ${iconPhone(16)} Questions? Call Us: (818) 457-4545
          </a>
        `;
      }
    } else if (order.status === 'partially_refunded' || refund > 0) {
      if (cancelCard) cancelCard.style.display = 'none';
      if (partialCard) {
        partialCard.style.display = 'block';
        const pReasonText = document.getElementById('partial-refund-reason-text');
        const pRefundText = document.getElementById('partial-refund-details-text');
        if (pReasonText) {
          pReasonText.textContent = order.refundReason || order.cancellationReason || 'Item unavailable / returned';
        }
        if (pRefundText) {
          pRefundText.textContent = `A refund of $${refund.toFixed(2)} has been credited back to ${cardInfo}.`;
        }
      }
      if (progressContainer) progressContainer.style.display = 'block';
    } else {
      if (cancelCard) cancelCard.style.display = 'none';
      if (partialCard) partialCard.style.display = 'none';
      if (progressContainer) progressContainer.style.display = 'block';
    }

    // Theme update
    if (state.theme === 'ready') {
      document.body.classList.remove('theme-cancelled');
      document.body.classList.add('theme-ready');
    } else if (state.theme === 'cancelled') {
      document.body.classList.remove('theme-ready');
      document.body.classList.add('theme-cancelled');
    } else {
      document.body.classList.remove('theme-ready', 'theme-cancelled');
    }

    // Step classes
    [1, 2, 3].forEach(stepNum => {
      const stepEl = document.getElementById(`step-${stepNum}`);
      stepEl.classList.remove('active', 'completed-step');
      
      if (stepNum < state.step) {
        stepEl.classList.add('completed-step');
      } else if (stepNum === state.step) {
        stepEl.classList.add('active');
      }
    });

    // Wait time logic
    const waitContainer = document.getElementById('wait-time-container');
    const waitText = document.getElementById('wait-time-text');
    
    if (order.status === 'pending' || order.status === 'preparing') {
      if (order.estimatedReadyAt) {
        // Handle Firestore timestamp or standard date
        const readyTime = order.estimatedReadyAt.toDate ? order.estimatedReadyAt.toDate() : new Date(order.estimatedReadyAt);
        const now = new Date();
        const diffMins = Math.ceil((readyTime - now) / 60000);
        
        if (diffMins > 0) {
          waitText.textContent = `Ready in ~${diffMins} minutes`;
          waitContainer.style.display = 'block';
        } else {
          waitText.textContent = `Ready very soon`;
          waitContainer.style.display = 'block';
        }
      } else {
        waitContainer.style.display = 'none';
      }
    } else {
      waitContainer.style.display = 'none';
    }

    // Post-order engagement & Reorder actions
    const actionsContainer = document.getElementById('post-order-actions');
    if (actionsContainer) {
      const phoneParam = order.customerPhone ? `?phone=${encodeURIComponent(order.customerPhone)}` : '';
      let actionsHtml = `
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="/menu?reorder=${encodeURIComponent(id)}" class="btn-primary" style="flex: 1; text-align: center; text-decoration: none; padding: 12px 16px; font-size: 15px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--primary); color: var(--dark);">
            ${iconRefresh(16)} Reorder This Meal
          </a>
          <a href="/order-history.html${phoneParam}" class="btn-outline" style="flex: 1; text-align: center; text-decoration: none; padding: 12px 16px; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--border); color: var(--white); background: var(--surface);">
            ${iconFileText(16)} My Past Orders
          </a>
        </div>
      `;

      if (order.status === 'completed' || order.status === 'ready') {
        const starIcons = Array(5).fill(iconStar(20, 'ui-icon ui-icon-no-margin', '#f9a825')).join('');
        actionsHtml += `
          <div style="background: rgba(230, 81, 0, 0.08); border: 1px solid rgba(230, 81, 0, 0.3); border-radius: 8px; padding: 16px; text-align: center; margin-top: 8px;">
            <div style="display: flex; justify-content: center; gap: 4px; margin-bottom: 8px; color: #f9a825;">${starIcons}</div>
            <h4 style="font-family: 'Barlow Condensed'; font-size: 18px; margin: 0 0 6px 0; color: var(--white); text-transform: uppercase;">Enjoyed your meal?</h4>
            <p style="font-size: 13px; color: var(--gray); margin: 0 0 12px 0;">Your review helps our family business grow!</p>
            <a href="/review.html" target="_blank" rel="noopener" style="display: inline-block; background: var(--accent); color: var(--white); padding: 8px 20px; border-radius: 4px; font-weight: 700; font-size: 13px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">
              Leave a Google Review
            </a>
          </div>
        `;
      }

      actionsContainer.innerHTML = actionsHtml;
    }
  }
});
