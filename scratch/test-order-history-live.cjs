const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('https://www.bigiawasaana.com/order-history', { waitUntil: 'networkidle2' });
  
  console.log('Page title:', await page.title());
  console.log('Console errors on load:', errors);
  
  const formPhone = await page.$('#form-phone');
  const inputPhone = await page.$('#input-phone');
  console.log('formPhone exists:', Boolean(formPhone));
  console.log('inputPhone exists:', Boolean(inputPhone));

  if (inputPhone) {
    await page.type('#input-phone', '8185551234');
    const val = await page.evaluate(() => document.getElementById('input-phone').value);
    console.log('inputPhone formatted value:', val);
  }

  await browser.close();
})();
