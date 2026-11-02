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
        console.log(`[NETWORK BODY]:`, text.substring(0, 300));
      } catch (e) {}
    }
  });

  console.log("Navigating to https://bigi-awasaana-7b3ce.web.app/order-history.html...");
  await page.goto('https://bigi-awasaana-7b3ce.web.app/order-history.html', { waitUntil: 'networkidle2' });

  // Type phone
  await page.type('#input-phone', '3239211646');
  console.log("Form submitting...");
  await page.evaluate(() => {
    const form = document.getElementById('form-phone');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  await new Promise(r => setTimeout(r, 4000));

  const state = await page.evaluate(() => {
    return {
      stepPinDisplay: document.getElementById('form-pin')?.style?.display,
      stepPhoneDisplay: document.getElementById('form-phone')?.style?.display,
      alertText: document.getElementById('status-alert')?.innerText
    };
  });
  console.log("State after submit:", state);

  await browser.close();
})();
