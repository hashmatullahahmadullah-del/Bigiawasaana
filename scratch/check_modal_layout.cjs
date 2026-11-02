const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app/menu', { waitUntil: 'networkidle2' });

  // Open modal
  await page.evaluate(() => {
    const card = document.querySelector('.menu-card');
    if (card) {
      const btn = card.querySelector('.add-to-cart-btn') || card;
      btn.click();
    }
  });

  await new Promise(r => setTimeout(r, 600));

  const modalChecks = await page.evaluate(() => {
    const modal = document.querySelector('.item-modal');
    if (!modal) return { error: 'Modal not found' };
    const r = modal.getBoundingClientRect();
    const btn = document.querySelector('#item-modal-add-btn');
    const btnR = btn ? btn.getBoundingClientRect() : null;
    return {
      modalRect: { left: r.left, right: r.right, width: r.width, height: r.height, top: r.top, bottom: r.bottom },
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      addBtnRect: btnR ? { left: btnR.left, right: btnR.right, width: btnR.width, bottom: btnR.bottom } : null,
      overflowsX: r.right > window.innerWidth || r.left < 0,
      overflowsY: r.bottom > window.innerHeight
    };
  });

  console.log('Modal Checks on 375px:', modalChecks);

  await browser.close();
})();
