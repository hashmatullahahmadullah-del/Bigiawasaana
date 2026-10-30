import './style.css';
import './mobile-nav.css';
import { initNav } from './nav.js';
import { db, app } from './firebase.js';
import { auth } from './auth.js';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  iconAlertTriangle,
  iconAward,
  iconCard,
  iconCheck,
  iconCheckCircle,
  iconClock,
  iconCrown,
  iconFileText,
  iconFlame,
  iconLock,
  iconMedal,
  iconPackage,
  iconRefresh,
  iconSparkle,
  iconTruck,
  iconX,
  iconGift,
  iconDrinkCan,
  iconSkewer,
  iconVoucher,
  getRewardItemIcon,
  renderTierBadge
} from './icons.js';

// Initialize Firebase Cloud Functions
const functions = getFunctions(app);

// Callable function references
const lookupCustomer = httpsCallable(functions, 'lookupCustomer');
const getOrderHistory = httpsCallable(functions, 'getOrderHistory');
const setCustomerPin = httpsCallable(functions, 'setCustomerPin');
const removeSavedCard = httpsCallable(functions, 'removeSavedCard');
const redeemLoyaltyReward = httpsCallable(functions, 'redeemLoyaltyReward');

// Customer Rewards State
let availableRewards = [];
let currentRewardsFilter = 'all';
let selectedRewardToRedeem = null;
let customerRewardsUnsub = null;

// State
let currentPhone = '';
let currentPin = '';
let customerData = null;
let foodOrders = [];
let shopOrders = [];
let activeTab = 'food';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize shared website navigation (mobile drawer, hamburger, global hours sync)
  try {
    initNav('orders');
  } catch (navErr) {
    console.error('Failed to initialize nav:', navErr);
  }

  // DOM Elements - Sections
  const verificationSection = document.getElementById('verification-section');
  const historySection = document.getElementById('history-section');
  const verifyLoading = document.getElementById('verify-loading');
  const alertBox = document.getElementById('status-alert');
  const alertIcon = document.getElementById('alert-icon');
  const alertMsg = document.getElementById('alert-message');

  // DOM Elements - Forms & Steps
  const formPhone = document.getElementById('form-phone');
  const formPin = document.getElementById('form-pin');
  const formSetPin = document.getElementById('form-set-pin');
  const stateNotFound = document.getElementById('state-not-found');

  const inputPhone = document.getElementById('input-phone');
  const inputPin = document.getElementById('input-pin');
  const inputNewPin = document.getElementById('input-new-pin');

  const btnPhoneSubmit = document.getElementById('btn-phone-submit');
  const btnPinSubmit = document.getElementById('btn-pin-submit');
  const btnSetPinSubmit = document.getElementById('btn-set-pin-submit');
  const btnBackToPhone = document.getElementById('btn-back-to-phone');
  const btnBackFromSetPin = document.getElementById('btn-back-from-set-pin');
  const btnRetryPhone = document.getElementById('btn-retry-phone');
  const btnSwitchToSetPin = document.getElementById('btn-switch-to-set-pin');
  const btnSwitchToEnterPin = document.getElementById('btn-switch-to-enter-pin');
  const linkFirstTime = document.getElementById('link-first-time');
  const btnSwitchAccount = document.getElementById('btn-switch-account');

  // DOM Elements - Profile & Loyalty
  const profileName = document.getElementById('profile-name');
  const profilePhone = document.getElementById('profile-phone');
  const profileAvatar = document.getElementById('profile-avatar');
  const profileTierBadge = document.getElementById('profile-tier-badge');
  const tierEmoji = document.getElementById('tier-emoji');
  const tierText = document.getElementById('tier-text');
  const statPoints = document.getElementById('stat-points');
  const statTotalOrders = document.getElementById('stat-total-orders');
  const statMemberSince = document.getElementById('stat-member-since');
  const progressTitle = document.getElementById('progress-title');
  const progressSubtitle = document.getElementById('progress-subtitle');
  const progressFill = document.getElementById('progress-fill');

  // DOM Elements - Tabs & Lists
  const tabBtnFood = document.getElementById('tab-btn-food');
  const tabBtnShop = document.getElementById('tab-btn-shop');
  const tabPaneFood = document.getElementById('tab-pane-food');
  const tabPaneShop = document.getElementById('tab-pane-shop');
  const badgeFoodCount = document.getElementById('badge-food-count');
  const badgeShopCount = document.getElementById('badge-shop-count');
  const foodOrdersList = document.getElementById('food-orders-list');
  const shopOrdersList = document.getElementById('shop-orders-list');
  const foodOrdersEmpty = document.getElementById('food-orders-empty');
  const shopOrdersEmpty = document.getElementById('shop-orders-empty');

  // ─── Format Phone Input As User Types ───
  inputPhone.addEventListener('input', (e) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumber(raw);
    e.target.value = formatted;
  });

  // Limit PIN inputs to digits only
  [inputPin, inputNewPin].forEach(inputEl => {
    if (!inputEl) return;
    inputEl.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
  });

  // ─── Check URL Query Params & Saved Session ───
  const urlParams = new URLSearchParams(window.location.search);
  const paramPhone = urlParams.get('phone');
  if (paramPhone) {
    inputPhone.value = formatPhoneNumber(paramPhone);
  }

  // Optional Phone Link Elements
  const phoneLinkBanner = document.getElementById('phone-link-banner');
  const inputLinkPhone = document.getElementById('input-link-phone');
  const btnSaveLinkedPhone = document.getElementById('btn-save-linked-phone');
  const linkPhoneFeedback = document.getElementById('link-phone-feedback');

  if (inputLinkPhone) {
    inputLinkPhone.addEventListener('input', (e) => {
      e.target.value = formatPhoneNumber(e.target.value);
    });
  }

  if (btnSaveLinkedPhone) {
    btnSaveLinkedPhone.addEventListener('click', async () => {
      const raw = inputLinkPhone?.value || '';
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 10) {
        if (linkPhoneFeedback) {
          linkPhoneFeedback.style.display = 'block';
          linkPhoneFeedback.style.color = '#ef4444';
          linkPhoneFeedback.textContent = 'Please enter a valid 10-digit mobile phone number.';
        }
        return;
      }
      btnSaveLinkedPhone.textContent = 'Connecting...';
      btnSaveLinkedPhone.disabled = true;
      try {
        const syncAuthCustomer = httpsCallable(functions, 'syncAuthCustomer');
        const syncRes = await syncAuthCustomer({
          phone: digits,
          email: auth.currentUser?.email || customerData?.email || '',
          name: auth.currentUser?.displayName || customerData?.name || '',
          photoUrl: auth.currentUser?.photoURL || customerData?.photoUrl || null,
        });
        if (syncRes?.data?.success) {
          if (linkPhoneFeedback) {
            linkPhoneFeedback.style.display = 'flex';
            linkPhoneFeedback.style.alignItems = 'center';
            linkPhoneFeedback.style.gap = '6px';
            linkPhoneFeedback.style.color = '#4ade80';
            linkPhoneFeedback.innerHTML = `${iconCheck(16)} Phone number connected successfully!`;
          }
          currentPhone = digits;
          if (customerData) {
            customerData.phone = digits;
            customerData.needsPhoneLink = false;
            sessionStorage.setItem('bigi_auth_customer', JSON.stringify(customerData));
            renderCustomerLoyalty(customerData);
          }
          setTimeout(() => {
            if (phoneLinkBanner) phoneLinkBanner.style.display = 'none';
          }, 1500);
          loadAuthOrderHistory();
        }
      } catch (err) {
        if (linkPhoneFeedback) {
          linkPhoneFeedback.style.display = 'block';
          linkPhoneFeedback.style.color = '#ef4444';
          linkPhoneFeedback.textContent = err.message || 'Could not connect phone. Try again.';
        }
      } finally {
        btnSaveLinkedPhone.textContent = 'Connect';
        btnSaveLinkedPhone.disabled = false;
      }
    });
  }

  function updatePhoneLinkBanner(cust) {
    if (!phoneLinkBanner) return;
    if (auth.currentUser && (!cust?.phone || cust?.needsPhoneLink)) {
      phoneLinkBanner.style.display = 'block';
    } else {
      phoneLinkBanner.style.display = 'none';
    }
  }

  // ─── Display History Helper ───
  function displayCustomerHistory(cData, fOrders = [], sOrders = []) {
    customerData = cData || {};
    foodOrders = fOrders || [];
    shopOrders = sOrders || [];

    // Switch to history view
    document.documentElement.classList.add('has-auth-session');
    if (verificationSection) verificationSection.style.display = 'none';
    if (historySection) historySection.style.display = 'block';

    // Store active profile in session
    try {
      sessionStorage.setItem('bigi_auth_customer', JSON.stringify(customerData));
    } catch (e) {}

    // Render all subviews
    renderCustomerLoyalty(customerData);
    renderSavedCards(customerData.savedCards || []);
    renderFoodOrders(foodOrders);
    renderShopOrders(shopOrders);

    // Update phone link banner
    updatePhoneLinkBanner(customerData);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Reset to Logged Out State (When user signs out anywhere on site) ───
  function resetToLoggedOutState() {
    customerData = null;
    foodOrders = [];
    shopOrders = [];
    currentPin = '';
    currentPhone = '';

    // Remove pre-render classes and any injected styles
    document.documentElement.classList.remove('has-auth-session');
    const preStyle = document.getElementById('auth-prerender-style');
    if (preStyle) preStyle.remove();
    document.querySelectorAll('#auth-prerender-style').forEach(el => el.remove());

    // Clear storage completely
    try {
      sessionStorage.removeItem('bigi_order_auth');
      sessionStorage.removeItem('bigi_auth_customer');
      localStorage.removeItem('bigi_order_auth');
      localStorage.removeItem('bigi_auth_customer');
    } catch (e) {}

    // Clear input values
    if (inputPhone) inputPhone.value = '';
    if (inputPin) inputPin.value = '';
    if (inputNewPin) inputNewPin.value = '';

    // Clear profile DOM elements
    if (profileName) profileName.textContent = 'Customer';
    if (profilePhone) profilePhone.textContent = '--';
    if (profileAvatar) profileAvatar.textContent = 'B';
    if (statPoints) statPoints.textContent = '0';
    if (statTotalOrders) statTotalOrders.textContent = '0';
    if (statMemberSince) statMemberSince.textContent = '--';
    if (progressFill) progressFill.style.width = '0%';
    renderSavedCards([]);
    renderFoodOrders([]);
    renderShopOrders([]);

    const socialAuthBox = document.getElementById('page-social-auth');
    if (socialAuthBox) socialAuthBox.style.display = 'block';

    if (phoneLinkBanner) phoneLinkBanner.style.display = 'none';

    // Explicitly toggle sections
    if (historySection) historySection.style.display = 'none';
    if (verificationSection) verificationSection.style.display = 'block';

    showStep('phone');
    hideAlert();
  }

  // ─── Check Saved Sessions on Page Load ───
  const savedCustomerStr = sessionStorage.getItem('bigi_auth_customer');
  if (savedCustomerStr) {
    try {
      const parsedCust = JSON.parse(savedCustomerStr);
      if (parsedCust && (parsedCust.phone || parsedCust.email || parsedCust.uid)) {
        displayCustomerHistory(parsedCust, [], []);
      }
    } catch (e) {}
  }

  // Check saved phone+PIN session in sessionStorage
  const savedSession = sessionStorage.getItem('bigi_order_auth');
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession);
      if (parsed.phone && parsed.pin) {
        currentPhone = parsed.phone;
        currentPin = parsed.pin;
        inputPhone.value = formatPhoneNumber(currentPhone);
        loadOrderHistory(parsed.phone, parsed.pin, true);
      }
    } catch (e) {
      sessionStorage.removeItem('bigi_order_auth');
    }
  }

  // ─── 1-Tap Social Auth Integration (Google & Apple) ───
  async function loadAuthOrderHistory() {
    setLoading(true, 'Retrieving your orders...');
    try {
      const res = await getOrderHistory({});
      setLoading(false);
      const data = res?.data || {};
      customerData = data.customer || null;
      const rawOrders = data.orders || [];
      const rawFood = data.foodOrders || rawOrders.filter(o => !o.isRetail && o.type !== 'retail');
      const rawShop = data.shopOrders || data.retailOrders || rawOrders.filter(o => o.isRetail || o.type === 'retail');

      if (customerData) {
        currentPhone = customerData.phone || '';
        displayCustomerHistory(customerData, rawFood, rawShop);
      } else {
        showStep('phone');
      }
    } catch (err) {
      setLoading(false);
      console.warn('loadAuthOrderHistory error:', err);
      showAlert('error', err.message || 'Unable to retrieve your orders. Please try again.');
    }
  }

  const btnPageGoogle = document.getElementById('btn-page-google');
  if (btnPageGoogle) {
    btnPageGoogle.onclick = async () => {
      try {
        setLoading(true, 'Connecting with Google...');
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        await loadAuthOrderHistory();
      } catch (err) {
        setLoading(false);
        if (err.code === 'auth/operation-not-allowed') {
          showAlert('info', 'Google sign-in needs to be enabled in Firebase Console. Please enter your Phone Number below to view orders & rewards!');
          const inputPhone = document.getElementById('input-phone');
          if (inputPhone) inputPhone.focus();
        } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          showAlert('error', err.message || 'Google sign-in was cancelled or failed.');
        }
      }
    };
  }

  const btnPageApple = document.getElementById('btn-page-apple');
  if (btnPageApple) {
    btnPageApple.onclick = async () => {
      try {
        setLoading(true, 'Connecting with Apple...');
        const provider = new OAuthProvider('apple.com');
        await signInWithPopup(auth, provider);
        await loadAuthOrderHistory();
      } catch (err) {
        setLoading(false);
        if (err.code === 'auth/operation-not-allowed') {
          showAlert('info', 'Apple sign-in needs to be enabled in Firebase Console. Please enter your Phone Number below to view orders & rewards!');
          const inputPhone = document.getElementById('input-phone');
          if (inputPhone) inputPhone.focus();
        } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          showAlert('error', err.message || 'Apple sign-in was cancelled or failed.');
        }
      }
    };
  }

  // Auto-load or reset if auth state changes
  onAuthStateChanged(auth, (user) => {
    const socialAuthBox = document.getElementById('page-social-auth');
    if (user) {
      if (socialAuthBox) socialAuthBox.style.display = 'none';
      loadAuthOrderHistory();
    } else {
      if (socialAuthBox) socialAuthBox.style.display = 'block';
      const hasPhoneAuth = Boolean(sessionStorage.getItem('bigi_order_auth'));
      if (!hasPhoneAuth) {
        resetToLoggedOutState();
      }
    }
  });

  // Listen to cross-site account auth changes (e.g. drawer sign-out)
  window.addEventListener('bigi:auth-changed', (e) => {
    const cust = e.detail;
    if (!cust) {
      resetToLoggedOutState();
    } else if (!customerData || customerData.phone !== cust.phone || customerData.email !== cust.email) {
      loadAuthOrderHistory();
    }
  });

  // ─── Verification Flow Step 1: Lookup Phone ───
  formPhone.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const rawInput = inputPhone.value.trim();
    const digits = rawInput.replace(/\D/g, '');

    if (digits.length < 10) {
      showAlert('error', 'Please enter a valid 10-digit phone number.');
      inputPhone.focus();
      return;
    }

    currentPhone = rawInput;
    setLoading(true, 'Looking up account...');

    try {
      // Step 2: Call lookupCustomer({ phone })
      const res = await lookupCustomer({ phone: rawInput });
      setLoading(false);

      const data = res?.data || {};
      const exists = data.exists ?? data.found ?? (data.customer !== undefined && data.customer !== null);

      if (!exists) {
        // Step 5: Customer not found
        showStep('not-found');
        return;
      }

      // Check if PIN is set
      const hasPin = Boolean(data.hasPin);

      if (hasPin) {
        // Step 3: Customer exists and has a PIN set
        showStep('pin');
        inputPin.value = '';
        inputPin.focus();
        showAlert('info', `Welcome back${data.customer?.name ? `, ${data.customer.name}` : ''}! Enter your 4-digit PIN.`);
      } else {
        // Step 4: Customer exists but NO PIN set
        showStep('set-pin');
        inputNewPin.value = '';
        inputNewPin.focus();
        showAlert('info', `Welcome${data.customer?.name ? `, ${data.customer.name}` : ''}! Please set a 4-digit PIN to secure your account.`);
      }

    } catch (err) {
      setLoading(false);
      console.error('lookupCustomer error:', err);

      // Handle not found error codes gracefully
      if (err.code === 'functions/not-found' || (err.message && err.message.toLowerCase().includes('not found'))) {
        showStep('not-found');
      } else if (err.code === 'functions/internal' || (err.message && err.message.toLowerCase() === 'internal')) {
        showAlert('error', 'Unable to reach the server. Please check your connection and try again.');
      } else {
        showAlert('error', err.message || 'Unable to check phone number. Please try again.');
      }
    }
  });

  // "First time? Enter your phone and set a 4-digit PIN" link
  linkFirstTime.addEventListener('click', (e) => {
    e.preventDefault();
    hideAlert();
    const rawInput = inputPhone.value.trim();
    const digits = rawInput.replace(/\D/g, '');

    if (digits.length < 10) {
      showAlert('info', 'Please enter your phone number first, then we’ll help you set your PIN.');
      inputPhone.focus();
      return;
    }

    // Trigger phone form submit to check account
    formPhone.dispatchEvent(new Event('submit'));
  });

  // ─── Step 2: Verify Existing PIN ───
  formPin.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const pin = inputPin.value.trim();
    if (pin.length !== 4) {
      showAlert('error', 'Please enter your 4-digit PIN.');
      inputPin.focus();
      return;
    }

    currentPin = pin;
    await loadOrderHistory(currentPhone, currentPin, false);
  });

  // ─── Step 3: Set New PIN ───
  formSetPin.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const pin = inputNewPin.value.trim();
    if (pin.length !== 4) {
      showAlert('error', 'Please enter a 4-digit PIN (numbers only).');
      inputNewPin.focus();
      return;
    }

    setLoading(true, 'Setting your 4-digit PIN...');

    try {
      // Step 4: Call setCustomerPin({ phone, pin })
      await setCustomerPin({ phone: currentPhone, pin });
      currentPin = pin;

      // Immediately fetch order history
      await loadOrderHistory(currentPhone, currentPin, false);

    } catch (err) {
      setLoading(false);
      console.error('setCustomerPin error:', err);
      showAlert('error', err.message || 'Failed to set PIN. Please try again.');
    }
  });

  // ─── Fetch and Load Order History ───
  async function loadOrderHistory(phone, pin, isAutoLogin = false) {
    setLoading(true, 'Retrieving your orders...');

    try {
      const res = await getOrderHistory({ phone, pin });
      setLoading(false);

      const data = res?.data;
      if (!data || data.success === false) {
        if (isAutoLogin) {
          sessionStorage.removeItem('bigi_order_auth');
          showStep('phone');
          return;
        }
        showAlert('error', data?.message || 'Incorrect PIN. Please try again.');
        inputPin.value = '';
        inputPin.focus();
        return;
      }

      // Save valid auth session
      sessionStorage.setItem('bigi_order_auth', JSON.stringify({ phone, pin }));

      // Extract customer & order collections
      customerData = data.customer || {};
      
      // Categorize orders
      const rawOrders = data.orders || [];
      const rawFood = data.foodOrders || rawOrders.filter(o => !o.isRetail && o.type !== 'retail');
      const rawShop = data.shopOrders || data.retailOrders || rawOrders.filter(o => o.isRetail || o.type === 'retail');

      displayCustomerHistory(customerData, rawFood, rawShop);

    } catch (err) {
      setLoading(false);
      console.error('getOrderHistory error:', err);

      if (isAutoLogin) {
        sessionStorage.removeItem('bigi_order_auth');
        showStep('phone');
        return;
      }

      const msg = err.message || '';
      if (err.code === 'functions/resource-exhausted' || msg.toLowerCase().includes('locked') || msg.toLowerCase().includes('too many failed') || msg.toLowerCase().includes('multiple incorrect')) {
        showAlert('error', msg || 'Account is temporarily locked due to multiple incorrect attempts. Please try again in 15 minutes.');
      } else if (msg.toLowerCase().includes('pin') || err.code === 'functions/permission-denied' || err.code === 'functions/unauthenticated') {
        showAlert('error', 'Incorrect PIN. Please try again.');
        inputPin.value = '';
        inputPin.focus();
      } else if (err.code === 'functions/internal' || msg.toLowerCase() === 'internal') {
        showAlert('error', 'Unable to reach the server. Please check your connection and try again.');
      } else {
        showAlert('error', msg || 'Failed to load order history. Please try again.');
      }
    }
  }

  // ─── Step Navigation Helpers ───
  function showStep(step) {
    formPhone.style.display = 'none';
    formPin.style.display = 'none';
    formSetPin.style.display = 'none';
    stateNotFound.style.display = 'none';

    const verifyTitle = document.getElementById('verify-title');
    const verifySubtitle = document.getElementById('verify-subtitle');
    const verifyIcon = document.getElementById('verify-icon');

    if (step === 'phone') {
      formPhone.style.display = 'block';
      verifyIcon.innerHTML = iconFileText(36);
      verifyTitle.textContent = 'LOOK UP YOUR ORDERS';
      verifySubtitle.textContent = 'Enter your phone number to view past orders and loyalty points.';
      inputPhone.focus();
    } else if (step === 'pin') {
      formPin.style.display = 'block';
      verifyIcon.innerHTML = iconLock(36);
      verifyTitle.textContent = 'ENTER YOUR PIN';
      verifySubtitle.textContent = `Enter the 4-digit PIN for ${formatPhoneNumber(currentPhone)}`;
      inputPin.focus();
    } else if (step === 'set-pin') {
      formSetPin.style.display = 'block';
      verifyIcon.innerHTML = iconSparkle(36);
      verifyTitle.textContent = 'CREATE YOUR PIN';
      verifySubtitle.textContent = `Set a 4-digit PIN for ${formatPhoneNumber(currentPhone)} to secure your orders.`;
      inputNewPin.focus();
    } else if (step === 'not-found') {
      stateNotFound.style.display = 'block';
      verifyIcon.innerHTML = iconAlertTriangle(36);
      verifyTitle.textContent = 'ACCOUNT NOT FOUND';
      verifySubtitle.textContent = `We couldn't find any orders for ${formatPhoneNumber(currentPhone)}.`;
    }
  }

  // "← Different phone" buttons
  btnBackToPhone.addEventListener('click', () => {
    hideAlert();
    showStep('phone');
  });

  btnBackFromSetPin.addEventListener('click', () => {
    hideAlert();
    showStep('phone');
  });

  btnRetryPhone.addEventListener('click', () => {
    hideAlert();
    showStep('phone');
  });

  if (btnSwitchToSetPin) {
    btnSwitchToSetPin.addEventListener('click', () => {
      hideAlert();
      showStep('set-pin');
    });
  }

  if (btnSwitchToEnterPin) {
    btnSwitchToEnterPin.addEventListener('click', () => {
      hideAlert();
      showStep('pin');
    });
  }

  // "Switch Account" / Log Out
  btnSwitchAccount.addEventListener('click', async () => {
    try {
      sessionStorage.removeItem('bigi_order_auth');
      sessionStorage.removeItem('bigi_auth_customer');
      localStorage.removeItem('bigi_order_auth');
      localStorage.removeItem('bigi_auth_customer');
    } catch (e) {}
    resetToLoggedOutState();
    window.dispatchEvent(new CustomEvent('bigi:auth-changed', { detail: null }));
    try {
      await auth.signOut();
    } catch (e) {}
  });

  // ─── Tabs Switching ───
  tabBtnFood.addEventListener('click', () => switchTab('food'));
  tabBtnShop.addEventListener('click', () => switchTab('shop'));

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'food') {
      tabBtnFood.classList.add('active');
      tabBtnShop.classList.remove('active');
      tabPaneFood.style.display = 'block';
      tabPaneShop.style.display = 'none';
    } else {
      tabBtnShop.classList.add('active');
      tabBtnFood.classList.remove('active');
      tabPaneShop.style.display = 'block';
      tabPaneFood.style.display = 'none';
    }
  }

  // ─── Render Customer Loyalty Info ───
  function renderCustomerLoyalty(customer) {
    try {
      const cust = customer && typeof customer === 'object' ? customer : {};
      const name = typeof cust.name === 'string' && cust.name.trim() ? cust.name.trim() : 'Valued Guest';
      const phone = cust.phone || currentPhone || '';
      
      // Points calculation
      const points = typeof cust.loyaltyPoints === 'number' && !isNaN(cust.loyaltyPoints)
        ? Math.max(0, cust.loyaltyPoints)
        : (typeof cust.points === 'number' && !isNaN(cust.points) ? Math.max(0, cust.points) : 0);

      const totalOrdersCount = typeof cust.totalOrders === 'number' && !isNaN(cust.totalOrders)
        ? cust.totalOrders
        : (foodOrders.length + shopOrders.length);

      // Profile Details
      if (profileName) profileName.textContent = name;
      if (profilePhone) profilePhone.textContent = phone ? formatPhoneNumber(phone) : (cust.email || 'No phone linked');
      if (profileAvatar) {
        if (cust.photoUrl) {
          profileAvatar.innerHTML = `<img src="${cust.photoUrl}" alt="${name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
          profileAvatar.textContent = (String(name).trim()[0] || 'B').toUpperCase();
        }
      }

      // Member Since Date
      let memberSinceDate = cust.memberSince || cust.firstOrderDate || cust.createdAt;
      if (!memberSinceDate && foodOrders.length > 0) {
        const oldest = foodOrders[foodOrders.length - 1];
        memberSinceDate = oldest?.createdAt || oldest?.date;
      }
      if (statMemberSince) statMemberSince.textContent = formatMemberSince(memberSinceDate);

      // Stats
      if (statPoints) statPoints.textContent = points.toLocaleString();
      if (statTotalOrders) statTotalOrders.textContent = totalOrdersCount.toString();

      // Tier calculation & badge
      const tier = determineTier(cust.tier, points, cust.totalSpentCents ? cust.totalSpentCents / 100 : 0);
      applyTierBadge(tier);

      // Tier Progress
      applyTierProgress(tier, points);
      renderCustomerRewards(points);
    } catch (err) {
      console.error('Error in renderCustomerLoyalty:', err);
    }
  }

  function determineTier(givenTier, points, totalSpent) {
    if (givenTier && typeof givenTier === 'string') {
      const lower = givenTier.toLowerCase();
      if (lower.includes('gold')) return 'Gold';
      if (lower.includes('silver')) return 'Silver';
      return 'Bronze';
    }
    const metric = points || totalSpent || 0;
    if (metric >= 1500) return 'Gold';
    if (metric >= 500) return 'Silver';
    return 'Bronze';
  }

  function applyTierBadge(tier) {
    profileTierBadge.className = 'tier-badge';
    if (tier === 'Gold') {
      profileTierBadge.classList.add('tier-gold');
      tierEmoji.innerHTML = iconCrown(18);
      tierText.textContent = 'Gold Member';
    } else if (tier === 'Silver') {
      profileTierBadge.classList.add('tier-silver');
      tierEmoji.innerHTML = iconAward(18);
      tierText.textContent = 'Silver Member';
    } else {
      profileTierBadge.classList.add('tier-bronze');
      tierEmoji.innerHTML = iconMedal(18);
      tierText.textContent = 'Bronze Member';
    }
  }

  function applyTierProgress(tier, points) {
    if (tier === 'Gold') {
      progressTitle.textContent = 'Highest Tier Achieved';
      progressSubtitle.textContent = `${points.toLocaleString()} total points unlocked`;
      progressFill.style.width = '100%';
      progressFill.style.background = 'linear-gradient(90deg, #f9a825, #ffd54f)';
    } else if (tier === 'Silver') {
      const ptsToGold = Math.max(0, 300 - points);
      const progressPercent = Math.min(100, Math.max(0, Math.round(((points - 100) / 200) * 100)));
      progressTitle.textContent = 'Progress to Gold Tier (300 pts)';
      progressSubtitle.textContent = `${points} / 300 pts (${ptsToGold} pts to reach Gold)`;
      progressFill.style.width = `${progressPercent}%`;
      progressFill.style.background = 'linear-gradient(90deg, #c0c0c0, #f9a825)';
    } else {
      // Bronze
      const ptsToSilver = Math.max(0, 100 - points);
      const progressPercent = Math.min(100, Math.max(0, Math.round((points / 100) * 100)));
      progressTitle.textContent = 'Progress to Silver Tier (100 pts)';
      progressSubtitle.textContent = `${points} / 100 pts (${ptsToSilver} pts to reach Silver)`;
      progressFill.style.width = `${progressPercent}%`;
      progressFill.style.background = 'linear-gradient(90deg, #cd7f32, #c0c0c0)';
    }
  }

  // ─── Render Saved Payment Methods ───
  function renderSavedCards(cards) {
    const listEl = document.getElementById('saved-cards-history-list');
    const emptyEl = document.getElementById('saved-cards-empty');
    if (!listEl) return;

    const validCards = Array.isArray(cards) ? cards : [];

    if (validCards.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    listEl.innerHTML = validCards.map((card) => {
      const brand = (card.brand || 'CARD').toUpperCase();
      const last4 = card.last4 || '••••';
      const expMonth = card.expMonth ? String(card.expMonth).padStart(2, '0') : '••';
      const expYear = card.expYear ? String(card.expYear).slice(-2) : '••';

      return `
        <div class="saved-card-chip" style="background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; transition: border-color 0.2s;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="display: flex; align-items: center; color: var(--accent);">${iconCard(24)}</span>
            <div>
              <div style="font-weight: 700; font-size: 14px; color: var(--white);">${escapeHtml(brand)} •••• ${escapeHtml(last4)}</div>
              <div style="font-size: 12px; color: var(--gray);">Expires ${expMonth}/${expYear}</div>
            </div>
          </div>
          <button type="button" class="btn-remove-card" data-card-id="${escapeHtml(card.id)}" data-card-label="${escapeHtml(brand)} ending in ${escapeHtml(last4)}"
            style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; font-size: 12px; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; text-transform: uppercase; transition: all 0.2s;">
            Remove
          </button>
        </div>
      `;
    }).join('');

    // Wire remove buttons
    listEl.querySelectorAll('.btn-remove-card').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cardId = btn.getAttribute('data-card-id');
        const cardLabel = btn.getAttribute('data-card-label') || 'this card';

        if (!confirm(`Are you sure you want to remove ${cardLabel} from your account?`)) {
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Removing...';

        try {
          const res = await removeSavedCard({
            phone: currentPhone,
            pin: currentPin,
            cardId: cardId,
          });

          const updated = res?.data?.savedCards || [];
          if (customerData) {
            customerData.savedCards = updated;
          }
          renderSavedCards(updated);
          showAlert('info', `${cardLabel} removed from your saved payment methods.`);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Remove';
          console.error('removeSavedCard error:', err);
          showAlert('error', err.message || 'Failed to remove card. Please try again.');
        }
      });
    });
  }

  // ─── Render Food Orders ───
  function renderFoodOrders(orders) {
    badgeFoodCount.textContent = orders.length;

    if (!orders || orders.length === 0) {
      foodOrdersList.innerHTML = '';
      foodOrdersEmpty.style.display = 'block';
      return;
    }

    foodOrdersEmpty.style.display = 'none';

    // Sort by latest date descending
    const sorted = [...orders].sort((a, b) => {
      const dateA = getEpoch(a.createdAt || a.date);
      const dateB = getEpoch(b.createdAt || b.date);
      return dateB - dateA;
    });

    foodOrdersList.innerHTML = sorted.map(order => createFoodOrderCard(order)).join('');
  }

  function createFoodOrderCard(order) {
    if (!order || typeof order !== 'object') return '';
    const id = String(order.id || 'N/A');
    const displayId = id.length > 8 ? '#' + id.slice(-4).toUpperCase() : '#' + id.toUpperCase();
    const formattedDate = formatOrderDate(order.createdAt || order.date);
    const status = String(order.status || 'pending').toLowerCase();
    const statusClass = `status-${status.replace(/[^a-z0-9_-]/g, '')}`;
    
    // Status text & icon
    const statusMeta = getStatusMeta(status);

    // Total & Refund calculation
    const totalAmount = parseOrderTotal(order.total, order.totalCents);
    const refundAmount = Number(order.refundedAmount || (order.refundedAmountCents ? order.refundedAmountCents / 100 : 0) || 0);
    const netAmount = Math.max(0, totalAmount - refundAmount);

    let totalHtml = `$${totalAmount.toFixed(2)}`;
    if (refundAmount > 0) {
      totalHtml = `<span style="color: var(--accent); font-weight: 700;">$${netAmount.toFixed(2)}</span> <span style="font-size: 13px; color: #ef4444; text-decoration: line-through; margin-left: 6px;">$${totalAmount.toFixed(2)}</span>`;
    }

    // Returned items note
    let returnsHtml = '';
    if (order.returns && Array.isArray(order.returns) && order.returns.length > 0) {
      const returnLines = order.returns.map(r => {
        const itemNames = (r.items || []).map(i => `${i.quantity || 1}x ${escapeHtml(i.name || 'Item')}`).join(', ');
        return `<div style="display: flex; align-items: center; gap: 6px;">${iconRefresh(14)} Refunded: ${itemNames || 'Item(s)'} (-$${(r.amount || 0).toFixed(2)})</div>`;
      }).join('');
      returnsHtml = `<div class="refund-details-note" style="margin: 8px 0 12px; padding: 8px 12px; background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; border-radius: 4px; font-size: 12px; color: #fca5a5;">${returnLines}</div>`;
    }

    // Items list HTML
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.filter(it => it && typeof it === 'object').map(item => {
      const qty = Math.max(1, parseInt(item.quantity || item.qty || 1, 10) || 1);
      const name = escapeHtml(item.name || item.title || 'Special Dish');
      const notes = item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : '';
      return `
        <li class="order-item-row">
          <div>
            <span class="item-qty">${qty}×</span>
            <span class="item-name">${name}</span>
            ${notes}
          </div>
        </li>
      `;
    }).join('');

    // Active order tracking link
    const isActive = ['pending', 'preparing', 'ready', 'scheduled'].includes(status);
    let trackBtnHtml = '';
    if (isActive && order.accessToken) {
      trackBtnHtml = `
        <a href="/order-status?orderId=${encodeURIComponent(id)}&token=${encodeURIComponent(order.accessToken)}" class="btn-action btn-track" target="_blank" rel="noopener">
          <span>Live Tracking</span>
        </a>
      `;
    }

    // Reorder link -> navigates to /menu with query param ?reorder=ORDER_ID
    const reorderBtnHtml = `
      <a href="/menu?reorder=${encodeURIComponent(id)}" class="btn-action btn-reorder">
        <span>Reorder</span>
      </a>
    `;

    // Cancellation or Refund Banner Callout
    let cancelCalloutHtml = '';
    const cardInfo = order.cardBrand ? `${escapeHtml(order.cardBrand)} ending in •••• ${escapeHtml(order.cardLast4)}` : 'your original payment method';

    if (status === 'canceled' || status === 'cancelled' || status === 'refunded') {
      const reasonText = escapeHtml(order.cancellationReason || order.refundReason || 'Order cancelled by restaurant');
      const refundDisplay = refundAmount > 0 ? `$${refundAmount.toFixed(2)}` : `$${totalAmount.toFixed(2)}`;
      cancelCalloutHtml = `
        <div class="order-cancel-callout" style="margin: 10px 0 14px; padding: 12px 14px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-left: 4px solid #ef4444; border-radius: 8px; font-size: 13.5px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #ef4444; margin-bottom: 4px; font-size: 14px;">
            <span>${iconAlertTriangle(16)}</span>
            <span>${status === 'refunded' ? 'Order Refunded' : 'Order Cancelled & Refunded'}</span>
          </div>
          <div style="color: var(--white); margin-bottom: 6px; line-height: 1.4;">
            <strong style="color: #fca5a5;">Reason:</strong> ${reasonText}
          </div>
          <div style="color: #fca5a5; font-size: 12.5px; display: inline-flex; align-items: center; gap: 4px;">
            ${iconCard(14)} Full refund of ${refundDisplay} issued to ${cardInfo} (takes 2–7 business days).
          </div>
        </div>
      `;
    } else if (status === 'partially_refunded' || refundAmount > 0) {
      const reasonText = escapeHtml(order.refundReason || order.cancellationReason || 'Item unavailable / returned');
      cancelCalloutHtml = `
        <div class="order-cancel-callout" style="margin: 10px 0 14px; padding: 10px 14px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); border-left: 4px solid #f59e0b; border-radius: 8px; font-size: 13.5px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #f59e0b; margin-bottom: 4px; font-size: 14px;">
            <span>${iconRefresh(16)}</span>
            <span>Item(s) Refunded</span>
          </div>
          <div style="color: var(--white); margin-bottom: 4px;">
            <strong style="color: #fcd34d;">Reason:</strong> ${reasonText}
          </div>
          <div style="color: #fcd34d; font-size: 12.5px; display: inline-flex; align-items: center; gap: 4px;">
            ${iconCard(14)} Refund of $${refundAmount.toFixed(2)} credited back to ${cardInfo}.
          </div>
        </div>
      `;
    }

    return `
      <article class="order-card" data-order-id="${escapeHtml(id)}">
        <header class="order-card-header">
          <div class="order-meta">
            <span class="order-date">${formattedDate}</span>
            <span class="order-number">Order ${escapeHtml(displayId)}</span>
          </div>
          <span class="status-badge ${statusClass}">
            <span>${statusMeta.iconSvg}</span>
            <span>${statusMeta.label}</span>
          </span>
        </header>

        <ul class="order-items-list">
          ${itemsHtml || '<li style="color: var(--gray); font-size: 13px;">No item details available</li>'}
        </ul>

        ${returnsHtml}
        ${cancelCalloutHtml}

        <footer class="order-card-footer">
          <div class="order-total-block">
            <span class="order-total-label">${refundAmount > 0 ? 'Net Total' : 'Total'}</span>
            <span class="order-total-amount">${totalHtml}</span>
          </div>
          <div class="order-actions">
            ${trackBtnHtml}
            ${reorderBtnHtml}
          </div>
        </footer>
      </article>
    `;
  }

  // ─── Render Retail / Shop Orders ───
  function renderShopOrders(orders) {
    badgeShopCount.textContent = orders.length;

    if (!orders || orders.length === 0) {
      shopOrdersList.innerHTML = '';
      shopOrdersEmpty.style.display = 'block';
      return;
    }

    shopOrdersEmpty.style.display = 'none';

    // Sort by latest date descending
    const sorted = [...orders].sort((a, b) => {
      const dateA = getEpoch(a.createdAt || a.date);
      const dateB = getEpoch(b.createdAt || b.date);
      return dateB - dateA;
    });

    shopOrdersList.innerHTML = sorted.map(order => createShopOrderCard(order)).join('');
  }

  function createShopOrderCard(order) {
    if (!order || typeof order !== 'object') return '';
    const id = String(order.id || 'N/A');
    const displayId = id.length > 8 ? '#' + id.slice(-4).toUpperCase() : '#' + id.toUpperCase();
    const formattedDate = formatOrderDate(order.createdAt || order.date);
    const status = String(order.status || 'paid').toLowerCase();
    
    // Status color class
    let statusClass = 'status-pending';
    let statusLabel = status;
    let statusIconSvg = iconPackage(14);

    if (status === 'shipped') {
      statusClass = 'status-shipped';
      statusLabel = 'Shipped';
      statusIconSvg = iconTruck(14);
    } else if (status === 'paid' || status === 'confirmed') {
      statusClass = 'status-ready';
      statusLabel = 'Confirmed';
      statusIconSvg = iconCheck(14);
    } else if (status === 'completed' || status === 'delivered') {
      statusClass = 'status-completed';
      statusLabel = 'Delivered';
      statusIconSvg = iconCheckCircle(14);
    } else if (status === 'canceled' || status === 'cancelled') {
      statusClass = 'status-canceled';
      statusLabel = 'Canceled';
      statusIconSvg = iconX(14);
    } else if (status === 'refunded') {
      statusClass = 'status-refunded';
      statusLabel = 'Refunded';
      statusIconSvg = iconRefresh(14);
    } else if (status === 'partially_refunded') {
      statusClass = 'status-partially_refunded';
      statusLabel = 'Partially Refunded';
      statusIconSvg = iconRefresh(14);
    }

    const totalAmount = parseOrderTotal(order.total, order.totalCents);
    const refundAmount = Number(order.refundedAmount || (order.refundedAmountCents ? order.refundedAmountCents / 100 : 0) || 0);
    const netAmount = Math.max(0, totalAmount - refundAmount);

    let totalHtml = `$${totalAmount.toFixed(2)}`;
    if (refundAmount > 0) {
      totalHtml = `<span style="color: var(--accent); font-weight: 700;">$${netAmount.toFixed(2)}</span> <span style="font-size: 13px; color: #ef4444; text-decoration: line-through; margin-left: 6px;">$${totalAmount.toFixed(2)}</span>`;
    }

    // Returned items note
    let returnsHtml = '';
    if (order.returns && Array.isArray(order.returns) && order.returns.length > 0) {
      const returnLines = order.returns.map(r => {
        const itemNames = (r.items || []).map(i => `${i.quantity || 1}x ${escapeHtml(i.name || 'Item')}`).join(', ');
        return `<div style="display: flex; align-items: center; gap: 6px;">${iconRefresh(14)} Refunded: ${itemNames || 'Item(s)'} (-$${(r.amount || 0).toFixed(2)})</div>`;
      }).join('');
      returnsHtml = `<div class="refund-details-note" style="margin: 8px 0 12px; padding: 8px 12px; background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; border-radius: 4px; font-size: 12px; color: #fca5a5;">${returnLines}</div>`;
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.filter(it => it && typeof it === 'object').map(item => {
      const qty = Math.max(1, parseInt(item.quantity || item.qty || 1, 10) || 1);
      const name = escapeHtml(item.name || item.title || 'Spice Item');
      return `
        <li class="order-item-row">
          <div>
            <span class="item-qty">${qty}×</span>
            <span class="item-name">${name}</span>
          </div>
        </li>
      `;
    }).join('');

    // Tracking info if shipped
    let trackingInfoHtml = '';
    if (order.trackingNumber) {
      trackingInfoHtml = `
        <div style="font-size: 13px; color: var(--gray); margin-bottom: 12px; background: var(--surface-light); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
          <span style="color: var(--white); font-weight: 600;">Tracking Number:</span> 
          <code style="color: var(--accent); font-family: monospace;">${escapeHtml(order.trackingNumber)}</code>
        </div>
      `;
    }

    // Cancellation or Refund Banner Callout
    let cancelCalloutHtml = '';
    const cardInfo = order.cardBrand ? `${escapeHtml(order.cardBrand)} ending in •••• ${escapeHtml(order.cardLast4)}` : 'your original payment method';

    if (status === 'canceled' || status === 'cancelled' || status === 'refunded') {
      const reasonText = escapeHtml(order.cancellationReason || order.refundReason || 'Order cancelled by restaurant');
      const refundDisplay = refundAmount > 0 ? `$${refundAmount.toFixed(2)}` : `$${totalAmount.toFixed(2)}`;
      cancelCalloutHtml = `
        <div class="order-cancel-callout" style="margin: 10px 0 14px; padding: 12px 14px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-left: 4px solid #ef4444; border-radius: 8px; font-size: 13.5px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #ef4444; margin-bottom: 4px; font-size: 14px;">
            <span>${iconAlertTriangle(16)}</span>
            <span>${status === 'refunded' ? 'Order Refunded' : 'Order Cancelled & Refunded'}</span>
          </div>
          <div style="color: var(--white); margin-bottom: 6px; line-height: 1.4;">
            <strong style="color: #fca5a5;">Reason:</strong> ${reasonText}
          </div>
          <div style="color: #fca5a5; font-size: 12.5px; display: inline-flex; align-items: center; gap: 4px;">
            ${iconCard(14)} Full refund of ${refundDisplay} issued to ${cardInfo} (takes 2–7 business days).
          </div>
        </div>
      `;
    } else if (status === 'partially_refunded' || refundAmount > 0) {
      const reasonText = escapeHtml(order.refundReason || order.cancellationReason || 'Item unavailable / returned');
      cancelCalloutHtml = `
        <div class="order-cancel-callout" style="margin: 10px 0 14px; padding: 10px 14px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); border-left: 4px solid #f59e0b; border-radius: 8px; font-size: 13.5px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #f59e0b; margin-bottom: 4px; font-size: 14px;">
            <span>${iconRefresh(16)}</span>
            <span>Item(s) Refunded</span>
          </div>
          <div style="color: var(--white); margin-bottom: 4px;">
            <strong style="color: #fcd34d;">Reason:</strong> ${reasonText}
          </div>
          <div style="color: #fcd34d; font-size: 12.5px; display: inline-flex; align-items: center; gap: 4px;">
            ${iconCard(14)} Refund of $${refundAmount.toFixed(2)} credited back to ${cardInfo}.
          </div>
        </div>
      `;
    }

    return `
      <article class="order-card" data-order-id="${escapeHtml(id)}">
        <header class="order-card-header">
          <div class="order-meta">
            <span class="order-date">${formattedDate}</span>
            <span class="order-number">Retail Order ${escapeHtml(displayId)}</span>
          </div>
          <span class="status-badge ${statusClass}">
            <span>${statusIconSvg}</span>
            <span>${statusLabel}</span>
          </span>
        </header>

        <ul class="order-items-list">
          ${itemsHtml || '<li style="color: var(--gray); font-size: 13px;">No item details available</li>'}
        </ul>

        ${returnsHtml}
        ${cancelCalloutHtml}
        ${trackingInfoHtml}

        <footer class="order-card-footer">
          <div class="order-total-block">
            <span class="order-total-label">${refundAmount > 0 ? 'Net Total' : 'Total'}</span>
            <span class="order-total-amount">${totalHtml}</span>
          </div>
          <div class="order-actions">
            <a href="/shop" class="btn-action">
              <span>Visit Shop</span>
            </a>
          </div>
        </footer>
      </article>
    `;
  }

  // ─── Status Mapping Helper ───
  function getStatusMeta(status) {
    switch (status) {
      case 'pending':
        return { label: 'Pending', iconSvg: iconClock(14) };
      case 'preparing':
        return { label: 'Preparing', iconSvg: iconFlame(14) };
      case 'ready':
        return { label: 'Ready for Pickup', iconSvg: iconCheck(14) };
      case 'completed':
        return { label: 'Completed', iconSvg: iconCheckCircle(14) };
      case 'scheduled':
        return { label: 'Scheduled', iconSvg: iconClock(14) };
      case 'canceled':
      case 'cancelled':
        return { label: 'Canceled', iconSvg: iconX(14) };
      case 'refunded':
        return { label: 'Refunded', iconSvg: iconRefresh(14) };
      case 'partially_refunded':
        return { label: 'Partially Refunded', iconSvg: iconRefresh(14) };
      default:
        return { label: status, iconSvg: iconFileText(14) };
    }
  }

  // ─── Date Formatter (Format: "Oct 15, 2026 at 2:30 PM") ───
  function formatOrderDate(dateVal) {
    if (!dateVal) return 'Date unknown';
    let d;
    if (dateVal.toDate && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal.seconds) {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      d = new Date(dateVal);
    }

    if (isNaN(d.getTime())) return 'Date unknown';

    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const timePart = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${datePart} at ${timePart}`;
  }

  function formatMemberSince(dateVal) {
    if (!dateVal) return 'Recently';
    let d;
    if (dateVal.toDate && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal.seconds) {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      d = new Date(dateVal);
    }

    if (isNaN(d.getTime())) return 'Recently';

    return d.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }

  function getEpoch(dateVal) {
    if (!dateVal) return 0;
    if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
    if (dateVal.seconds) return dateVal.seconds * 1000;
    if (dateVal instanceof Date) return dateVal.getTime();
    const t = new Date(dateVal).getTime();
    return isNaN(t) ? 0 : t;
  }

  // ─── Total Amount Parser ───
  function parseOrderTotal(total, totalCents) {
    if (typeof total === 'number' && !isNaN(total) && isFinite(total)) return Math.max(0, total);
    if (typeof total === 'string') {
      const parsed = parseFloat(total.replace('$', '').trim());
      if (!isNaN(parsed) && isFinite(parsed)) return Math.max(0, parsed);
    }
    if (typeof totalCents === 'number' && !isNaN(totalCents) && isFinite(totalCents)) return Math.max(0, totalCents / 100);
    return 0;
  }

  // ─── Phone Number Formatter ───
  function formatPhoneNumber(val) {
    if (!val) return '';
    const digits = val.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    // If country code included e.g. 1
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // ─── Alerts & Loading Helper ───
  function showAlert(type, message) {
    alertBox.className = `alert alert-${type} show`;
    alertIcon.innerHTML = type === 'error' ? iconAlertTriangle(20) : (type === 'success' ? iconCheckCircle(20) : iconFileText(20));
    alertMsg.textContent = message;
  }

  function hideAlert() {
    alertBox.className = 'alert';
    alertBox.classList.remove('show');
  }

  function setLoading(isLoading, text = 'Loading...') {
    if (isLoading) {
      verifyLoading.querySelector('p').textContent = text;
      verifyLoading.classList.add('show');
      btnPhoneSubmit.disabled = true;
      btnPinSubmit.disabled = true;
      btnSetPinSubmit.disabled = true;
    } else {
      verifyLoading.classList.remove('show');
      btnPhoneSubmit.disabled = false;
      btnPinSubmit.disabled = false;
      btnSetPinSubmit.disabled = false;
    }
  }



  // ─── Customer Rewards & Unlocks Engine ───
  function initCustomerRewardsListener() {
    if (customerRewardsUnsub) return;
    try {
      const q = query(collection(db, 'rewards'), orderBy('sortOrder', 'asc'));
      customerRewardsUnsub = onSnapshot(q, (snapshot) => {
        availableRewards = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.active !== false) {
            availableRewards.push({ id: d.id, ...data });
          }
        });
        availableRewards.sort((a, b) => {
          const ordA = typeof a.sortOrder === 'number' ? a.sortOrder : 999;
          const ordB = typeof b.sortOrder === 'number' ? b.sortOrder : 999;
          if (ordA !== ordB) return ordA - ordB;
          return (a.pointsCost || 0) - (b.pointsCost || 0);
        });

        const pts = customerData && typeof customerData.loyaltyPoints === 'number'
          ? Math.max(0, customerData.loyaltyPoints)
          : 0;
        renderCustomerRewards(pts);
      }, (err) => {
        console.error('Customer rewards listener error:', err);
      });
    } catch (e) {
      console.warn('Could not initialize customer rewards listener:', e);
    }
  }

  function renderCustomerRewards(points = 0) {
    const grid = document.getElementById('rewards-grid');
    const headerBalance = document.getElementById('rewards-header-balance');
    const countAll = document.getElementById('count-all-rewards');
    const countUnlocked = document.getElementById('count-unlocked-rewards');
    const countLocked = document.getElementById('count-locked-rewards');

    if (headerBalance) {
      headerBalance.textContent = `${points.toLocaleString()} PTS`;
    }

    if (!grid) return;

    if (availableRewards.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--gray); padding: 32px 16px;">
          <p style="font-size: 15px; margin-bottom: 8px;">No loyalty rewards available at this time.</p>
          <p style="font-size: 13px; color: #888;">Check back soon for new unlockable treats!</p>
        </div>
      `;
      return;
    }

    let unlockedCount = 0;
    let lockedCount = 0;

    availableRewards.forEach((r) => {
      const cost = Math.max(1, parseInt(r.pointsCost, 10) || 50);
      if (points >= cost) unlockedCount++;
      else lockedCount++;
    });

    if (countAll) countAll.textContent = availableRewards.length;
    if (countUnlocked) countUnlocked.textContent = unlockedCount;
    if (countLocked) countLocked.textContent = lockedCount;

    const filtered = availableRewards.filter((r) => {
      const cost = Math.max(1, parseInt(r.pointsCost, 10) || 50);
      if (currentRewardsFilter === 'unlocked') return points >= cost;
      if (currentRewardsFilter === 'locked') return points < cost;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--gray); padding: 24px;">
          No rewards match the selected filter.
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map((r) => {
      const cost = Math.max(1, parseInt(r.pointsCost, 10) || 50);
      const isUnlocked = points >= cost;
      const pointsToGo = Math.max(0, cost - points);
      const progressPercent = Math.min(100, Math.round((points / cost) * 100));
      const title = escapeHtml(r.title || 'Reward Item');
      const desc = escapeHtml(r.description || 'Redeem your points for this item.');
      const iconSvg = getRewardItemIcon(r, 22);

      if (isUnlocked) {
        // UNLOCKED STATE: Flat luxury monochrome card
        return `
          <div class="reward-card reward-unlocked">
            <div>
              <!-- Top Badge -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(255, 255, 255, 0.06); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.14); padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                  ${iconSparkle(12)} UNLOCKED
                </span>
                <span style="font-size: 17px; font-weight: 800; color: #ffffff; font-family: 'Barlow Condensed', sans-serif;">
                  ${cost} PTS
                </span>
              </div>

              <!-- Icon & Title -->
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                <div class="reward-icon-container">${iconSvg}</div>
                <h4 style="font-size: 18px; margin: 0; color: #fff; font-weight: 700; line-height: 1.25;">${title}</h4>
              </div>

              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.45; margin: 0 0 16px 0;">${desc}</p>
            </div>

            <div>
              <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 4px; padding: 6px 10px; margin-bottom: 12px; font-size: 12px; color: #a1a1aa; text-align: center; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                ${iconCheck(13)} 100% Covered with your points
              </div>
              <button type="button" class="reward-action-btn btn-claim" onclick="window.promptRedeemReward('${r.id}')">
                Claim Reward (${cost} pts) →
              </button>
            </div>
          </div>
        `;
      } else {
        // LOCKED STATE: Flat luxury muted card
        return `
          <div class="reward-card reward-locked">
            <div>
              <!-- Top Badge -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(255, 255, 255, 0.04); color: #71717a; border: 1px solid rgba(255, 255, 255, 0.08); padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                  ${iconLock(12)} ${pointsToGo} pts to go
                </span>
                <span style="font-size: 17px; font-weight: 700; color: #71717a; font-family: 'Barlow Condensed', sans-serif;">
                  ${cost} PTS
                </span>
              </div>

              <!-- Icon & Title -->
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px; opacity: 0.9;">
                <div class="reward-icon-container">${iconSvg}</div>
                <h4 style="font-size: 17px; margin: 0; color: #e4e4e7; font-weight: 600; line-height: 1.25;">${title}</h4>
              </div>

              <p style="font-size: 13px; color: #71717a; line-height: 1.45; margin: 0 0 16px 0;">${desc}</p>
            </div>

            <div>
              <!-- Progress Bar -->
              <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #a1a1aa; margin-bottom: 6px;">
                  <span>Progress</span>
                  <span style="font-weight: 600; color: #ffffff;">${points} / ${cost} pts (${progressPercent}%)</span>
                </div>
                <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.08); border-radius: 2px; overflow: hidden;">
                  <div style="width: ${progressPercent}%; height: 100%; background: #71717a; border-radius: 2px;"></div>
                </div>
              </div>

              <a href="/menu" class="reward-action-btn btn-locked">
                Earn ${pointsToGo} more pts to unlock
              </a>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  // Window helper to open redemption confirmation modal
  window.promptRedeemReward = (rewardId) => {
    const reward = availableRewards.find((r) => r.id === rewardId);
    if (!reward) return;

    selectedRewardToRedeem = reward;
    const modal = document.getElementById('redeem-reward-modal');
    const modalIcon = document.getElementById('modal-redeem-icon');
    const modalTitle = document.getElementById('modal-redeem-title');
    const modalDesc = document.getElementById('modal-redeem-desc');
    const modalCost = document.getElementById('modal-redeem-cost');
    const modalRemaining = document.getElementById('modal-redeem-remaining');

    const points = customerData && typeof customerData.loyaltyPoints === 'number'
      ? Math.max(0, customerData.loyaltyPoints)
      : 0;
    const cost = Math.max(1, parseInt(reward.pointsCost, 10) || 50);

    if (modalIcon) modalIcon.innerHTML = getRewardItemIcon(reward, 28);
    if (modalTitle) modalTitle.textContent = `Redeem ${reward.title}`;
    if (modalDesc) modalDesc.textContent = `You are about to redeem ${cost} loyalty points for this reward. The points will be deducted and your free item will be ready to add to your bag!`;
    if (modalCost) modalCost.textContent = `${cost} PTS`;
    if (modalRemaining) modalRemaining.textContent = `${Math.max(0, points - cost)} PTS`;

    if (modal) {
      modal.style.display = 'flex';
    }
  };

  // Close redemption modal
  function closeRedemptionModal() {
    const modal = document.getElementById('redeem-reward-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    selectedRewardToRedeem = null;
  }

  // Execute Redemption
  async function executeRedemption() {
    if (!selectedRewardToRedeem) return;

    const btnConfirm = document.getElementById('btn-confirm-redeem');
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Redeeming...';
    }

    try {
      const reward = selectedRewardToRedeem;
      const res = await redeemLoyaltyReward({
        rewardId: reward.id,
        phone: currentPhone,
        pin: currentPin
      });

      const data = res?.data || {};
      if (!data.success) {
        throw new Error(data.message || 'Redemption failed.');
      }

      // Update in-memory customer points
      if (customerData) {
        customerData.loyaltyPoints = data.newPoints;
      }

      // Update points display
      const statPointsEl = document.getElementById('stat-points');
      if (statPointsEl) statPointsEl.textContent = data.newPoints.toLocaleString();

      // Store voucher in session for automatic cart addition on /menu
      sessionStorage.setItem('bigi_pending_reward', JSON.stringify({
        rewardId: reward.id,
        voucherCode: data.voucherCode,
        rewardTitle: reward.title,
        rewardType: reward.rewardType || 'free_menu_item',
        menuItemId: reward.menuItemId || null,
        menuItemName: reward.menuItemName || null,
        discountAmount: reward.discountAmount || 0,
        pointsCost: reward.pointsCost
      }));

      closeRedemptionModal();

      // Re-render customer rewards
      renderCustomerRewards(data.newPoints);

      // Show celebratory alert
      const alertBox = document.getElementById('status-alert');
      const alertMsg = document.getElementById('alert-message');
      if (alertBox && alertMsg) {
        alertBox.className = 'alert alert-success';
        alertMsg.innerHTML = `
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px; display: inline-flex; align-items: center; gap: 6px;">${iconSparkle(16)} Reward Claimed Successfully!</div>
          <div style="font-size: 14px; margin-bottom: 8px;">Voucher Code: <strong style="color: var(--accent); font-family: monospace;">${data.voucherCode}</strong> for <strong>${escapeHtml(reward.title)}</strong>.</div>
          <a href="/menu?redeem=${data.voucherCode}" class="btn-primary btn-small" style="display: inline-block; width: auto; padding: 6px 16px; font-size: 14px; text-decoration: none;">Add to Bag & Order Now →</a>
        `;
        alertBox.style.display = 'flex';
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

    } catch (err) {
      console.error('Error redeeming reward:', err);
      alert('Could not redeem reward: ' + (err.message || 'Unknown error'));
    } finally {
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Confirm & Redeem';
      }
    }
  }

  // Bind Filter & Modal Events
  function bindRewardsEvents() {
    const filterAll = document.getElementById('filter-all-rewards');
    const filterUnlocked = document.getElementById('filter-unlocked-rewards');
    const filterLocked = document.getElementById('filter-locked-rewards');

    const setActiveFilter = (filter, activeBtn) => {
      currentRewardsFilter = filter;
      [filterAll, filterUnlocked, filterLocked].forEach((btn) => {
        if (!btn) return;
        btn.classList.remove('active');
        btn.removeAttribute('style');
      });

      if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.removeAttribute('style');
      }

      const pts = customerData && typeof customerData.loyaltyPoints === 'number'
        ? Math.max(0, customerData.loyaltyPoints)
        : 0;
      renderCustomerRewards(pts);
    };

    if (filterAll) filterAll.addEventListener('click', () => setActiveFilter('all', filterAll));
    if (filterUnlocked) filterUnlocked.addEventListener('click', () => setActiveFilter('unlocked', filterUnlocked));
    if (filterLocked) filterLocked.addEventListener('click', () => setActiveFilter('locked', filterLocked));

    const btnCancel = document.getElementById('btn-cancel-redeem');
    const btnConfirm = document.getElementById('btn-confirm-redeem');
    if (btnCancel) btnCancel.addEventListener('click', closeRedemptionModal);
    if (btnConfirm) btnConfirm.addEventListener('click', executeRedemption);

    const modal = document.getElementById('redeem-reward-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeRedemptionModal();
      });
    }
  }

  // Initialize listener & events on DOMContentLoaded
  initCustomerRewardsListener();
  bindRewardsEvents();

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
