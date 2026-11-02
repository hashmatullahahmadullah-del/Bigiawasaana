const fs = require('fs');

let code = fs.readFileSync('src/nav.js', 'utf8');

const oldAuthBlock = `  // Update header sign-in pill from session cache synchronously
  try {
    const cachedCustomer = JSON.parse(sessionStorage.getItem('bigi_auth_customer') || 'null');
    if (cachedCustomer && cachedCustomer.name) {
      const mobileBtn = document.getElementById('nav-mobile-signin-btn');
      if (mobileBtn) {
        const firstName = cachedCustomer.name.split(' ')[0] || 'Account';
        const signinText = mobileBtn.querySelector('.nav-signin-text');
        if (signinText) signinText.textContent = firstName;
      }
    }
  } catch (e) {}

  // Option 2 Customer Auth: Attach click listener to load auth on-demand
  const signinBtn = document.getElementById('nav-mobile-signin-btn');
  if (signinBtn) {
    signinBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const authMod = await getAccountAuth();
      if (sessionStorage.getItem('bigi_auth_customer')) {
        authMod.openAccountDrawer();
      } else {
        authMod.openAuthModal();
      }
    });
  }`;

const newAuthBlock = `  // Update header sign-in pill from session cache synchronously across desktop & mobile
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
  if (drawerBtn) drawerBtn.addEventListener('click', handleAuthTrigger);`;

// Normalize line breaks for matching
const normalize = str => str.replace(/\r\n/g, '\n');
if (normalize(code).includes(normalize(oldAuthBlock))) {
  // Replace in code
  const normCode = normalize(code);
  const replaced = normCode.replace(normalize(oldAuthBlock), normalize(newAuthBlock));
  fs.writeFileSync('src/nav.js', replaced, 'utf8');
  console.log('Successfully updated src/nav.js');
} else {
  console.error('Could not find oldAuthBlock in src/nav.js');
}
