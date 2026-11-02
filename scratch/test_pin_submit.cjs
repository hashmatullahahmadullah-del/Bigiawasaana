const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  await page.goto('https://bigi-awasaana-7b3ce.web.app', { waitUntil: 'networkidle2' });

  // Open modal
  await page.evaluate(() => {
    const btn = document.querySelector('.nav-signin-btn, #nav-signin-btn, #nav-mobile-signin-btn');
    if (btn) btn.click();
  });
  await page.waitForSelector('#auth-phone-input', { visible: true, timeout: 5000 });

  // Enter phone
  await page.type('#auth-phone-input', '3239211646');
  await page.click('#btn-phone-continue');

  // Wait for PIN field
  await page.waitForFunction(() => {
    const btn = document.getElementById('btn-phone-continue');
    const text = btn ? btn.innerText.trim().toUpperCase() : '';
    return text === 'SIGN IN WITH PIN →';
  }, { timeout: 15000 });

  // Test incorrect PIN: 0000
  console.log("Entering test PIN: 0000...");
  await page.type('#auth-pin-input', '0000');
  await page.click('#btn-phone-continue');

  await page.waitForFunction(() => {
    const errBox = document.getElementById('auth-error-msg');
    return errBox && window.getComputedStyle(errBox).display !== 'none';
  }, { timeout: 15000 });

  const errorState = await page.evaluate(() => {
    const errBox = document.getElementById('auth-error-msg');
    return errBox ? errBox.innerText : '';
  });

  console.log("Displayed error message:", errorState);

  await browser.close();
})();
