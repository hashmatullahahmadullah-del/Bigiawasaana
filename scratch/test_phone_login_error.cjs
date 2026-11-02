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

  await new Promise(r => setTimeout(r, 3000));

  // Check auth error element
  const authErr = await page.evaluate(() => {
    const errBox = document.getElementById('auth-modal-error');
    const pinGroup = document.getElementById('auth-pin-group');
    const pinVisible = pinGroup ? (pinGroup.style.display !== 'none' && window.getComputedStyle(pinGroup).display !== 'none') : false;
    const btnText = document.getElementById('btn-phone-continue')?.innerText;
    return {
      errVisible: errBox ? window.getComputedStyle(errBox).display !== 'none' : false,
      errText: errBox ? errBox.innerText : '',
      pinVisible,
      btnText
    };
  });

  console.log("Step 1 (Phone Lookup) Result:", authErr);

  // If PIN group is visible, try entering a PIN and clicking continue
  if (authErr.pinVisible) {
    console.log("Entering PIN 1234...");
    await page.type('#auth-pin-input', '1234');
    await new Promise(r => setTimeout(r, 500));
    await page.click('#btn-phone-continue');
    await new Promise(r => setTimeout(r, 3000));

    const pinResult = await page.evaluate(() => {
      const errBox = document.getElementById('auth-modal-error');
      const btnText = document.getElementById('btn-phone-continue')?.innerText;
      return {
        errVisible: errBox ? window.getComputedStyle(errBox).display !== 'none' : false,
        errText: errBox ? errBox.innerText : '',
        btnText
      };
    });
    console.log("Step 2 (PIN Submit) Result:", pinResult);
  }

  await browser.close();
})();
