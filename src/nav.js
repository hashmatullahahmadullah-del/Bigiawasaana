// Shared mobile nav logic for all pages
export function initNav(activePage = '') {
  const hamburger = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-mobile-drawer');
  if (!hamburger || !drawer) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    drawer.classList.toggle('open');
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

import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';

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
