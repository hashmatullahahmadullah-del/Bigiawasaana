import { db, app } from './firebase.js';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInAnonymously } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────
// Admin Gate
// ─────────────────────────────────────────────────────────────────
// Fullscreen logic
const fullscreenBtn = document.getElementById('kds-fullscreen-btn');
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn("Fullscreen error:", err);
      alert("Press F11 to enter fullscreen.");
    });
  } else {
    document.exitFullscreen();
  }
}
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', toggleFullscreen);
}
document.addEventListener('fullscreenchange', () => {
  if (fullscreenBtn) {
    fullscreenBtn.textContent = document.fullscreenElement ? '✕' : '⛶';
  }
});

// Auto-fullscreen on first interaction
let firstInteraction = false;
document.body.addEventListener('click', () => {
  if (!firstInteraction && !document.fullscreenElement) {
    firstInteraction = true;
    document.documentElement.requestFullscreen().catch(() => {});
  }
}, { once: true });

// Check admin access
if (new URLSearchParams(window.location.search).get('admin') === 'true') {
  localStorage.setItem('bigi_admin', 'true');
}

if (localStorage.getItem('bigi_admin') !== 'true') {
  document.getElementById('kds-pin-screen').style.display = 'none';
  document.getElementById('kds-app').style.display = 'none';
  document.getElementById('kds-denied').style.display = 'flex';
} else {
  document.getElementById('kds-denied').style.display = 'none';
  
  if (sessionStorage.getItem('kds_authenticated') === 'true') {
    document.getElementById('kds-pin-screen').style.display = 'none';
    document.getElementById('kds-app').style.display = 'block';
    // Initialize Auth then KDS
    const auth = getAuth(app);
    signInAnonymously(auth).then(() => {
      initKDS();
    }).catch(err => {
      console.error("Auth failed:", err);
      alert("Auth failed. Check console.");
    });
  } else {
    document.getElementById('kds-app').style.display = 'none';
    document.getElementById('kds-pin-screen').style.display = 'flex';
    initPinScreen();
  }
}

// ─────────────────────────────────────────────────────────────────
// PIN Screen Logic
// ─────────────────────────────────────────────────────────────────
function initPinScreen() {
  const pinInput = document.getElementById('kds-pin-input');
  const pinBtn = document.getElementById('kds-pin-btn');
  const errorMsg = document.getElementById('kds-pin-error');
  
  let attempts = 0;
  let lockoutTimer = null;

  const auth = getAuth(app);
  signInAnonymously(auth).catch(err => console.error("PIN screen auth failed:", err));

  pinBtn.addEventListener('click', async () => {
    const pin = pinInput.value.trim();
    if (!pin) return;

    pinBtn.disabled = true;
    pinBtn.textContent = 'VERIFYING...';
    errorMsg.textContent = '';

    try {
      const functions = getFunctions(app);
      const verifyKdsPin = httpsCallable(functions, 'verifyKdsPin');
      const result = await verifyKdsPin({ pin });

      if (result.data.success) {
        sessionStorage.setItem('kds_authenticated', 'true');
        document.getElementById('kds-pin-screen').style.display = 'none';
        document.getElementById('kds-app').style.display = 'block';
        initKDS();
      } else {
        handleWrongPin();
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      handleWrongPin();
    }
  });

  function handleWrongPin() {
    attempts++;
    pinInput.value = '';
    if (attempts >= 3) {
      startLockout();
    } else {
      errorMsg.textContent = `Incorrect PIN. ${3 - attempts} attempts remaining.`;
      pinBtn.disabled = false;
      pinBtn.textContent = 'ENTER KITCHEN';
    }
  }

  function startLockout() {
    let timeLeft = 60;
    pinInput.disabled = true;
    
    errorMsg.textContent = `Too many failed attempts. Try again in ${timeLeft}s.`;
    
    lockoutTimer = setInterval(() => {
      timeLeft--;
      errorMsg.textContent = `Too many failed attempts. Try again in ${timeLeft}s.`;
      
      if (timeLeft <= 0) {
        clearInterval(lockoutTimer);
        attempts = 0;
        pinInput.disabled = false;
        pinBtn.disabled = false;
        pinBtn.textContent = 'ENTER KITCHEN';
        errorMsg.textContent = '';
      }
    }, 1000);
  }
}

// ─────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────
const functions = getFunctions(app);
const updateOrderStatus = httpsCallable(functions, 'updateOrderStatus');

let orders = [];
let audioContext = null;
let isMuted = false;

// Time formatting helpers
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getElapsedMinutes(createdAt) {
  if (!createdAt) return 0;
  const now = new Date();
  const diffMs = now - createdAt;
  return Math.floor(diffMs / 60000);
}

// ─────────────────────────────────────────────────────────────────
// Audio Alerts
// ─────────────────────────────────────────────────────────────────
function playChime() {
  if (isMuted) return;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1); // Slide up to A6
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
  } catch(e) {
    console.error('Audio play failed:', e);
  }
}

document.getElementById('kds-mute-btn').addEventListener('click', (e) => {
  isMuted = !isMuted;
  const btn = e.currentTarget;
  if (isMuted) {
    btn.classList.add('muted');
    btn.textContent = '🔕';
  } else {
    btn.classList.remove('muted');
    btn.textContent = '🔔';
    // Init audio context on user gesture
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// Clock
// ─────────────────────────────────────────────────────────────────
setInterval(() => {
  document.getElementById('kds-clock').textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  // Also re-render orders to update elapsed time
  renderOrders();
}, 1000);

// ─────────────────────────────────────────────────────────────────
// Firestore Listener
// ─────────────────────────────────────────────────────────────────
function initKDS() {
  // Start of today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('createdAt', '>=', startOfDay)
  );

  onSnapshot(q, (snapshot) => {
    const newOrdersCount = snapshot.docChanges().filter(change => change.type === 'added').length;
    
    // Only play chime if it's a real new order (not initial load, unless there's many, but mostly for running system)
    if (newOrdersCount > 0 && orders.length > 0) {
      playChime();
    }

    orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        shortId: doc.id.slice(-4).toUpperCase(),
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
      };
    });

    renderOrders();
  }, (error) => {
    console.error("KDS sync error:", error);
  });

  // Start polling Square API for POS/Uber/DoorDash orders
  pollSquareOrders();
}

// ─────────────────────────────────────────────────────────────────
// Square API Polling
// ─────────────────────────────────────────────────────────────────
async function pollSquareOrders() {
  try {
    console.log("Polling Square orders...");
    // Call the deployed HTTP function (CORS is enabled on backend)
    await fetch('https://us-central1-bigi-awasaana-7b3ce.cloudfunctions.net/syncSquareOrders');
  } catch (err) {
    console.error("Error polling Square orders:", err);
  } finally {
    // Poll again in 30 seconds
    setTimeout(pollSquareOrders, 30000);
  }
}

// ─────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────
function renderOrders() {
  const columns = {
    pos: document.getElementById('col-pos'),
    website: document.getElementById('col-website'),
    doordash: document.getElementById('col-doordash'),
    ubereats: document.getElementById('col-ubereats'),
    grubhub: document.getElementById('col-grubhub')
  };

  const counts = { pos: 0, website: 0, doordash: 0, ubereats: 0, grubhub: 0 };

  // Clear columns
  Object.values(columns).forEach(col => { if(col) col.innerHTML = ''; });

  // Status weight for sorting
  const statusWeight = { pending: 1, preparing: 2, ready: 3, completed: 4 };

  const sortedOrders = [...orders].sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    return a.createdAt - b.createdAt; // Oldest first within same status
  });

  sortedOrders.forEach(order => {
    // Determine column
    let colKey = order.source || 'pos';
    if (!columns[colKey]) colKey = 'pos'; // Fallback
    
    // Skip old completed orders (hide after 60s)
    if (order.status === 'completed' && getElapsedMinutes(order.updatedAt?.toDate() || order.createdAt) > 1) {
      return; 
    }

    if (order.status !== 'completed') {
      counts[colKey]++;
    }

    const card = document.createElement('div');
    card.className = `kds-card status-${order.status}`;
    
    const elapsed = getElapsedMinutes(order.createdAt);
    let timeDisplay = elapsed > 0 ? `${elapsed} min` : 'Just now';
    if (order.status === 'completed') timeDisplay = 'Done';

    // Platform badge for delivery orders
    const deliveryBadges = { doordash: 'DD · DoorDash', ubereats: 'UE · Uber Eats', grubhub: 'GH · Grubhub' };
    const badgeClasses = { doordash: 'badge-doordash', ubereats: 'badge-ubereats', grubhub: 'badge-grubhub' };
    const platformBadgeHtml = deliveryBadges[order.source]
      ? `<div class="kds-platform-badge ${badgeClasses[order.source]}">${deliveryBadges[order.source]}</div>
         <p class="kds-delivery-note">📦 Delivery — driver will collect</p>`
      : '';

    const itemsHtml = (order.items || []).map(item => `
      <li class="kds-card-item">
        <span class="kds-item-qty">${item.quantity}×</span>
        <span>${item.name}</span>
      </li>
    `).join('');

    let actionBtnHtml = '';
    if (order.status === 'pending') {
      actionBtnHtml = `<button class="kds-card-action kds-btn-pending" onclick="updateOrder('${order.id}', 'preparing')">START PREPARING</button>`;
    } else if (order.status === 'preparing') {
      actionBtnHtml = `<button class="kds-card-action kds-btn-preparing" onclick="updateOrder('${order.id}', 'ready')">MARK READY</button>`;
    } else if (order.status === 'ready') {
      actionBtnHtml = `<button class="kds-card-action kds-btn-ready" onclick="updateOrder('${order.id}', 'completed')">COMPLETE</button>`;
    }

    card.innerHTML = `
      <div class="kds-card-header">
        <div>
          <h3 class="kds-card-name">${order.customerName || 'Guest'}</h3>
          <div class="kds-card-id">#${order.shortId}</div>
        </div>
        <div class="kds-card-time-box">
          <div class="kds-card-elapsed">${timeDisplay}</div>
          <div class="kds-card-time">${formatTime(order.createdAt)}</div>
        </div>
      </div>
      ${platformBadgeHtml}
      <ul class="kds-card-items">${itemsHtml}</ul>
      ${actionBtnHtml}
    `;

    columns[colKey].appendChild(card);
  });

  // Update counts
  document.getElementById('count-pos').textContent = counts.pos;
  document.getElementById('count-website').textContent = counts.website;
  document.getElementById('count-doordash').textContent = counts.doordash;
  document.getElementById('count-ubereats').textContent = counts.ubereats;
  document.getElementById('count-grubhub').textContent = counts.grubhub;
}

// ─────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────
window.updateOrder = async (orderId, newStatus) => {
  try {
    // Optimistic UI update
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      orders[orderIndex].status = newStatus;
      orders[orderIndex].updatedAt = { toDate: () => new Date() }; // mock timestamp
      renderOrders();
    }
    
    // Call Cloud Function to bypass client rules
    await updateOrderStatus({ orderId, status: newStatus });
  } catch (error) {
    console.error("Failed to update status:", error);
    alert("Failed to update status. Are you connected to the internet?");
  }
};
