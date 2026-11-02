const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to https://www.bigiawasaana.com/menu...');
  await page.goto('https://www.bigiawasaana.com/menu', { waitUntil: 'networkidle2' });

  // Add item by clicking the first menu card button
  const addBtn = await page.$('.menu-card .btn-primary, .menu-card button');
  console.log('Found add button:', !!addBtn);
  if (addBtn) {
    await addBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // If modal opened, click Add to Order in modal
    const modalAddBtn = await page.$('#item-modal-add-btn, .modal-add-btn, button[onclick*="addItemToCart"]');
    if (modalAddBtn) {
      await modalAddBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // Check cart length
  const cartInfo = await page.evaluate(() => {
    return {
      cartLength: (window.cart || []).length,
      cartTotal: document.getElementById('cart-total')?.textContent,
      checkoutBtnText: document.getElementById('checkout-btn')?.textContent,
      checkoutBtnDisabled: document.getElementById('checkout-btn')?.disabled
    };
  });
  console.log('Cart Info after adding:', cartInfo);

  // Fill customer name & phone
  await page.evaluate(() => {
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    if (nameInput) nameInput.value = 'Ahmad Karimi';
    if (phoneInput) phoneInput.value = '(818) 555-0199';
    // Select schedule for later if store is closed
    const schedRadio = document.querySelector('input[value="scheduled"]');
    if (schedRadio) {
      schedRadio.checked = true;
      schedRadio.dispatchEvent(new Event('change'));
    }
  });

  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'scratch/live_cart_filled.png' });
  console.log('Saved scratch/live_cart_filled.png');

  // Click checkout button
  const chkBtn = await page.$('#checkout-btn');
  if (chkBtn) {
    await chkBtn.click();
    await new Promise(r => setTimeout(r, 1200));
  }

  await page.screenshot({ path: 'scratch/live_payment_modal_desktop.png' });
  console.log('Saved scratch/live_payment_modal_desktop.png');

  // Mobile screenshot of payment modal
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/live_payment_modal_mobile.png' });
  console.log('Saved scratch/live_payment_modal_mobile.png');

  await browser.close();
})();
