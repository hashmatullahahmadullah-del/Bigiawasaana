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

  // Enter a test non-existent phone
  console.log("Entering test phone 8185550199...");
  await page.type('#auth-phone-input', '8185550199');
  await page.click('#btn-phone-continue');

  await page.waitForFunction(() => {
    const btn = document.getElementById('btn-phone-continue');
    const text = btn ? btn.innerText.trim().toUpperCase() : '';
    return text === 'CREATE PIN & SIGN IN →';
  }, { timeout: 15000 });

  const state = await page.evaluate(() => {
    const pinGroup = document.getElementById('auth-pin-group');
    const pinLabel = pinGroup?.querySelector('label')?.innerText;
    const btnText = document.getElementById('btn-phone-continue')?.innerText;
    return { pinLabel, btnText };
  });

  console.log("New customer prompt state:", state);
  await browser.close();
})();
