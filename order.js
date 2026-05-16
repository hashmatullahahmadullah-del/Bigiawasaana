
import { db } from './src/firebase.js';
import { doc, onSnapshot } from "firebase/firestore";

const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('id');
const DEFAULT_PREP_MINUTES = 20;

// DOM
const statusText = document.getElementById('status-text');
const statusBanner = document.getElementById('status-banner');
const progressFill = document.getElementById('progress-fill');
const countdownEl = document.getElementById('countdown');
const countdownSection = document.getElementById('countdown-section');
const readyBanner = document.getElementById('ready-banner');
const itemsList = document.getElementById('items-list');
const orderTotal = document.getElementById('order-total');
const errorState = document.getElementById('error-state');

if (!orderId) {
  showError();
} else {
  trackOrder(orderId);
}

function showError() {
  if (errorState) errorState.style.display = 'block';
  if (statusBanner) statusBanner.style.display = 'none';
  const steps = document.querySelector('.steps');
  if (steps) steps.style.display = 'none';
  if (countdownSection) countdownSection.style.display = 'none';
  const summary = document.querySelector('.summary-card');
  if (summary) summary.style.display = 'none';
}

function trackOrder(id) {
  const orderRef = doc(db, "orders", id);
  
  onSnapshot(orderRef, (docSnap) => {
    if (!docSnap.exists()) { showError(); return; }

    const order = docSnap.data();
    
    const nameDisplay = document.getElementById('customer-name-display');
    if (nameDisplay && order.customerName) {
      nameDisplay.textContent = `ORDER FOR: ${order.customerName}`;
      nameDisplay.style.display = 'block';
    }

    updateStatus(order);
    renderItems(order);
    updateCountdown(order);

    // Browser notification when ready
    if (order.status === 'ready') {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Bigi Awasaana', { body: 'Your order is ready for pickup.' });
      }
    }
  }, () => showError());
}

function updateStatus(order) {
  const status = order.status || 'pending';

  const config = {
    pending:   { text: 'ORDER RECEIVED',     fill: '0%',  steps: ['active', '', ''] },
    preparing: { text: 'BEING PREPARED',     fill: '40%', steps: ['done', 'active', ''] },
    ready:     { text: 'READY FOR PICKUP',   fill: '80%', steps: ['done', 'done', 'active'] },
    completed: { text: 'ORDER COMPLETE',     fill: '80%', steps: ['done', 'done', 'done'] }
  };

  const s = config[status] || config.pending;

  if (statusText) statusText.textContent = s.text;
  if (progressFill) progressFill.style.width = s.fill;

  ['step-pending', 'step-preparing', 'step-ready'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      el.className = 'step';
      if (s.steps[i]) el.classList.add(s.steps[i]);
    }
  });

  const reviewPrompt = document.getElementById('review-prompt');

  if (status === 'ready') {
    if (readyBanner) readyBanner.style.display = 'block';
    if (countdownSection) countdownSection.style.display = 'none';
    if (reviewPrompt) reviewPrompt.style.display = 'block';
  } else if (status === 'completed') {
    if (readyBanner) {
      readyBanner.style.display = 'block';
      readyBanner.textContent = 'ORDER COMPLETED — THANK YOU';
      readyBanner.style.background = 'var(--surface-2)';
      readyBanner.style.color = 'var(--gray)';
    }
    if (countdownSection) countdownSection.style.display = 'none';
    if (reviewPrompt) reviewPrompt.style.display = 'block';
  } else {
    if (readyBanner) readyBanner.style.display = 'none';
    if (countdownSection) countdownSection.style.display = 'block';
    if (reviewPrompt) reviewPrompt.style.display = 'none';
  }

}

function renderItems(order) {
  if (!itemsList) return;
  itemsList.innerHTML = '';

  if (order.items && Array.isArray(order.items)) {
    order.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const name = document.createElement('span');
      name.textContent = item.name || 'Item';
      const price = document.createElement('span');
      price.style.color = 'var(--accent)';
      price.textContent = `$${Number(item.price || 0).toFixed(2)}`;
      row.appendChild(name);
      row.appendChild(price);
      itemsList.appendChild(row);
    });
  }

  if (orderTotal) {
    orderTotal.innerHTML = '';
    const l = document.createElement('span');
    l.textContent = 'Total';
    const v = document.createElement('span');
    v.textContent = `$${order.total || '0.00'}`;
    orderTotal.appendChild(l);
    orderTotal.appendChild(v);
  }
}

let countdownInterval = null;

function updateCountdown(order) {
  if (order.status === 'ready' || order.status === 'completed') {
    if (countdownInterval) clearInterval(countdownInterval);
    return;
  }

  if (!order.createdAt?.seconds) {
    if (countdownEl) countdownEl.textContent = '~20:00';
    return;
  }

  const prepMins = order.prepTime || DEFAULT_PREP_MINUTES;
  const readyAt = (order.createdAt.seconds * 1000) + (prepMins * 60 * 1000);

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const remaining = readyAt - Date.now();
    if (remaining <= 0) {
      if (countdownEl) countdownEl.textContent = 'ANY MOMENT';
      clearInterval(countdownInterval);
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    if (countdownEl) countdownEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}
