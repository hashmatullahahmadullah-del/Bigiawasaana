import { db } from './firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';

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

    // Security check: verify token
    if (order.accessToken !== token) {
      showError("Unauthorized. Invalid access token.");
      return;
    }

    renderOrder(orderId, order);
  }, (err) => {
    console.error("Firebase read error:", err);
    showError("Failed to connect to real-time updates. Please refresh the page.");
  });

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
  }
});
