import { app, db } from './firebase.js';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

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

  onSnapshot(orderRef, (docSnap) => {
    if (!docSnap.exists()) {
      showError("We couldn't find an order with this link.");
      return;
    }

    const order = docSnap.data();
    console.log("Firestore order status:", order.status);

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
          await updateDoc(orderRef, { fcmToken: currentToken });
          console.log('FCM token saved for order notifications');
        }
      }
    } catch (err) {
      console.log('Push notifications not enabled or failed:', err);
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
    document.getElementById('order-total').textContent = `$${(order.total || 0).toFixed(2)}`;

    const itemsContainer = document.getElementById('order-items');
    itemsContainer.innerHTML = '';
    (order.items || []).forEach(item => {
      const li = document.createElement('li');
      li.className = 'item-row';
      li.innerHTML = `
        <div>
          <span class="item-qty">${item.quantity}×</span>
          <span style="color: var(--white);">${item.name}</span>
        </div>
      `;
      itemsContainer.appendChild(li);
    });

    // Update UI based on status
    const statusMap = {
      'pending': { step: 1, title: 'Preparing', desc: "We've received your order and are getting it ready.", fill: '0%' },
      'preparing': { step: 1, title: 'Preparing', desc: "Your food is being freshly prepared in the kitchen.", fill: '15%' },
      'ready': { step: 2, title: 'Ready for Pickup', desc: "Your order is hot and ready at the counter!", fill: '50%', theme: 'ready' },
      'completed': { step: 3, title: 'Thank You!', desc: "We hope you enjoy your meal. Come again soon!", fill: '100%', theme: 'ready' }
    };

    const state = statusMap[order.status] || statusMap['pending'];

    document.getElementById('status-title').textContent = state.title;
    document.getElementById('status-desc').textContent = state.desc;
    document.getElementById('progress-fill').style.width = state.fill;

    // Theme update
    if (state.theme === 'ready') {
      document.body.classList.add('theme-ready');
    } else {
      document.body.classList.remove('theme-ready');
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
  }
});
