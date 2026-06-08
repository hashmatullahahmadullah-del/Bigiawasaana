import { db, app } from './firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

let audioContext = null;
let audioEnabled = false;

// Audio Chime Setup
function playReadyChime() {
  if (!audioEnabled || !audioContext) return;
  try {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Nice pleasant 'ding-dong'
    osc.type = 'sine';
    
    // Note 1: E6
    osc.frequency.setValueAtTime(1318.51, audioContext.currentTime);
    // Note 2: C6
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
  audioEnabled = true;
  e.currentTarget.classList.add('enabled');
  e.currentTarget.textContent = '🔊 Audio Enabled';
  // Play test chime
  playReadyChime();
});

// App init
document.addEventListener('DOMContentLoaded', () => {
  // Sign in anonymously to satisfy Firestore rules
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

      // Filter to only preparing or ready (and pending, which we lump into preparing visually)
      if (['pending', 'preparing', 'ready'].includes(status)) {
        newOrders[doc.id] = {
          id: doc.id,
          shortId: doc.id.slice(-4).toUpperCase(),
          customerName: formatFirstName(data.customerName || 'Guest'),
          status: status === 'pending' ? 'preparing' : status, // visually group pending as preparing
          createdAt: data.createdAt ? data.createdAt.toDate().getTime() : 0
        };

        // If it transitioned to ready, play chime
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

  // Handle removed orders (completed or cancelled)
  Object.keys(currentOrders).forEach(id => {
    if (!newOrders[id]) {
      const el = document.getElementById(`cd-order-${id}`);
      if (el) {
        el.classList.add('exiting');
        setTimeout(() => el.remove(), 500);
      }
    }
  });

  // Convert to array and sort by createdAt
  const ordersList = Object.values(newOrders).sort((a, b) => a.createdAt - b.createdAt);

  ordersList.forEach(order => {
    let el = document.getElementById(`cd-order-${order.id}`);
    
    // Create if doesn't exist
    if (!el) {
      el = document.createElement('div');
      el.id = `cd-order-${order.id}`;
      el.innerHTML = `
        <div class="cd-card-number">#${order.shortId}</div>
        <div class="cd-card-name">${order.customerName}</div>
      `;
    }

    // Update state classes
    el.className = `cd-card status-${order.status}`;

    // Append to correct column
    if (order.status === 'preparing') {
      if (el.parentElement !== colPreparing) colPreparing.appendChild(el);
    } else if (order.status === 'ready') {
      if (el.parentElement !== colReady) colReady.appendChild(el);
    }
  });

  currentOrders = newOrders;
}
