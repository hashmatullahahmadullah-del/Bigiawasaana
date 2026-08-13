// Shared mobile nav logic for all pages
import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { getLang, setLang, toggleLang, applyTranslations } from './i18n/index.js';

export function initNav(activePage = '') {
  const hamburger = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-mobile-drawer');
  
  // Sync global business hours on all pages
  syncGlobalBusinessHours();
  if (!hamburger || !drawer) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    drawer.classList.toggle('open');
  });

  // Language setup
  setLang(getLang());
  applyTranslations();

  const langToggles = document.querySelectorAll('.site-lang-toggle');
  langToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleLang();
      applyTranslations();
      // If we are on menu.html, we need to re-render the menu
      if (typeof window.renderMenu === 'function') {
        window.renderMenu();
      }
    });
  });

  // Close drawer when a link is clicked
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      drawer.classList.remove('open');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !drawer.contains(e.target)) {
      hamburger.classList.remove('open');
      drawer.classList.remove('open');
    }
  });

  checkGlobalPopup();
}

async function checkGlobalPopup() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'popup'));
    if (!snap.exists()) return;
    
    const data = snap.data();
    if (!data.active) return;

    // Check if user already dismissed this version
    const lastUpdate = data.updatedAt?.toMillis() || 0;
    const dismissedKey = 'bigi_popup_dismissed';
    const lastDismissed = localStorage.getItem(dismissedKey);

    if (lastDismissed && parseInt(lastDismissed) >= lastUpdate) {
      return; // Already dismissed this specific popup version
    }

    renderPopup(data, lastUpdate, dismissedKey);
  } catch(e) {
    console.error('Error fetching popup:', e);
  }
}

function renderPopup(data, lastUpdate, dismissedKey) {
  const overlay = document.createElement('div');
  overlay.className = 'global-popup-overlay';
  
  let btnHtml = '';
  if (data.buttonText && data.buttonUrl) {
    btnHtml = `<a href="${data.buttonUrl}" class="btn-primary" style="margin-top: 20px; display: inline-block; text-decoration: none;">${data.buttonText}</a>`;
  }

  // Format message to handle line breaks natively
  const formattedMessage = (data.message || '').replace(/\n/g, '<br>');

  overlay.innerHTML = `
    <div class="global-popup-content">
      <button class="global-popup-close">&times;</button>
      <h2 style="font-family: 'Barlow Condensed'; font-size: 28px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; color: var(--white);">${data.title || 'Announcement'}</h2>
      <p style="color: var(--gray); line-height: 1.5; font-size: 16px; margin: 0;">${formattedMessage}</p>
      ${btnHtml}
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });

  // Close logic
  const closeBtn = overlay.querySelector('.global-popup-close');
  const closePopup = () => {
    overlay.classList.remove('show');
    localStorage.setItem(dismissedKey, lastUpdate.toString());
    setTimeout(() => overlay.remove(), 400); // Wait for transition
  };

  closeBtn.addEventListener('click', closePopup);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopup();
  });
}

function syncGlobalBusinessHours() {
  getDoc(doc(db, 'settings', 'pickupConfig')).then((docSnap) => {
    if (!docSnap.exists()) return;
    const pickupConfig = docSnap.data();
    if (!pickupConfig.businessHours) return;
    
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const openDaysStr = pickupConfig.openDays && pickupConfig.openDays.length === 7 
      ? 'Every Day' 
      : (pickupConfig.openDays || [0,1,2,3,4,5,6]).map(d => daysMap[d].substring(0,3)).join(', ');
      
    function formatTime(time24) {
      if(!time24) return '';
      const [h, m] = time24.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      let displayH = h % 12;
      displayH = displayH ? displayH : 12;
      return `${displayH}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
    }
    
    const openTime = formatTime(pickupConfig.businessHours.open);
    const closeTime = formatTime(pickupConfig.businessHours.close);
    
    // Format 1: "Every Day 12PM-10:30PM"
    const fullText = `${openDaysStr} ${openTime}–${closeTime}`;
    document.querySelectorAll('.footer-hours-display').forEach(el => {
      el.textContent = fullText;
    });
    
    // Format 2: "12:00 PM - 10:30 PM" (Used in hero/location headers)
    const timeOnlyText = `${openTime} – ${closeTime}`;
    document.querySelectorAll('.hero-hours-display').forEach(el => {
      el.textContent = timeOnlyText;
    });
    
    // Format 3: Update "Open Every Day" separately if needed
    document.querySelectorAll('.hero-days-display').forEach(el => {
      el.textContent = openDaysStr === 'Every Day' ? 'Every Day' : openDaysStr;
    });
  }).catch(err => console.error("Error syncing business hours:", err));
}
