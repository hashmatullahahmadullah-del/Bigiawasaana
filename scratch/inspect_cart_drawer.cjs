const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app/menu', { waitUntil: 'networkidle2' });

  // Add an item directly to cart via JS
  await page.evaluate(() => {
    if (window.addToCartDirect) {
      window.addToCartDirect('bigi-s-chapli-kabob');
    } else {
      const card = document.querySelector('.menu-card');
      if (card) {
        const btn = card.querySelector('.add-to-cart-btn') || card;
        btn.click();
      }
    }
  });

  await new Promise(r => setTimeout(r, 600));

  // If modal opened, click add
  await page.evaluate(() => {
    const btn = document.querySelector('#item-modal-add-btn');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 600));

  // Inspect cart drawer elements
  const cartInfo = await page.evaluate(() => {
    const drawer = document.querySelector('#cart-drawer, .cart-sidebar');
    if (!drawer) return { error: 'No drawer' };
    const r = drawer.getBoundingClientRect();
    const checkoutBtn = drawer.querySelector('#checkout-btn, .checkout-btn, [onclick*="checkout" i], button.btn-primary');
    const cR = checkoutBtn ? checkoutBtn.getBoundingClientRect() : null;
    return {
      drawer: { left: r.left, right: r.right, width: r.width, height: r.height, top: r.top, bottom: r.bottom },
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      checkoutBtn: cR ? { left: cR.left, right: cR.right, width: cR.width, height: cR.height, top: cR.top, bottom: cR.bottom } : null,
      overflowsX: r.right > window.innerWidth + 2 || r.left < -2
    };
  });

  console.log('Cart drawer inspection:', cartInfo);
  await page.screenshot({ path: 'scratch/cart_drawer_inspected.png' });

  await browser.close();
})();
