const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to live /menu...');
  await page.goto('https://www.bigiawasaana.com/menu', { waitUntil: 'networkidle2' });

  // Add first item to cart
  await page.evaluate(() => {
    // Add item directly via cart function or click
    if (typeof window.addToCart === 'function') {
      window.addToCart('chapli-kabob-plate', "Bigi's Chapli Kabob Plate", 16.99, '/m-img/1791950307107_1000004875.webp');
    }
    // Fill customer info
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    if (nameInput) nameInput.value = 'John Doe';
    if (phoneInput) phoneInput.value = '(818) 555-0199';
    // Open cart drawer
    if (typeof window.toggleCart === 'function') window.toggleCart(true);
  });

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/checkout_cart_drawer_desktop.png' });
  console.log('Saved scratch/checkout_cart_drawer_desktop.png');

  // Click checkout / open payment modal
  await page.evaluate(() => {
    if (typeof window.openPaymentModal === 'function') {
      window.openPaymentModal();
    }
  });

  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'scratch/checkout_payment_modal_desktop.png' });
  console.log('Saved scratch/checkout_payment_modal_desktop.png');

  // Test mobile viewport (375px)
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/checkout_payment_modal_mobile.png' });
  console.log('Saved scratch/checkout_payment_modal_mobile.png');

  await browser.close();
  console.log('Done!');
})();
