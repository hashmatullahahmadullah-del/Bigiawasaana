// Shared mobile nav logic for all pages
import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { getLang, setLang, toggleLang, applyTranslations } from './i18n/index.js';
import { trackPageView } from './analytics.js';

// Setup Consent Mode defaults (denied until user grants consent)
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied'
});

// Dynamic Auth loader — only loads Firebase Auth/Functions/CSS when requested
let authModulePromise = null;
export function getAccountAuth() {
  if (!authModulePromise) {
    authModulePromise = import('./account-auth.js').then(m => {
      m.initAccountAuth();
      return m;
    });
  }
  return authModulePromise;
}

export function initNav(activePage = '') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNav(activePage));
    return;
  }

  // Record page view in Firestore analytics (deferred non-critical)
  try {
    trackPageView();
  } catch (err) {
    // Non-fatal
  }

  // Floating nav scroll state listener
  const siteNav = document.querySelector('.site-nav');
  if (siteNav) {
    const handleNavScroll = () => {
      if (window.scrollY > 15) {
        siteNav.classList.add('scrolled');
      } else {
        siteNav.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();
  }

  const hamburger = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-mobile-drawer');
  
  // Sync global business hours on all pages
  syncGlobalBusinessHours();
  initCookieBanner();
  
  // Update header sign-in pill from session cache synchronously across desktop & mobile
  try {
    const cachedCustomer = JSON.parse(sessionStorage.getItem('bigi_auth_customer') || 'null');
    const cachedOrderAuth = JSON.parse(sessionStorage.getItem('bigi_order_auth') || 'null');
    const name = cachedCustomer?.name || (cachedOrderAuth?.phone ? 'Account' : null);
    if (name) {
      const firstName = name.split(' ')[0] || 'Account';
      document.querySelectorAll('.nav-signin-text').forEach(el => {
        el.textContent = firstName;
      });
    }
  } catch (e) {}

  // Customer Auth Trigger: Attach click listeners across desktop pill, mobile header, and drawer
  const handleAuthTrigger = async (e) => {
    e.preventDefault();
    const d = document.getElementById('nav-mobile-drawer');
    const h = document.getElementById('nav-hamburger');
    const b = document.getElementById('nav-mobile-backdrop');
    if (d && d.classList.contains('open')) {
      d.classList.remove('open');
      if (h) h.classList.remove('open');
      if (b) b.classList.remove('open');
      document.body.classList.remove('nav-drawer-open');
    }
    const authMod = await getAccountAuth();
    if (sessionStorage.getItem('bigi_auth_customer') || sessionStorage.getItem('bigi_order_auth')) {
      authMod.openAccountDrawer();
    } else {
      authMod.openAuthModal();
    }
  };

  const desktopBtn = document.getElementById('nav-account-btn');
  if (desktopBtn) desktopBtn.addEventListener('click', handleAuthTrigger);

  const mobileBtn = document.getElementById('nav-mobile-signin-btn');
  if (mobileBtn) mobileBtn.addEventListener('click', handleAuthTrigger);

  const drawerBtn = document.getElementById('mobile-nav-account-btn');
  if (drawerBtn) drawerBtn.addEventListener('click', handleAuthTrigger);

  // If a session exists, defer auth state reconciliation to idle
  if (sessionStorage.getItem('bigi_auth_customer') || sessionStorage.getItem('bigi_order_auth')) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => getAccountAuth(), { timeout: 3500 });
    } else {
      setTimeout(() => getAccountAuth(), 2000);
    }
  }
  
  // Check if we should initialize analytics right away
  try {
    const consent = JSON.parse(localStorage.getItem('cookieConsent'));
    if (consent && consent.analytics) {
      initAnalytics();
    }
  } catch (e) {
    console.error("Error reading cookie consent", e);
  }

  if (!hamburger || !drawer) return;

  // Ensure backdrop exists for smooth mobile drawer focus
  let backdrop = document.getElementById('nav-mobile-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'nav-mobile-backdrop';
    backdrop.className = 'nav-mobile-backdrop';
    document.body.appendChild(backdrop);
  }

  const toggleDrawer = (force) => {
    const isOpen = typeof force === 'boolean' ? force : !drawer.classList.contains('open');
    hamburger.classList.toggle('open', isOpen);
    drawer.classList.toggle('open', isOpen);
    if (backdrop) backdrop.classList.toggle('open', isOpen);
    document.body.classList.toggle('nav-drawer-open', isOpen);
  };

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDrawer();
  });

  if (backdrop) {
    backdrop.addEventListener('click', () => toggleDrawer(false));
  }

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

  // Close drawer when any interactive element is clicked (except language toggle)
  drawer.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', () => {
      if (el.classList.contains('site-lang-toggle')) return;
      toggleDrawer(false);
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !drawer.contains(e.target)) {
      toggleDrawer(false);
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      toggleDrawer(false);
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

function applyHoursConfig(pickupConfig) {
  if (!pickupConfig) return;
  if (pickupConfig.temporarilyClosed) {
    document.querySelectorAll('.footer-hours-display').forEach(el => {
      el.textContent = 'Temporarily Closed';
    });
    document.querySelectorAll('.hero-hours-display').forEach(el => {
      el.textContent = 'Temporarily Closed';
    });
    document.querySelectorAll('.hero-days-display').forEach(el => {
      el.textContent = '';
    });
    return;
  }

  if (!pickupConfig.businessHours) return;
  
  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const openDays = pickupConfig.openDays || [1, 2, 3, 4, 5, 6];
  let openDaysStr = 'Mon–Sat (Sun Closed)';
  if (openDays.length === 7) {
    openDaysStr = 'Every Day';
  } else if (openDays.length === 6 && !openDays.includes(0)) {
    openDaysStr = 'Mon–Sat (Sun Closed)';
  } else {
    openDaysStr = openDays.map(d => daysMap[d].substring(0,3)).join(', ');
  }
    
  function formatTime(time24) {
    if(!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    let displayH = h % 12;
    displayH = displayH ? displayH : 12;
    return `${String(displayH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  }
  
  const openTime = formatTime(pickupConfig.businessHours.open) || '01:00 PM';
  const closeTime = formatTime(pickupConfig.businessHours.close) || '10:30 PM';
  
  document.querySelectorAll('.footer-hours-display').forEach(el => {
    el.innerHTML = `Monday &ndash; Saturday: ${openTime} &ndash; ${closeTime}<br><strong style="color: #ef4444;">Sunday: Closed</strong>`;
  });
  
  const timeOnlyText = `${openTime} – ${closeTime}`;
  document.querySelectorAll('.hero-hours-display').forEach(el => {
    el.textContent = timeOnlyText;
  });
  
  document.querySelectorAll('.hero-days-display').forEach(el => {
    el.textContent = 'Mon–Sat (Sun Closed)';
  });
}

function syncGlobalBusinessHours() {
  try {
    const cached = localStorage.getItem('pickupConfig');
    if (cached) {
      applyHoursConfig(JSON.parse(cached));
    }
  } catch (e) {}

  const isHome = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';
  if (isHome) return;

  const fetchHours = () => {
    getDoc(doc(db, 'settings', 'pickupConfig')).then((docSnap) => {
      if (!docSnap.exists()) return;
      const pickupConfig = docSnap.data();
      try { localStorage.setItem('pickupConfig', JSON.stringify(pickupConfig)); } catch (e) {}
      applyHoursConfig(pickupConfig);
    }).catch(() => {});
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(fetchHours, { timeout: 3500 });
  } else {
    setTimeout(fetchHours, 2000);
  }
}

function initCookieBanner() {
  if (localStorage.getItem('cookieConsent')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie Consent');
  banner.style.cssText = `
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 24px;
    z-index: 9999;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
  `;

  banner.innerHTML = `
    <div style="flex: 1; min-width: 250px;">
      <h3 style="margin: 0 0 8px 0; font-family: 'Barlow Condensed'; letter-spacing: 1px; color: var(--accent);">WE VALUE YOUR PRIVACY</h3>
      <p style="margin: 0; font-size: 14px; color: var(--gray); line-height: 1.5;">
        We use essential cookies to keep items in your cart and keep you logged in. We also use optional analytics cookies to help us improve our menu and website. 
        <a href="/privacy.html" style="color: var(--white); text-decoration: underline;">Read our privacy policy</a>.
      </p>
    </div>
    <div style="display: flex; gap: 12px; flex-shrink: 0;">
      <button id="cookie-reject" type="button" class="btn-outline" style="padding: 12px 24px; font-size: 14px;">Reject Non-Essential</button>
      <button id="cookie-accept" type="button" class="btn-primary" style="padding: 12px 24px;">Accept All</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('cookie-accept').addEventListener('click', () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ essential: true, analytics: true }));
    banner.remove();
    initAnalytics(); // Start tracking immediately
  });

  document.getElementById('cookie-reject').addEventListener('click', () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ essential: true, analytics: false }));
    banner.remove();
  });
}

function initAnalytics() {
  const measurementId = 'G-KMWPNQK580';
  
  // Prevent duplicate initialization site-wide
  if (window.__gtagInitialized || document.querySelector(`script[src*="${measurementId}"]`)) {
    return;
  }
  window.__gtagInitialized = true;
  
  const injectGtag = () => {
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = gtag;

    gtag('consent', 'update', {
      'analytics_storage': 'granted'
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', measurementId);
    console.log("Analytics initialized.");
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(injectGtag, { timeout: 3000 });
  } else {
    setTimeout(injectGtag, 1500);
  }
}
