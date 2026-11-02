const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  console.log("Navigating to https://bigi-awasaana-7b3ce.web.app/menu...");
  await page.goto('https://bigi-awasaana-7b3ce.web.app/menu', { waitUntil: 'networkidle2' });

  // 1. Click first item card
  console.log("Clicking first menu item card to open modal...");
  const firstCard = await page.$('.menu-card');
  if (firstCard) {
    await firstCard.click();
    await new Promise(r => setTimeout(r, 800));

    const modalState = await page.evaluate(() => {
      const modal = document.getElementById('item-details-modal');
      const title = document.getElementById('item-modal-title')?.innerText;
      const price = document.getElementById('item-modal-price')?.innerText;
      const isVisible = modal && modal.style.display === 'flex';
      return { isVisible, title, price };
    });
    console.log("Modal state:", modalState);

    // 2. Click Add button in modal
    console.log("Clicking item-modal-add-btn...");
    await page.click('#item-modal-add-btn');
    await new Promise(r => setTimeout(r, 1000));

    // 3. Check Cart Drawer
    const cartState = await page.evaluate(() => {
      const drawer = document.getElementById('cart-drawer');
      const isOpen = drawer && drawer.classList.contains('open');
      const count = document.getElementById('cart-count')?.innerText;
      const total = document.getElementById('cart-subtotal')?.innerText || document.getElementById('cart-total')?.innerText;
      return { isOpen, count, total };
    });
    console.log("Cart drawer state after add:", cartState);

    // 4. Test Cart close button
    console.log("Closing cart drawer...");
    const closeBtn = await page.$('#cart-close, .cart-close-btn');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 500));

    const isClosed = await page.evaluate(() => {
      const drawer = document.getElementById('cart-drawer');
      return !drawer.classList.contains('open');
    });
    console.log("Cart closed cleanly:", isClosed);
  }

  console.log("Console errors during flow:", errors);
  await browser.close();
})();
