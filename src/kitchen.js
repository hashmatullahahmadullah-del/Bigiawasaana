import { db, app } from './firebase.js';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInAnonymously } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────
// WAKE LOCK (Prevent Screen Sleep)
// ─────────────────────────────────────────────────────────────────
let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Screen Wake Lock released');
      });
      console.log('Screen Wake Lock acquired');
    }
  } catch (err) {
    console.error('Wake Lock error:', err.name, err.message);
  }
}

document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    requestWakeLock();
  }
});

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
  requestWakeLock();
  
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
  const pinDisplay = document.getElementById('kds-pin-display');
  const errorMsg = document.getElementById('kds-pin-error');
  const keys = document.querySelectorAll('.kds-pin-key');
  
  let currentPin = '';
  let attempts = 0;
  let lockoutTimer = null;
  let isVerifying = false;

  const auth = getAuth(app);
  signInAnonymously(auth).catch(err => console.error("PIN screen auth failed:", err));

  function updateDisplay() {
    if (isVerifying) return;
    pinDisplay.textContent = '•'.repeat(currentPin.length);
    pinDisplay.classList.remove('error');
    errorMsg.textContent = '';
  }

  async function verifyPin() {
    if (currentPin.length !== 6 || isVerifying) return;
    
    isVerifying = true;
    pinDisplay.textContent = 'VERIFYING...';
    pinDisplay.style.letterSpacing = '2px';
    pinDisplay.style.fontSize = '24px';
    
    // Disable keypad
    keys.forEach(k => k.disabled = true);

    try {
      const functions = getFunctions(app);
      const verifyKdsPin = httpsCallable(functions, 'verifyKdsPin');
      const result = await verifyKdsPin({ pin: currentPin });

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
  }

  keys.forEach(key => {
    key.addEventListener('click', () => {
      if (isVerifying || lockoutTimer) return;
      
      const val = key.textContent;
      
      if (key.id === 'kds-pin-clear') {
        currentPin = '';
        updateDisplay();
      } else if (key.id === 'kds-pin-back') {
        currentPin = currentPin.slice(0, -1);
        updateDisplay();
      } else if (currentPin.length < 6) {
        currentPin += val;
        updateDisplay();
        
        if (currentPin.length === 6) {
          verifyPin();
        }
      }
    });
  });

  function handleWrongPin() {
    attempts++;
    currentPin = '';
    isVerifying = false;
    pinDisplay.style.letterSpacing = '';
    pinDisplay.style.fontSize = '';
    pinDisplay.classList.add('error');
    
    if (attempts >= 3) {
      startLockout();
    } else {
      pinDisplay.textContent = 'ERROR';
      errorMsg.textContent = `Incorrect PIN. ${3 - attempts} attempts remaining.`;
      keys.forEach(k => k.disabled = false);
      setTimeout(() => {
        if (!isVerifying && !lockoutTimer) {
           pinDisplay.textContent = '';
           pinDisplay.classList.remove('error');
        }
      }, 1000);
    }
  }

  function startLockout() {
    let timeLeft = 60;
    
    pinDisplay.textContent = 'LOCKED';
    pinDisplay.style.letterSpacing = '4px';
    errorMsg.textContent = `Too many failed attempts. Try again in ${timeLeft}s.`;
    
    lockoutTimer = setInterval(() => {
      timeLeft--;
      errorMsg.textContent = `Too many failed attempts. Try again in ${timeLeft}s.`;
      
      if (timeLeft <= 0) {
        clearInterval(lockoutTimer);
        lockoutTimer = null;
        attempts = 0;
        currentPin = '';
        pinDisplay.textContent = '';
        pinDisplay.style.letterSpacing = '';
        pinDisplay.classList.remove('error');
        errorMsg.textContent = '';
        keys.forEach(k => k.disabled = false);
      }
    }, 1000);
  }
}

// ─────────────────────────────────────────────────────────────────
// State & Translations
// ─────────────────────────────────────────────────────────────────
const functions = getFunctions(app);
const updateSquareOrderStatus = httpsCallable(functions, 'updateSquareOrderStatus');

let orders = [];
let audioContext = null;
let isMuted = false;
let isPersian = false;

const translations = {
  // Menu Items
  'Beef Tikka Kabob': 'کباب تکه گاو',
  'Chicken Kabob': 'کباب مرغ',
  'Chapli Kabob': 'کباب چپلی',
  'Bolani (Potato & Green Onion)': 'بولانی (کچالو و پیاز)',
  'Bolani (Pumpkin)': 'بولانی کدو',
  'Bolani (Leek)': 'بولانی گندنه',
  'Mantu': 'منتو',
  'Qabili Palau': 'قابلی پلو',
  'Hummus': 'حمص',
  'Yogurt Dip': 'ماست',
  'Salad': 'سالاد',
  'Afghan Bread (Naan)': 'نان افغانی',
  'Firnee': 'فرنی',
  'Baklava': 'باقلوا',
  'Afghan Green Tea': 'چای سبز',
  'Afghan Black Tea': 'چای سیاه',
  'Doogh (Yogurt Drink)': 'دوغ',
  // Extras
  'Extra Naan': 'نان اضافی',
  'Extra White Sauce': 'سس سفید اضافی',
  'Extra Green Sauce': 'سس سبز اضافی',
  // UI & Times
  'Done': 'تکمیل شد',
  'Just now': 'همین الان',
  'min': 'دقیقه',
  'Guest': 'مهمان',
  // Badges
  'Delivery — driver will collect': 'تحویل — راننده می‌گیرد',
  'SCHEDULED': 'برنامه‌ریزی شده',
  'ASAP': 'هرچه زودتر'
};

function t(text) {
  if (!isPersian || !text) return text;
  if (translations[text]) return translations[text];
  let res = text;
  for (const [eng, per] of Object.entries(translations)) {
    const regex = new RegExp(eng, 'gi');
    res = res.replace(regex, per);
  }
  return res;
}

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

document.getElementById('kds-lang-btn')?.addEventListener('click', (e) => {
  isPersian = !isPersian;
  e.currentTarget.style.opacity = isPersian ? '1' : '0.4';
  renderOrders();
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
  const colAll = document.getElementById('col-all');
  if (!colAll) return;
  colAll.innerHTML = '';
  
  let totalCount = 0;

  // Status weight for sorting
  const statusWeight = { pending: 1, preparing: 2, ready: 3, completed: 4 };

  const sortedOrders = [...orders].sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    return a.createdAt - b.createdAt; // Oldest first within same status
  });

  sortedOrders.forEach(order => {
    // Hide scheduled orders that haven't been released to the kitchen yet
    if (order.pickup && order.pickup.type === 'scheduled' && order.pickup.releasedToKitchen === false) {
      return;
    }

    // Skip old completed orders (hide after 60s)
    if (order.status === 'completed' && getElapsedMinutes(order.updatedAt?.toDate() || order.createdAt) > 1) {
      return; 
    }

    if (order.status !== 'completed') {
      totalCount++;
    }

    const card = document.createElement('div');
    card.className = `kds-card status-${order.status}`;
    
    const elapsed = getElapsedMinutes(order.createdAt);
    let timeDisplay = elapsed > 0 ? `${elapsed} ${t('min')}` : t('Just now');
    if (order.status === 'completed') timeDisplay = t('Done');

    // Platform badge for delivery orders
    const deliveryBadges = { doordash: 'DD · DoorDash', ubereats: 'UE · Uber Eats', grubhub: 'GH · Grubhub' };
    const badgeClasses = { doordash: 'badge-doordash', ubereats: 'badge-ubereats', grubhub: 'badge-grubhub' };
    let platformBadgeHtml = deliveryBadges[order.source]
      ? `<div class="kds-platform-badge ${badgeClasses[order.source]}">${deliveryBadges[order.source]}</div>
         <p class="kds-delivery-note">📦 ${t('Delivery — driver will collect')}</p>`
      : '';
      
    // Pickup Badge
    if (order.pickup) {
      if (order.pickup.type === 'scheduled') {
        const reqTimeStr = order.pickup.requestedTime?.toDate()?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || '';
        platformBadgeHtml += `<div class="kds-platform-badge" style="background: var(--accent); color: white; display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold; margin-bottom: 8px;">🕒 ${t('SCHEDULED')}: ${reqTimeStr}</div>`;
      } else {
         platformBadgeHtml += `<div class="kds-platform-badge" style="background: rgba(255,255,255,0.2); color: white; display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold; margin-bottom: 8px;">🔥 ${t('ASAP')}</div>`;
      }
    }

    const itemsHtml = (order.items || []).map(item => `
      <li class="kds-card-item">
        <span class="kds-item-qty">${item.quantity}×</span>
        <span>${t(item.name)}</span>
      </li>
    `).join('');

    card.innerHTML = `
      <div class="kds-card-header">
        <div>
          <h3 class="kds-card-name">${t(order.customerName || 'Guest')}</h3>
          <div class="kds-card-id">#${order.shortId}</div>
        </div>
        <div class="kds-card-time-box">
          <div class="kds-card-elapsed">${timeDisplay}</div>
          <div class="kds-card-time">${formatTime(order.createdAt)}</div>
        </div>
      </div>
      ${platformBadgeHtml}
      <ul class="kds-card-items">${itemsHtml}</ul>
    `;

    colAll.appendChild(card);
  });

  // Update counts
  const countAll = document.getElementById('count-all');
  if (countAll) countAll.textContent = totalCount;
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
    await updateSquareOrderStatus({ orderId, status: newStatus });
  } catch (error) {
    console.error("Failed to update status:", error);
    alert("Failed to update status. Are you connected to the internet?");
  }
};
