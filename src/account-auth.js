import './account-auth.css';
import { auth } from './auth.js';
import { app } from './firebase.js';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  iconBolt,
  iconCard,
  iconCrown,
  iconAward,
  iconMedal,
  iconFileText,
  iconSparkle,
  iconUser,
  iconX
} from './icons.js';

const functions = getFunctions(app);
const lookupCustomer = httpsCallable(functions, 'lookupCustomer');
const getOrderHistory = httpsCallable(functions, 'getOrderHistory');
const setCustomerPin = httpsCallable(functions, 'setCustomerPin');
const getAuthCustomerProfile = httpsCallable(functions, 'getAuthCustomerProfile');
const syncAuthCustomer = httpsCallable(functions, 'syncAuthCustomer');
const removeSavedCard = httpsCallable(functions, 'removeSavedCard');

// Module state
let activeUser = null;
let activeCustomer = null;
let recentOrders = [];
const authListeners = new Set();

/**
 * Normalizes phone numbers
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

function formatPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone || '';
}

function getTierIcon(tier, size = 16) {
  const t = (tier || '').toLowerCase();
  if (t.includes('gold')) return iconCrown(size);
  if (t.includes('silver')) return iconAward(size);
  return iconMedal(size);
}

function getTierProgress(points) {
  const pts = typeof points === 'number' ? points : 0;
  if (pts >= 1500) {
    return { currentTier: 'Gold', nextTier: 'VIP Tier', target: pts, percent: 100, remaining: 0 };
  }
  if (pts >= 500) {
    const needed = 1500 - pts;
    const progress = Math.min(100, Math.round(((pts - 500) / 1000) * 100));
    return { currentTier: 'Silver', nextTier: 'Gold', target: 1500, percent: progress, remaining: needed };
  }
  const needed = 500 - pts;
  const progress = Math.min(100, Math.round((pts / 500) * 100));
  return { currentTier: 'Bronze', nextTier: 'Silver', target: 500, percent: progress, remaining: needed };
}

/**
 * Injects DOM Elements for Auth Modal and Account Drawer
 */
function injectDomElements() {
  if (document.getElementById('auth-modal')) return;

  // 1. Auth Modal
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'auth-modal';
  modalOverlay.className = 'auth-modal-overlay';
  modalOverlay.setAttribute('role', 'dialog');
  modalOverlay.setAttribute('aria-modal', 'true');
  modalOverlay.setAttribute('aria-label', 'Sign In');
  modalOverlay.innerHTML = `
    <div class="auth-modal-card">
      <button class="auth-modal-close" id="auth-modal-close-btn" type="button" aria-label="Close modal">&times;</button>
      
      <!-- Step 1: Sign in with Google / Apple / Phone -->
      <div id="auth-step-signin">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="/logo.webp" alt="Bigi Awasaana" style="height: 48px; width: auto; margin-bottom: 12px;">
          <h2 style="font-family: 'Barlow Condensed'; font-size: 26px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: 0.5px;">WELCOME TO BIGI AWASAANA</h2>
          <p style="font-size: 14px; color: var(--gray, #999); margin: 0; line-height: 1.4;">Sign in for 1-tap checkout, order tracking, and to earn loyalty rewards.</p>
        </div>

        <!-- 1-Tap Google Button -->
        <button class="auth-social-btn google-btn" id="btn-auth-google">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          Continue with Google
        </button>

        <!-- 1-Tap Apple Button -->
        <button class="auth-social-btn apple-btn" id="btn-auth-apple">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.64 1.35-.58.66-1.08 1.73-0.95 2.76 1 .08 2.04-.51 2.66-1.26z"/></svg>
          Continue with Apple
        </button>

        <div class="auth-divider"><span>OR USE PHONE NUMBER</span></div>

        <!-- Phone & PIN Form -->
        <div id="auth-phone-form">
          <div class="auth-input-group">
            <label for="auth-phone-input">Mobile Phone</label>
            <input type="tel" id="auth-phone-input" placeholder="(123) 456-7890">
          </div>
          <div class="auth-input-group" id="auth-pin-group" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label for="auth-pin-input" style="margin: 0;">4-Digit PIN</label>
              <button type="button" id="btn-forgot-pin" style="background: none; border: none; color: var(--accent, #ff4500); font-size: 11px; cursor: pointer; text-decoration: underline;">Need a PIN?</button>
            </div>
            <input type="password" id="auth-pin-input" maxlength="4" placeholder="••••" inputmode="numeric">
          </div>
          <div id="auth-error-msg" style="color: #ef4444; font-size: 13px; margin-bottom: 12px; display: none;"></div>
          <button class="btn-primary" id="btn-phone-continue" style="width: 100%; padding: 12px; font-weight: 700; letter-spacing: 1px;">CONTINUE →</button>
        </div>
      </div>

      <!-- Step 2: Link Phone for Social Sign-In -->
      <div id="auth-step-link-phone" style="display: none;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: flex; justify-content: center; margin-bottom: 8px; color: var(--accent, #ff4500);">${iconSparkle(36)}</div>
          <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; font-weight: 700; margin: 0 0 6px 0; color: #ffffff;">ALMOST DONE!</h2>
          <p style="font-size: 14px; color: var(--gray, #999); margin: 0; line-height: 1.4;">
            Enter your mobile phone number to connect your order history and receive <strong style="color: var(--accent, #ff4500);">100 Welcome Points</strong>!
          </p>
        </div>
        <div class="auth-input-group">
          <label for="auth-link-phone-input">Your Mobile Phone</label>
          <input type="tel" id="auth-link-phone-input" placeholder="(123) 456-7890">
        </div>
        <div id="auth-link-error-msg" style="color: #ef4444; font-size: 13px; margin-bottom: 12px; display: none;"></div>
        <button class="btn-primary" id="btn-submit-link-phone" style="width: 100%; padding: 12px; font-weight: 700; letter-spacing: 1px;">SAVE & COMPLETE SIGN-IN →</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlay);

  // 2. Account Drawer Backdrop & Drawer
  const drawerBackdrop = document.createElement('div');
  drawerBackdrop.id = 'account-drawer-backdrop';
  drawerBackdrop.className = 'account-drawer-backdrop';
  document.body.appendChild(drawerBackdrop);

  const accountDrawer = document.createElement('div');
  accountDrawer.id = 'account-drawer';
  accountDrawer.className = 'account-drawer';
  accountDrawer.setAttribute('role', 'dialog');
  accountDrawer.setAttribute('aria-modal', 'true');
  accountDrawer.setAttribute('aria-label', 'Account and Rewards');
  accountDrawer.innerHTML = `
    <div class="account-drawer-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div id="drawer-avatar" style="width: 44px; height: 44px; border-radius: 50%; background: var(--accent, #ff4500); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; color: #fff; overflow: hidden;">
          ${iconUser(22)}
        </div>
        <div>
          <div id="drawer-name" style="font-size: 17px; font-weight: 700; color: #fff;">Customer</div>
          <div id="drawer-phone-email" style="font-size: 12px; color: var(--gray, #b5b5b5);">phone / email</div>
        </div>
      </div>
      <button id="account-drawer-close-btn" type="button" aria-label="Close account panel" style="background: none; border: none; color: #b5b5b5; font-size: 20px; cursor: pointer; padding: 6px; display: flex; align-items: center;"><span aria-hidden="true">${iconX(20)}</span></button>
    </div>

    <div class="account-drawer-body">
      <!-- Loyalty Card -->
      <div class="account-loyalty-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #ff4500; font-weight: 700; margin-bottom: 4px;">REWARDS MEMBERSHIP</div>
            <div id="drawer-tier-name" style="font-size: 22px; font-weight: 800; font-family: 'Barlow Condensed'; letter-spacing: 1px;">BRONZE MEMBER</div>
          </div>
          <div style="text-align: right;">
            <div id="drawer-points-num" style="font-size: 28px; font-weight: 900; color: #fff; line-height: 1; font-family: 'Barlow Condensed';">0</div>
            <div style="font-size: 11px; color: #aaa; text-transform: uppercase;">Points</div>
          </div>
        </div>

        <div class="account-progress-track">
          <div id="drawer-progress-fill" class="account-progress-fill" style="width: 10%;"></div>
        </div>
        <div id="drawer-progress-text" style="font-size: 12px; color: #b5b5b5; display: flex; justify-content: space-between;">
          <span>Tier Progress</span>
          <span>500 pts to Silver</span>
        </div>

        <!-- Rewards Status Teaser -->
        <div id="drawer-rewards-section" style="margin-top: 14px; background: rgba(255, 69, 0, 0.08); border: 1px solid rgba(255, 69, 0, 0.3); border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #ff4500; letter-spacing: 0.5px; display: flex; align-items: center; gap: 5px;">
              <span>🎁</span> <span>YOUR REWARDS</span>
            </div>
            <a href="/order-history.html" style="font-size: 11px; color: #fff; text-decoration: underline; font-weight: 600;">View All →</a>
          </div>
          <div id="drawer-rewards-status" style="font-size: 13px; color: #ddd; font-weight: 500; line-height: 1.4;">
            Sign in or order to earn reward points!
          </div>
        </div>
      </div>

      <!-- Quick Reorder Section -->
      <div id="drawer-reorder-section" style="margin-bottom: 24px;">
        <div class="account-section-title" style="display: flex; align-items: center; gap: 6px;">${iconBolt(15)} QUICK REORDER</div>
        <div id="drawer-recent-order-card" class="account-action-card">
          <div style="font-size: 13px; color: #b5b5b5; margin-bottom: 8px;" id="drawer-recent-order-date">Recent Order</div>
          <div style="font-size: 14px; color: #fff; font-weight: 600; margin-bottom: 12px;" id="drawer-recent-order-items">Loading past favorites...</div>
          <button id="drawer-quick-reorder-btn" class="btn-outline" style="width: 100%; padding: 8px 14px; font-size: 13px; font-weight: 600;">+ Reorder to Bag</button>
        </div>
      </div>

      <!-- Saved Payment Methods -->
      <div style="margin-bottom: 24px;">
        <div class="account-section-title" style="display: flex; align-items: center; gap: 6px;">${iconCard(15)} SAVED PAYMENT METHODS</div>
        <div id="drawer-saved-cards-list">
          <div style="font-size: 13px; color: #b5b5b5; font-style: italic;">No saved cards. Check "Save this card" at checkout for 1-tap ordering.</div>
        </div>
      </div>

      <!-- Links -->
      <div style="margin-bottom: 16px;">
        <div class="account-section-title" style="display: flex; align-items: center; gap: 6px;">${iconFileText(15)} ACCOUNT & ORDERS</div>
        <a href="/order-history.html" class="account-action-card" style="display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: #fff;">
          <div>
            <div style="font-weight: 600; font-size: 14px;">Full Order History & Live Tracker</div>
            <div style="font-size: 12px; color: #b5b5b5;">View receipts, live statuses, and item breakdowns</div>
          </div>
          <span style="color: var(--accent, #ff4500); font-weight: bold;">→</span>
        </a>
      </div>
    </div>

    <div class="account-drawer-footer">
      <button id="drawer-sign-out-btn" class="btn-outline" style="width: 100%; padding: 12px; font-size: 14px; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">
        Sign Out
      </button>
    </div>
  `;
  document.body.appendChild(accountDrawer);

  bindModalAndDrawerEvents();
}

/**
 * Binds UI listeners for opening, closing, and submitting modal and drawer
 */
function bindModalAndDrawerEvents() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('auth-modal-close-btn');
  const drawer = document.getElementById('account-drawer');
  const drawerBackdrop = document.getElementById('account-drawer-backdrop');
  const drawerCloseBtn = document.getElementById('account-drawer-close-btn');
  const signOutBtn = document.getElementById('drawer-sign-out-btn');

  // Close Modal
  if (closeBtn) closeBtn.onclick = () => closeAuthModal();
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeAuthModal();
    };
  }

  // Close Drawer
  if (drawerCloseBtn) drawerCloseBtn.onclick = () => closeAccountDrawer();
  if (drawerBackdrop) drawerBackdrop.onclick = () => closeAccountDrawer();

  // Sign Out
  if (signOutBtn) {
    signOutBtn.onclick = async () => {
      activeUser = null;
      activeCustomer = null;
      recentOrders = [];
      try {
        sessionStorage.removeItem('bigi_order_auth');
        sessionStorage.removeItem('bigi_auth_customer');
        localStorage.removeItem('bigi_order_auth');
        localStorage.removeItem('bigi_auth_customer');
      } catch (e) {}
      closeAccountDrawer();
      updateNavbarPills();
      notifyAuthChanged();
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Sign out warning:', e);
      }
    };
  }

  // Phone input formatting
  const phoneInput = document.getElementById('auth-phone-input');
  if (phoneInput) {
    phoneInput.oninput = (e) => {
      const raw = e.target.value;
      const digits = raw.replace(/\D/g, '');
      if (digits.length <= 10) {
        if (digits.length > 6) {
          e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length > 3) {
          e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
          e.target.value = digits;
        }
      }
    };
  }

  const linkPhoneInput = document.getElementById('auth-link-phone-input');
  if (linkPhoneInput) {
    linkPhoneInput.oninput = (e) => {
      const raw = e.target.value;
      const digits = raw.replace(/\D/g, '');
      if (digits.length <= 10) {
        if (digits.length > 6) {
          e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length > 3) {
          e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
          e.target.value = digits;
        }
      }
    };
  }

  // Google Sign-In
  const googleBtn = document.getElementById('btn-auth-google');
  if (googleBtn) {
    googleBtn.onclick = async () => {
      const originalText = googleBtn.innerHTML;
      try {
        googleBtn.innerHTML = 'Connecting with Google...';
        googleBtn.disabled = true;
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        await handleSocialAuthSuccess(userCred.user);
      } catch (err) {
        console.error('Google Sign-in error:', err);
        if (err.code === 'auth/operation-not-allowed') {
          showAuthError('Google sign-in needs to be enabled in Firebase Console. Please sign in below with your Phone & PIN!');
          const phoneInput = document.getElementById('auth-phone-input');
          if (phoneInput) phoneInput.focus();
        } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          showAuthError(err.message || 'Google sign-in failed.');
        }
      } finally {
        googleBtn.innerHTML = originalText;
        googleBtn.disabled = false;
      }
    };
  }

  // Apple Sign-In
  const appleBtn = document.getElementById('btn-auth-apple');
  if (appleBtn) {
    appleBtn.onclick = async () => {
      const originalText = appleBtn.innerHTML;
      try {
        appleBtn.innerHTML = 'Connecting with Apple...';
        appleBtn.disabled = true;
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        const userCred = await signInWithPopup(auth, provider);
        await handleSocialAuthSuccess(userCred.user);
      } catch (err) {
        console.error('Apple Sign-in error:', err);
        if (err.code === 'auth/operation-not-allowed') {
          showAuthError('Apple sign-in needs to be enabled in Firebase Console. Please sign in below with your Phone & PIN!');
          const phoneInput = document.getElementById('auth-phone-input');
          if (phoneInput) phoneInput.focus();
        } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          showAuthError(err.message || 'Apple sign-in failed.');
        }
      } finally {
        appleBtn.innerHTML = originalText;
        appleBtn.disabled = false;
      }
    };
  }

  // Phone Continue Button
  const phoneBtn = document.getElementById('btn-phone-continue');
  const pinGroup = document.getElementById('auth-pin-group');
  const pinInput = document.getElementById('auth-pin-input');
  const pinLabel = pinGroup ? pinGroup.querySelector('label') : null;
  let phoneLookupDone = false;
  let isCreatingPin = false;

  if (phoneBtn) {
    phoneBtn.onclick = async () => {
      const phoneVal = phoneInput ? phoneInput.value.trim() : '';
      const digits = normalizePhone(phoneVal);

      if (digits.length < 10) {
        showAuthError('Please enter a valid 10-digit mobile phone number.');
        return;
      }

      hideAuthError();

      if (!phoneLookupDone) {
        phoneBtn.innerHTML = 'Checking phone...';
        phoneBtn.disabled = true;
        try {
          const res = await lookupCustomer({ phone: digits });
          const data = res?.data || {};

          phoneLookupDone = true;
          pinGroup.style.display = 'block';

          if (data.found && data.hasPin) {
            isCreatingPin = false;
            if (pinLabel) pinLabel.textContent = '4-Digit PIN';
            phoneBtn.innerHTML = 'SIGN IN WITH PIN →';
          } else {
            isCreatingPin = true;
            if (pinLabel) pinLabel.textContent = 'Create a 4-Digit PIN (100 Welcome Pts!)';
            phoneBtn.innerHTML = 'CREATE PIN & SIGN IN →';
          }
          phoneBtn.disabled = false;
          pinInput?.focus();
          return;
        } catch (err) {
          console.error('Phone lookup error:', err);
          const rawMsg = err.message || '';
          const friendlyMsg = (rawMsg.toLowerCase() === 'internal' || err.code === 'functions/internal')
            ? 'Unable to connect to service. Please check your connection and try again.'
            : (rawMsg || 'Error checking phone. Try again.');
          showAuthError(friendlyMsg);
          phoneBtn.innerHTML = 'CONTINUE →';
          phoneBtn.disabled = false;
          return;
        }
      }

      // If phone lookup was done and PIN is displayed:
      const pinVal = pinInput ? pinInput.value.trim() : '';
      if (!/^\d{4}$/.test(pinVal)) {
        showAuthError('Please enter a 4-digit numeric PIN.');
        return;
      }

      phoneBtn.innerHTML = isCreatingPin ? 'Creating PIN...' : 'Signing in...';
      phoneBtn.disabled = true;

      try {
        if (isCreatingPin) {
          // Set customer PIN first
          await setCustomerPin({ phone: digits, pin: pinVal });
        }

        const histRes = await getOrderHistory({ phone: digits, pin: pinVal });
        const histData = histRes?.data || {};

        activeCustomer = {
          ...histData.customer,
          phone: digits,
        };
        sessionStorage.setItem('bigi_order_auth', JSON.stringify({ phone: digits, pin: pinVal }));
        sessionStorage.setItem('bigi_auth_customer', JSON.stringify(activeCustomer));

        if (Array.isArray(histData.orders)) {
          recentOrders = histData.orders;
        }

        closeAuthModal();
        updateNavbarPills();
        notifyAuthChanged();
      } catch (err) {
        console.error('PIN verification or setup error:', err);
        const errMsg = err.message || '';
        if (errMsg.includes('permission-denied') || errMsg.toLowerCase().includes('invalid phone or pin')) {
          showAuthError('Incorrect PIN. Please double-check your 4-digit PIN.');
        } else if (errMsg.toLowerCase() === 'internal' || err.code === 'functions/internal') {
          showAuthError('Unable to connect to service. Please check your connection and try again.');
        } else {
          showAuthError(errMsg || 'Error signing in. Please try again.');
        }
      } finally {
        phoneBtn.innerHTML = isCreatingPin ? 'CREATE PIN & SIGN IN →' : 'SIGN IN WITH PIN →';
        phoneBtn.disabled = false;
      }
    };
  }

  // Forgot PIN link
  const forgotPinBtn = document.getElementById('btn-forgot-pin');
  if (forgotPinBtn) {
    forgotPinBtn.onclick = () => {
      const phoneVal = phoneInput ? phoneInput.value.trim() : '';
      const digits = normalizePhone(phoneVal);
      window.location.href = `/order-history.html?phone=${encodeURIComponent(digits)}`;
    };
  }

  // Submit Link Phone (for Social Sign-In users without phone)
  const submitLinkBtn = document.getElementById('btn-submit-link-phone');
  if (submitLinkBtn) {
    submitLinkBtn.onclick = async () => {
      const linkPhoneVal = linkPhoneInput ? linkPhoneInput.value.trim() : '';
      const digits = normalizePhone(linkPhoneVal);
      if (digits.length < 10) {
        showLinkError('Please enter a valid 10-digit mobile number.');
        return;
      }

      submitLinkBtn.innerHTML = 'Saving...';
      submitLinkBtn.disabled = true;

      try {
        const res = await syncAuthCustomer({
          phone: digits,
          email: activeUser?.email || '',
          name: activeUser?.displayName || '',
          photoUrl: activeUser?.photoURL || null,
        });

        if (res?.data?.success) {
          activeCustomer = res.data.customer;
          sessionStorage.setItem('bigi_auth_customer', JSON.stringify(activeCustomer));
          closeAuthModal();
          updateNavbarPills();
          notifyAuthChanged();
          openAccountDrawer();
        } else {
          showLinkError('Could not link phone. Please try again.');
        }
      } catch (err) {
        console.error('Sync auth customer error:', err);
        showLinkError(err.message || 'Error linking phone.');
      } finally {
        submitLinkBtn.innerHTML = 'SAVE & COMPLETE SIGN-IN →';
        submitLinkBtn.disabled = false;
      }
    };
  }

  // Quick Reorder button in drawer
  const quickReorderBtn = document.getElementById('drawer-quick-reorder-btn');
  if (quickReorderBtn) {
    quickReorderBtn.onclick = () => {
      if (recentOrders.length > 0) {
        const first = recentOrders[0];
        window.location.href = `/menu?reorder=${encodeURIComponent(first.id)}`;
      } else {
        window.location.href = '/menu';
      }
    };
  }
}

/**
 * Handles successful social authentication (Google or Apple)
 */
async function handleSocialAuthSuccess(user) {
  activeUser = user;
  hideAuthError();

  try {
    const res = await getAuthCustomerProfile();
    const data = res?.data || {};

    if (data.authenticated && data.found && data.customer) {
      // Profile already linked to phone!
      activeCustomer = data.customer;
      sessionStorage.setItem('bigi_auth_customer', JSON.stringify(activeCustomer));
      closeAuthModal();
      updateNavbarPills();
      notifyAuthChanged();
      // Fetch recent orders for reorder
      fetchDrawerOrders(activeCustomer.phone);
    } else {
      // Show Step 2 to link phone
      document.getElementById('auth-step-signin').style.display = 'none';
      document.getElementById('auth-step-link-phone').style.display = 'block';
    }
  } catch (err) {
    console.error('Error fetching auth customer profile:', err);
    // Fallback to phone link step
    document.getElementById('auth-step-signin').style.display = 'none';
    document.getElementById('auth-step-link-phone').style.display = 'block';
  }
}

async function fetchDrawerOrders(phone) {
  if (!phone) return;
  try {
    const storedAuth = JSON.parse(sessionStorage.getItem('bigi_order_auth') || '{}');
    if (storedAuth.pin) {
      const res = await getOrderHistory({ phone, pin: storedAuth.pin });
      if (res?.data?.orders) {
        recentOrders = res.data.orders;
        updateDrawerRecentOrders();
      }
    }
  } catch (e) {
    // Non-fatal
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error-msg');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function hideAuthError() {
  const el = document.getElementById('auth-error-msg');
  if (el) el.style.display = 'none';
}

function showLinkError(msg) {
  const el = document.getElementById('auth-link-error-msg');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

export function openAuthModal() {
  injectDomElements();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (typeof closeAccountDrawer === 'function') closeAccountDrawer();
      if (typeof closeAuthModal === 'function') closeAuthModal();
    }
  });
  const modal = document.getElementById('auth-modal');
  const stepSignin = document.getElementById('auth-step-signin');
  const stepLink = document.getElementById('auth-step-link-phone');

  if (stepSignin) stepSignin.style.display = 'block';
  if (stepLink) stepLink.style.display = 'none';
  hideAuthError();

  if (modal) modal.classList.add('active');
}

export function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('active');
}

export function openAccountDrawer() {
  injectDomElements();
  populateAccountDrawer();
  const drawer = document.getElementById('account-drawer');
  const backdrop = document.getElementById('account-drawer-backdrop');
  if (drawer) drawer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
}

export function closeAccountDrawer() {
  const drawer = document.getElementById('account-drawer');
  const backdrop = document.getElementById('account-drawer-backdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
}

function populateAccountDrawer() {
  if (!activeCustomer && !activeUser) return;

  const name = activeCustomer?.name || activeUser?.displayName || 'Valued Guest';
  const email = activeCustomer?.email || activeUser?.email || '';
  const phone = formatPhone(activeCustomer?.phone || '');
  const points = activeCustomer?.loyaltyPoints || 0;
  const tier = activeCustomer?.tier || 'bronze';
  const photoUrl = activeCustomer?.photoUrl || activeUser?.photoURL;

  // Header avatar
  const avatarEl = document.getElementById('drawer-avatar');
  if (avatarEl) {
    if (photoUrl) {
      avatarEl.innerHTML = `<img src="${photoUrl}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      const initial = name.trim().charAt(0).toUpperCase() || 'G';
      avatarEl.textContent = initial;
    }
  }

  // Name & contact
  const nameEl = document.getElementById('drawer-name');
  if (nameEl) nameEl.textContent = name;

  const phoneEmailEl = document.getElementById('drawer-phone-email');
  if (phoneEmailEl) {
    phoneEmailEl.textContent = [phone, email].filter(Boolean).join(' • ');
  }

  // Tier & points
  const tierIcon = getTierIcon(tier, 20);
  const tierNameEl = document.getElementById('drawer-tier-name');
  if (tierNameEl) tierNameEl.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 8px;">${tierIcon} ${tier.toUpperCase()} MEMBER</span>`;

  const ptsNumEl = document.getElementById('drawer-points-num');
  if (ptsNumEl) ptsNumEl.textContent = points;

  const progress = getTierProgress(points);
  const fillEl = document.getElementById('drawer-progress-fill');
  if (fillEl) fillEl.style.width = `${progress.percent}%`;

  const progTextEl = document.getElementById('drawer-progress-text');
  if (progTextEl) {
    progTextEl.innerHTML = `
      <span>${progress.currentTier} Tier</span>
      <span>${progress.remaining > 0 ? `${progress.remaining} pts to ${progress.nextTier}` : 'Top Tier Reached!'}</span>
    `;
  }

  const drawerRewardsStatusEl = document.getElementById('drawer-rewards-status');
  if (drawerRewardsStatusEl) {
    if (points >= 50) {
      drawerRewardsStatusEl.innerHTML = `<span style="color: #4caf50; font-weight: 700;">🎉 Rewards Unlocked!</span> You have <strong>${points} pts</strong> available to claim free items. <a href="/order-history.html" style="color: var(--accent); font-weight: 700; text-decoration: underline;">Claim in Rewards &rarr;</a>`;
    } else {
      const needed = 50 - points;
      drawerRewardsStatusEl.innerHTML = `<span style="color: #ff9800; font-weight: 700;">🔒 ${needed} pts to next reward!</span> Earn 10 pts per $1 spent to unlock your first treat.`;
    }
  }

  // Saved Cards
  const cardsListEl = document.getElementById('drawer-saved-cards-list');
  if (cardsListEl) {
    const savedCards = Array.isArray(activeCustomer?.savedCards) ? activeCustomer.savedCards : [];
    if (savedCards.length === 0) {
      cardsListEl.innerHTML = `<div style="font-size: 13px; color: #b5b5b5; font-style: italic;">No saved cards. Check "Save this card" at checkout for 1-tap ordering.</div>`;
    } else {
      cardsListEl.innerHTML = savedCards.map(card => `
        <div class="account-saved-card-row">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display: flex; align-items: center; color: var(--accent);">${iconCard(20)}</span>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: #fff;">${card.brand || 'Card'} ending in ${card.last4 || '••••'}</div>
              ${card.expMonth && card.expYear ? `<div style="font-size: 11px; color: #b5b5b5;">Expires ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}</div>` : ''}
            </div>
          </div>
          <button class="account-delete-card-btn" data-card-id="${card.id}" title="Remove card">${iconX(14)}</button>
        </div>
      `).join('');

      cardsListEl.querySelectorAll('.account-delete-card-btn').forEach(btn => {
        btn.onclick = async () => {
          const cardId = btn.getAttribute('data-card-id');
          if (confirm('Are you sure you want to remove this saved card?')) {
            try {
              const storedAuth = JSON.parse(sessionStorage.getItem('bigi_order_auth') || '{}');
              await removeSavedCard({
                phone: activeCustomer.phone,
                pin: storedAuth.pin || '0000',
                cardId
              });
              activeCustomer.savedCards = activeCustomer.savedCards.filter(c => c.id !== cardId);
              populateAccountDrawer();
            } catch (err) {
              alert('Could not remove card: ' + (err.message || 'Error'));
            }
          }
        };
      });
    }
  }

  updateDrawerRecentOrders();
}

function updateDrawerRecentOrders() {
  const cardEl = document.getElementById('drawer-recent-order-card');
  const dateEl = document.getElementById('drawer-recent-order-date');
  const itemsEl = document.getElementById('drawer-recent-order-items');

  if (!cardEl || !itemsEl) return;

  if (recentOrders.length === 0) {
    itemsEl.textContent = 'Explore our freshly grilled kabobs, wraps, and platters.';
    if (dateEl) dateEl.textContent = 'Ready to order?';
  } else {
    const first = recentOrders[0];
    const itemNames = (first.items || []).map(i => `${i.quantity || 1}x ${i.name}`).join(', ');
    itemsEl.textContent = itemNames || 'Past favorites';
    if (dateEl) {
      dateEl.textContent = `Last ordered • Total: $${typeof first.total === 'number' ? first.total.toFixed(2) : first.total}`;
    }
  }
}

/**
 * Updates navbar account pill state on desktop and mobile drawer
 */
export function updateNavbarPills() {
  injectDomElements();

  const isAuth = Boolean(activeCustomer || activeUser);
  const name = activeCustomer?.name || activeUser?.displayName || (activeUser?.email ? activeUser.email.split('@')[0] : 'Friend');
  const firstName = name.split(' ')[0] || 'Friend';
  const points = activeCustomer?.loyaltyPoints || 0;
  const tier = activeCustomer?.tier || 'bronze';
  const tierIcon = getTierIcon(tier, 14);
  const photoUrl = activeCustomer?.photoUrl || activeUser?.photoURL;

  // 1. Desktop Navbar Link
  let navAccountBtn = document.getElementById('nav-account-btn');
  if (!navAccountBtn) {
    const navLinks = document.querySelector('.site-nav .container .nav-links');
    if (navLinks) {
      const li = document.createElement('li');
      navAccountBtn = document.createElement('button');
      navAccountBtn.id = 'nav-account-btn';
      navAccountBtn.className = 'nav-account-pill';
      li.appendChild(navAccountBtn);

      // Insert before phone CTA
      const lastLi = navLinks.lastElementChild;
      if (lastLi) {
        navLinks.insertBefore(li, lastLi);
      } else {
        navLinks.appendChild(li);
      }
    }
  }

  if (navAccountBtn) {
    if (isAuth) {
      navAccountBtn.innerHTML = `
        ${photoUrl ? `<img src="${photoUrl}" class="pill-avatar" alt="${name}">` : `<span class="pill-avatar">${firstName.charAt(0)}</span>`}
        <span class="pill-name">${firstName}</span>
        <span class="pill-badge" style="display: inline-flex; align-items: center; gap: 4px;">${tierIcon} ${points} pts</span>
      `;
      navAccountBtn.onclick = () => openAccountDrawer();
    } else {
      navAccountBtn.innerHTML = `
        <span style="display: flex; align-items: center;">${iconUser(15)}</span>
        <span>Sign In</span>
      `;
      navAccountBtn.onclick = () => openAuthModal();
    }
  }

  // 2. Mobile Navbar Header Button (compact, responsive Sign In button next to hamburger)
  let mobileHeaderBtn = document.getElementById('nav-mobile-signin-btn');
  if (!mobileHeaderBtn) {
    const hamburger = document.getElementById('nav-hamburger');
    if (hamburger && hamburger.parentElement) {
      mobileHeaderBtn = document.createElement('button');
      mobileHeaderBtn.id = 'nav-mobile-signin-btn';
      mobileHeaderBtn.className = 'nav-mobile-signin-btn';
      mobileHeaderBtn.type = 'button';
      mobileHeaderBtn.setAttribute('aria-label', 'Account or Sign In');
      hamburger.parentElement.insertBefore(mobileHeaderBtn, hamburger);
    }
  }

  if (mobileHeaderBtn) {
    if (isAuth) {
      mobileHeaderBtn.innerHTML = `
        ${photoUrl ? `<img src="${photoUrl}" class="pill-avatar" alt="${name}">` : `<span class="pill-avatar">${firstName.charAt(0)}</span>`}
        <span class="pill-name">${firstName}</span>
        <span class="pill-badge">${tierIcon} ${points}p</span>
      `;
      mobileHeaderBtn.onclick = (e) => {
        e.preventDefault();
        openAccountDrawer();
      };
    } else {
      mobileHeaderBtn.innerHTML = `
        <span style="display: flex; align-items: center;">${iconUser(15)}</span>
        <span class="nav-signin-text">Sign In</span>
      `;
      mobileHeaderBtn.onclick = (e) => {
        e.preventDefault();
        openAuthModal();
      };
    }
  }

  // 3. Mobile Drawer Button
  let mobileAccountBtn = document.getElementById('mobile-nav-account-btn');
  if (!mobileAccountBtn) {
    const mobileDrawer = document.getElementById('nav-mobile-drawer');
    if (mobileDrawer) {
      mobileAccountBtn = document.createElement('button');
      mobileAccountBtn.id = 'mobile-nav-account-btn';
      mobileAccountBtn.className = 'mobile-nav-account-btn';
      // Insert at the top of drawer
      mobileDrawer.insertBefore(mobileAccountBtn, mobileDrawer.firstChild);
    }
  }

  if (mobileAccountBtn) {
    if (isAuth) {
      mobileAccountBtn.innerHTML = `
        <span style="display: flex; align-items: center; color: var(--accent);">${getTierIcon(tier, 20)}</span>
        <div>
          <div style="color: #fff; font-weight: 700;">${name}</div>
          <div style="font-size: 12px; color: var(--accent, #ff4500);">${points} Points • ${tier.toUpperCase()} Member</div>
        </div>
      `;
      mobileAccountBtn.onclick = () => {
        const mobileDrawer = document.getElementById('nav-mobile-drawer');
        const hamburger = document.getElementById('nav-hamburger');
        if (mobileDrawer) mobileDrawer.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open');
        openAccountDrawer();
      };
    } else {
      mobileAccountBtn.innerHTML = `
        <span style="display: flex; align-items: center; color: var(--accent);">${iconUser(20)}</span>
        <div>
          <div style="color: #fff; font-weight: 700;">Sign In / Rewards</div>
          <div style="font-size: 12px; color: #b5b5b5;">Earn points & 1-tap checkout</div>
        </div>
      `;
      mobileAccountBtn.onclick = () => {
        const mobileDrawer = document.getElementById('nav-mobile-drawer');
        const hamburger = document.getElementById('nav-hamburger');
        if (mobileDrawer) mobileDrawer.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open');
        openAuthModal();
      };
    }
  }
}

/**
 * Returns current customer profile for checkout auto-fill
 */
export function getLoggedInCustomer() {
  if (activeCustomer) return activeCustomer;
  if (activeUser) {
    return {
      name: activeUser.displayName || '',
      email: activeUser.email || '',
      phone: activeUser.phoneNumber || '',
      photoUrl: activeUser.photoURL || null,
      loyaltyPoints: 0,
      tier: 'bronze',
    };
  }
  return null;
}

/**
 * Subscribes to customer authentication changes
 */
export function onAuthCustomerChanged(callback) {
  if (typeof callback === 'function') {
    authListeners.add(callback);
    callback(getLoggedInCustomer());
  }
}

function notifyAuthChanged() {
  const current = getLoggedInCustomer();
  authListeners.forEach(fn => {
    try { fn(current); } catch (e) { console.error(e); }
  });
  window.dispatchEvent(new CustomEvent('bigi:auth-changed', { detail: current }));
}

/**
 * Initializes Account Auth System on page load
 */
export function initAccountAuth() {
  injectDomElements();

  // 1. Check for stored session customer
  try {
    const storedCustomer = sessionStorage.getItem('bigi_auth_customer');
    if (storedCustomer) {
      activeCustomer = JSON.parse(storedCustomer);
    }
  } catch (e) {}

  updateNavbarPills();

  // 2. Listen to Firebase Auth state
  onAuthStateChanged(auth, async (user) => {
    activeUser = user;
    if (user) {
      try {
        const res = await getAuthCustomerProfile();
        const data = res?.data || {};
        if (data.authenticated && data.found && data.customer) {
          activeCustomer = data.customer;
          sessionStorage.setItem('bigi_auth_customer', JSON.stringify(activeCustomer));
          fetchDrawerOrders(activeCustomer.phone);
        } else if (data.authenticated && (!activeCustomer || !activeCustomer.phone)) {
          const authName = user.displayName || (user.email ? user.email.split('@')[0] : 'Friend');
          activeCustomer = {
            name: authName,
            email: user.email || '',
            phone: '',
            photoUrl: user.photoURL || null,
            loyaltyPoints: 100,
            tier: 'bronze',
            totalOrders: 0,
            savedCards: [],
            needsPhoneLink: true,
          };
          sessionStorage.setItem('bigi_auth_customer', JSON.stringify(activeCustomer));
        }
      } catch (err) {
        console.warn('Failed to load auth customer profile on state change:', err);
      }
    } else {
      // If not Firebase Auth, check if Phone + PIN session exists
      const storedPhoneAuth = sessionStorage.getItem('bigi_order_auth');
      if (storedPhoneAuth) {
        try {
          const { phone, pin } = JSON.parse(storedPhoneAuth);
          if (phone && pin) {
            const histRes = await getOrderHistory({ phone, pin });
            // Confirm phone auth wasn't signed out while awaiting network response
            if (sessionStorage.getItem('bigi_order_auth') && histRes?.data?.customer) {
              activeCustomer = { ...histRes.data.customer, phone };
              sessionStorage.setItem('bigi_auth_customer', JSON.stringify(activeCustomer));
              recentOrders = histRes.data.orders || [];
              updateNavbarPills();
              notifyAuthChanged();
              return;
            }
          }
        } catch (e) {}
      }
      activeCustomer = null;
      recentOrders = [];
      try {
        sessionStorage.removeItem('bigi_order_auth');
        sessionStorage.removeItem('bigi_auth_customer');
      } catch (e) {}
    }
    updateNavbarPills();
    notifyAuthChanged();
  });
}
