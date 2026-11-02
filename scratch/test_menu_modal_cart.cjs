const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const testViewport = async (w, h) => {
    console.log(`\n=== Testing Menu & Modal & Cart at ${w}x${h} ===`);
    await page.setViewport({ width: w, height: h });
    await page.goto('https://bigi-awasaana-7b3ce.web.app/menu', { waitUntil: 'networkidle2' });

    // 1. Find the first item card and click it or its button
    const cardInfo = await page.evaluate(() => {
      const card = document.querySelector('.menu-card');
      if (!card) return null;
      const btn = card.querySelector('button, .btn-primary, .add-to-cart-btn') || card;
      const title = card.querySelector('.menu-card-title, h3, h2')?.innerText;
      return { title, btnFound: !!btn };
    });
    console.log('First card:', cardInfo);

    // Click the first card
    await page.evaluate(() => {
      const card = document.querySelector('.menu-card');
      if (card) {
        const btn = card.querySelector('.add-to-cart-btn, .btn-primary, button') || card;
        btn.click();
      }
    });

    await new Promise(r => setTimeout(r, 600));

    // Check modal or cart drawer state
    const modalState = await page.evaluate(() => {
      const modal = document.querySelector('#item-details-modal, .item-modal, .modal-overlay');
      const cartDrawer = document.querySelector('#cart-drawer, .cart-sidebar, .cart-drawer');
      const modalVisible = modal && window.getComputedStyle(modal).display !== 'none';
      const cartVisible = cartDrawer && (
        cartDrawer.classList.contains('open') || 
        window.getComputedStyle(cartDrawer).transform !== 'none' ||
        window.getComputedStyle(cartDrawer).visibility !== 'hidden'
      );
      return {
        modalVisible,
        modalRect: modal && modalVisible ? modal.getBoundingClientRect() : null,
        cartVisible,
        cartRect: cartDrawer ? cartDrawer.getBoundingClientRect() : null
      };
    });

    console.log('State after click:', modalState);
    await page.screenshot({ path: `scratch/modal_test_${w}.png` });

    // If modal is open, test clicking Add to Cart inside modal
    if (modalState.modalVisible) {
      console.log('Modal is open, clicking Add to Cart...');
      await page.evaluate(() => {
        const addBtn = document.querySelector('#item-modal-add-btn, .item-modal-add-btn, .modal-add-btn');
        if (addBtn) addBtn.click();
      });

      await new Promise(r => setTimeout(r, 600));

      const cartAfterModal = await page.evaluate(() => {
        const cartDrawer = document.querySelector('#cart-drawer, .cart-sidebar, .cart-drawer');
        const cartItems = document.querySelectorAll('.cart-item, .cart-list-item');
        return {
          cartCount: cartItems.length,
          cartClass: cartDrawer ? cartDrawer.className : '',
          cartTransform: cartDrawer ? window.getComputedStyle(cartDrawer).transform : ''
        };
      });
      console.log('Cart after modal add:', cartAfterModal);
      await page.screenshot({ path: `scratch/cart_test_${w}.png` });
    }
  };

  await testViewport(375, 812);
  await testViewport(1280, 800);

  await browser.close();
})();
