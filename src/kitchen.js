import { db, app } from './firebase.js';
import { collection, query, where, orderBy as fsOrderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
    const unlockOverlay = document.getElementById('kds-unlock-overlay');
    if (unlockOverlay) {
      unlockOverlay.style.display = 'flex';
      unlockOverlay.addEventListener('click', () => {
        unlockOverlay.style.display = 'none';
        document.getElementById('kds-app').style.display = 'block';
        
        // Init audio context on this user gesture
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        document.documentElement.requestFullscreen().catch(() => {});

        // Initialize Auth then KDS
        const auth = getAuth(app);
        signInAnonymously(auth).then(() => {
          initKDS();
        }).catch(err => {
          console.error("Auth failed:", err);
          alert("Auth failed. Check console.");
        });
      }, { once: true });
    }
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
      // Initialize AudioContext immediately on user tap (prevents iOS blocking after async network calls)
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

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
// Audio Alerts — 15-second loud alarm for new orders
// ─────────────────────────────────────────────────────────────────
let alarmTimeout = null;
let alarmOscillators = [];
let alarmGainNode = null;
let alarmBanner = null;

function playAlarm() {
  if (isMuted) return;
  // Don't stack alarms
  if (alarmOscillators.length > 0) return;

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Master gain — LOUD
    alarmGainNode = audioContext.createGain();
    alarmGainNode.gain.setValueAtTime(0.9, audioContext.currentTime);
    alarmGainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    const duration = 15; // 15 seconds

    // Create a pulsing two-tone siren (alternates between two frequencies)
    // Each pulse is 0.3s, repeating for 15 seconds = ~25 pulses
    const pulseInterval = 0.3;
    const freqHigh = 1400; // High tone
    const freqLow = 900;   // Low tone

    for (let t = 0; t < duration; t += pulseInterval * 2) {
      // High tone pulse
      const oscHigh = audioContext.createOscillator();
      const gainHigh = audioContext.createGain();
      oscHigh.type = 'square';
      oscHigh.frequency.setValueAtTime(freqHigh, now + t);
      gainHigh.gain.setValueAtTime(0, now + t);
      gainHigh.gain.linearRampToValueAtTime(1, now + t + 0.02);
      gainHigh.gain.setValueAtTime(1, now + t + pulseInterval - 0.02);
      gainHigh.gain.linearRampToValueAtTime(0, now + t + pulseInterval);
      oscHigh.connect(gainHigh);
      gainHigh.connect(alarmGainNode);
      oscHigh.start(now + t);
      oscHigh.stop(now + t + pulseInterval);
      alarmOscillators.push(oscHigh);

      // Low tone pulse
      if (t + pulseInterval < duration) {
        const oscLow = audioContext.createOscillator();
        const gainLow = audioContext.createGain();
        oscLow.type = 'square';
        oscLow.frequency.setValueAtTime(freqLow, now + t + pulseInterval);
        gainLow.gain.setValueAtTime(0, now + t + pulseInterval);
        gainLow.gain.linearRampToValueAtTime(1, now + t + pulseInterval + 0.02);
        gainLow.gain.setValueAtTime(1, now + t + pulseInterval * 2 - 0.02);
        gainLow.gain.linearRampToValueAtTime(0, now + t + pulseInterval * 2);
        oscLow.connect(gainLow);
        gainLow.connect(alarmGainNode);
        oscLow.start(now + t + pulseInterval);
        oscLow.stop(now + t + pulseInterval * 2);
        alarmOscillators.push(oscLow);
      }
    }

    // Show the silence banner
    showAlarmBanner();

    // Auto-stop after 15 seconds
    alarmTimeout = setTimeout(() => {
      stopAlarm();
    }, duration * 1000);

  } catch(e) {
    console.error('Alarm play failed:', e);
  }
}

function stopAlarm() {
  // Stop all oscillators
  alarmOscillators.forEach(osc => {
    try { osc.stop(); } catch(e) { /* already stopped */ }
  });
  alarmOscillators = [];

  // Fade out gain
  if (alarmGainNode) {
    try {
      alarmGainNode.gain.cancelScheduledValues(audioContext.currentTime);
      alarmGainNode.gain.setValueAtTime(alarmGainNode.gain.value, audioContext.currentTime);
      alarmGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
    } catch(e) { /* ignore */ }
    alarmGainNode = null;
  }

  // Clear timeout
  if (alarmTimeout) {
    clearTimeout(alarmTimeout);
    alarmTimeout = null;
  }

  // Hide banner
  hideAlarmBanner();
}

function showAlarmBanner() {
  if (alarmBanner) return;
  alarmBanner = document.createElement('div');
  alarmBanner.id = 'kds-alarm-banner';
  alarmBanner.innerHTML = '🔔 NEW ORDER — TAP TO SILENCE';
  alarmBanner.addEventListener('click', stopAlarm);
  document.body.appendChild(alarmBanner);
}

function hideAlarmBanner() {
  if (alarmBanner) {
    alarmBanner.remove();
    alarmBanner = null;
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
    where('createdAt', '>=', startOfDay),
    fsOrderBy('createdAt', 'asc')
  );

  onSnapshot(q, (snapshot) => {
    const newOrdersCount = snapshot.docChanges().filter(change => change.type === 'added').length;
    
    // Only play chime if it's a real new order (not initial load, unless there's many, but mostly for running system)
    if (newOrdersCount > 0 && orders.length > 0) {
      playAlarm();
    }

    orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        shortId: doc.id.slice(-4).toUpperCase(),
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
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
let pollFailCount = 0;
async function pollSquareOrders() {
  try {
    console.log("Polling Square orders...");
    const resp = await fetch('https://us-central1-bigi-awasaana-7b3ce.cloudfunctions.net/syncSquareOrders');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    pollFailCount = 0; // Reset on success
  } catch (err) {
    pollFailCount++;
    console.error(`Error polling Square orders (attempt ${pollFailCount}):`, err);
  } finally {
    // Retry sooner on failure (10s), normal interval on success (30s)
    const nextInterval = pollFailCount > 0 ? 10000 : 30000;
    setTimeout(pollSquareOrders, nextInterval);
  }
}

// ─────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────
// Auto-hide completed orders after this many minutes
const COMPLETED_AUTO_HIDE_MINUTES = 5;

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

  const now = new Date();

  sortedOrders.forEach(order => {
    // Hide scheduled orders that haven't been released to the kitchen yet
    if (order.pickup && order.pickup.type === 'scheduled' && order.pickup.releasedToKitchen === false) {
      return;
    }

    // Only hide if explicitly dismissed by the kitchen staff
    if (order.kdsHidden === true) {
      return; 
    }

    // Auto-hide completed orders after COMPLETED_AUTO_HIDE_MINUTES
    if (order.status === 'completed') {
      const completedElapsed = getElapsedMinutes(order.updatedAt || order.createdAt);
      if (completedElapsed >= COMPLETED_AUTO_HIDE_MINUTES) {
        return;
      }
    }

    if (order.status !== 'completed') {
      totalCount++;
    }

    const card = document.createElement('div');
    card.className = `kds-card status-${order.status}`;
    
    const elapsed = getElapsedMinutes(order.createdAt);
    let timeDisplay = elapsed > 0 ? `${elapsed} ${t('min')}` : t('Just now');
    if (order.status === 'completed') timeDisplay = t('Done');

    // Platform badge for ALL sources
    const platformBadges = {
      doordash:     { label: 'DD · DoorDash',      cls: 'badge-doordash',     isDelivery: true },
      ubereats:     { label: 'UE · Uber Eats',      cls: 'badge-ubereats',     isDelivery: true },
      grubhub:      { label: 'GH · Grubhub',        cls: 'badge-grubhub',      isDelivery: true },
      squareonline: { label: 'SQ · Square Online',   cls: 'badge-squareonline', isDelivery: false },
      website:      { label: '🌐 Website',           cls: 'badge-website',      isDelivery: false },
      pos:          { label: '📱 POS',               cls: 'badge-pos',          isDelivery: false },
    };

    const badge = platformBadges[order.source];
    let platformBadgeHtml = '';
    if (badge) {
      platformBadgeHtml = `<div class="kds-platform-badge ${badge.cls}">${badge.label}</div>`;
      if (badge.isDelivery) {
        platformBadgeHtml += `<p class="kds-delivery-note">📦 ${t('Delivery — driver will collect')}</p>`;
      }
    }
      
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

    // Status action button
    let actionBtnHtml = '';
    if (order.status === 'pending') {
      actionBtnHtml = `<button class="kds-card-action kds-btn-pending" onclick="changeOrderStatus('${order.id}', 'preparing')">▶ START COOKING</button>`;
    } else if (order.status === 'preparing') {
      actionBtnHtml = `<button class="kds-card-action kds-btn-preparing" onclick="changeOrderStatus('${order.id}', 'ready')">✓ MARK READY</button>`;
    } else if (order.status === 'ready') {
      actionBtnHtml = `<button class="kds-card-action kds-btn-ready" onclick="changeOrderStatus('${order.id}', 'completed')">✓ COMPLETE</button>`;
    } else if (order.status === 'completed') {
      actionBtnHtml = `<div class="kds-card-done-label">✓ DONE</div>`;
    }

    card.innerHTML = `
      <div class="kds-card-header">
        <div>
          <h3 class="kds-card-name">${t(order.customerName || 'Guest')}</h3>
          <div class="kds-card-id">#${order.shortId}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <div class="kds-card-time-box">
            <div class="kds-card-elapsed">${timeDisplay}</div>
            <div class="kds-card-time">${formatTime(order.createdAt)}</div>
          </div>
          <button class="kds-card-remove-btn" onclick="hideOrder('${order.id}')" aria-label="Remove Order">✕</button>
        </div>
      </div>
      ${platformBadgeHtml}
      <ul class="kds-card-items">${itemsHtml}</ul>
      ${actionBtnHtml}
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
window.hideOrder = async (orderId) => {
  try {
    // Optimistic UI update
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      orders[orderIndex].kdsHidden = true;
      renderOrders();
    }
    
    // Persist to Firestore
    await updateDoc(doc(db, 'orders', orderId), { kdsHidden: true });
  } catch (error) {
    console.error("Failed to hide order:", error);
    alert("Failed to hide order. Are you connected to the internet?");
  }
};

window.changeOrderStatus = async (orderId, newStatus) => {
  const orderIndex = orders.findIndex(o => o.id === orderId);
  const prevStatus = orderIndex > -1 ? orders[orderIndex].status : null;

  try {
    // Optimistic UI update
    if (orderIndex > -1) {
      orders[orderIndex].status = newStatus;
      if (newStatus === 'completed' || newStatus === 'ready') {
        orders[orderIndex].updatedAt = new Date();
      }
      renderOrders();
    }

    // Call the backend to update Square + Firestore
    await updateSquareOrderStatus({ orderId, status: newStatus });
  } catch (error) {
    console.error("Failed to update order status:", error);
    // Revert optimistic update
    if (orderIndex > -1 && prevStatus) {
      orders[orderIndex].status = prevStatus;
      renderOrders();
    }
    alert("Failed to update order status. Please try again.");
  }
};
