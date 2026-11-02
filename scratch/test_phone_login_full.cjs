const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[PAGE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('lookupCustomer') || url.includes('getOrderHistory') || url.includes('setCustomerPin')) {
      console.log(`[NETWORK RESPONSE] ${url} Status: ${res.status()}`);
      try {
        const text = await res.text();
        console.log(`[NETWORK BODY]:`, text.substring(0, 500));
      } catch (e) {
        console.log(`[NETWORK BODY ERR]:`, e.message);
      }
    }
  });

  console.log("Navigating to https://bigi-awasaana-7b3ce.web.app...");
  await page.goto('https://bigi-awasaana-7b3ce.web.app', { waitUntil: 'networkidle2' });

  // Open the sign-in modal
  console.log("Opening auth modal...");
  await page.evaluate(() => {
    if (typeof window.openAuthModal === 'function') {
      window.openAuthModal();
    } else {
      const btn = document.querySelector('.nav-signin-btn, #nav-signin-btn, #nav-mobile-signin-btn');
      if (btn) btn.click();
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Enter phone number
  console.log("Entering phone number 3239211646...");
  await page.type('#auth-phone-input', '3239211646');
  await new Promise(r => setTimeout(r, 500));

  // Click continue
  console.log("Clicking btn-phone-continue...");
  await page.click('#btn-phone-continue');

  // Wait for button text to no longer be 'Checking phone...'
  console.log("Waiting for lookupCustomer response...");
  await page.waitForFunction(() => {
    const btn = document.getElementById('btn-phone-continue');
    const text = btn ? btn.innerText.trim().toUpperCase() : '';
    return text !== 'CHECKING PHONE...' && text !== 'CONTINUE →';
  }, { timeout: 15000 });

  const authState = await page.evaluate(() => {
    const pinGroup = document.getElementById('auth-pin-group');
    const pinLabel = pinGroup?.querySelector('label')?.innerText || '';
    const btn = document.getElementById('btn-phone-continue');
    return {
      pinGroupDisplay: pinGroup ? pinGroup.style.display : null,
      pinLabel,
      btnText: btn?.innerText
    };
  });

  console.log("Phone lookup succeeded! Auth state:", authState);

  await browser.close();
})();
