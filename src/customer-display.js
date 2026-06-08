import { db, app } from './firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

let audioContext = null;
let audioEnabled = false;

// ─────────────────────────────────────────────────────────────────
// Fullscreen logic
// ─────────────────────────────────────────────────────────────────
const fullscreenBtn = document.getElementById('cd-fullscreen-btn');

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

// Auto-fullscreen on first user interaction
document.body.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}, { once: true });

// ─────────────────────────────────────────────────────────────────
// Audio Chime
// ─────────────────────────────────────────────────────────────────
function playReadyChime() {
  if (!audioEnabled || !audioContext) return;
  try {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = 'sine';
    // Ding: E6 → C6
    osc.frequency.setValueAtTime(1318.51, audioContext.currentTime);
    osc.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime + 0.25);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 1.0);
  } catch(e) {
    console.error('Audio play failed:', e);
  }
}

document.getElementById('cd-init-audio').addEventListener('click', (e) => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  audioEnabled = !audioEnabled;
  e.currentTarget.classList.toggle('enabled', audioEnabled);
  e.currentTarget.textContent = audioEnabled ? '🔊' : '🔇';
  if (audioEnabled) playReadyChime();
});

// ─────────────────────────────────────────────────────────────────
// App init
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const auth = getAuth(app);
  signInAnonymously(auth).then(() => {
    initDisplay();
  }).catch(err => {
    console.error("Auth failed:", err);
  });
});

let currentOrders = {};

function initDisplay() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('createdAt', '>=', startOfDay)
  );

  onSnapshot(q, (snapshot) => {
    const newOrders = {};
    let playedChimeThisTick = false;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status;

      if (['pending', 'preparing', 'ready'].includes(status)) {
        newOrders[doc.id] = {
          id: doc.id,
          shortId: doc.id.slice(-4).toUpperCase(),
          customerName: formatFirstName(data.customerName || 'Guest'),
          status: status === 'pending' ? 'preparing' : status,
          createdAt: data.createdAt ? data.createdAt.toDate().getTime() : 0
        };

        // Chime on transition to ready
        if (status === 'ready' && currentOrders[doc.id] && currentOrders[doc.id].status !== 'ready') {
          if (!playedChimeThisTick) {
            playReadyChime();
            playedChimeThisTick = true;
          }
        }
      }
    });

    renderDisplay(newOrders);
  }, (error) => {
    console.error("Display sync error:", error);
  });
}

function formatFirstName(fullName) {
  return fullName.split(' ')[0];
}

function renderDisplay(newOrders) {
  const colPreparing = document.getElementById('col-preparing');
  const colReady = document.getElementById('col-ready');

  // Handle removed orders (completed)
  Object.keys(currentOrders).forEach(id => {
    if (!newOrders[id]) {
      const el = document.getElementById(`cd-order-${id}`);
      if (el) {
        el.classList.add('exiting');
        setTimeout(() => el.remove(), 500);
      }
    }
  });

  // Sort by createdAt ascending
  const ordersList = Object.values(newOrders).sort((a, b) => a.createdAt - b.createdAt);

  ordersList.forEach(order => {
    let el = document.getElementById(`cd-order-${order.id}`);

    if (!el) {
      el = document.createElement('div');
      el.id = `cd-order-${order.id}`;
      el.innerHTML = `
        <div class="cd-card-number">#${order.shortId}</div>
        <div class="cd-card-name">${order.customerName}</div>
      `;
    }

    el.className = `cd-card status-${order.status}`;

    if (order.status === 'preparing') {
      if (el.parentElement !== colPreparing) colPreparing.appendChild(el);
    } else if (order.status === 'ready') {
      if (el.parentElement !== colReady) colReady.appendChild(el);
    }
  });

  currentOrders = newOrders;
}
