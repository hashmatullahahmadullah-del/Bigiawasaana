const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('--- 1. Testing Live Desktop Home ---');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://www.bigiawasaana.com/', { waitUntil: 'networkidle2' });

  const desktopBtn = await page.evaluate(() => {
    const btn = document.getElementById('nav-account-btn');
    return {
      exists: Boolean(btn),
      text: btn ? btn.textContent.trim() : null,
      display: btn ? window.getComputedStyle(btn).display : null,
      visibility: btn ? window.getComputedStyle(btn).visibility : null
    };
  });
  console.log('Desktop #nav-account-btn:', desktopBtn);

  console.log('Clicking desktop #nav-account-btn...');
  await page.click('#nav-account-btn');
  await new Promise(r => setTimeout(r, 1200));

  const modalLive = await page.evaluate(() => {
    const modal = document.getElementById('auth-modal');
    return {
      modalExists: Boolean(modal),
      activeClass: modal ? modal.classList.contains('active') : false,
      display: modal ? window.getComputedStyle(modal).display : null,
      phoneInput: Boolean(document.getElementById('auth-phone-input')),
      googleBtn: Boolean(document.getElementById('btn-auth-google')),
      appleBtn: Boolean(document.getElementById('btn-auth-apple'))
    };
  });
  console.log('Auth modal on live site:', modalLive);

  console.log('\n--- 2. Testing Live Mobile Menu ---');
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('https://www.bigiawasaana.com/menu', { waitUntil: 'networkidle2' });

  const mobileMenuBtn = await page.evaluate(() => {
    const btn = document.getElementById('nav-mobile-signin-btn');
    return {
      exists: Boolean(btn),
      text: btn ? btn.textContent.trim() : null,
      display: btn ? window.getComputedStyle(btn).display : null
    };
  });
  console.log('Mobile #nav-mobile-signin-btn on /menu:', mobileMenuBtn);

  console.log('\n--- 3. Testing Live Order History Page ---');
  await page.goto('https://www.bigiawasaana.com/order-history', { waitUntil: 'networkidle2' });
  const liveOrderHistory = await page.evaluate(() => {
    return {
      title: document.title,
      verifyTitle: document.getElementById('verify-title')?.textContent?.trim(),
      hasPhoneForm: Boolean(document.getElementById('form-phone')),
      hasPinForm: Boolean(document.getElementById('form-pin')),
      hasGoogleBtn: Boolean(document.getElementById('btn-page-google'))
    };
  });
  console.log('Live order history verification:', liveOrderHistory);

  console.log('\n--- 4. Checking Live Menu Items Count ---');
  const liveMenuCount = await page.evaluate(async () => {
    const res = await fetch('/menu');
    const text = await res.text();
    const ids = (text.match(/data-item-id="([^"]+)"/g) || []);
    return {
      totalCards: ids.length,
      uniqueCards: new Set(ids).size
    };
  });
  console.log('Live /menu card counts:', liveMenuCount);

  await browser.close();
  console.log('\nAll live checks completed!');
})();
