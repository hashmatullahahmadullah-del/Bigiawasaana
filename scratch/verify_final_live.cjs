const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const urls = [
    'https://bigi-awasaana-7b3ce.web.app/',
    'https://bigi-awasaana-7b3ce.web.app/menu',
    'https://bigi-awasaana-7b3ce.web.app/item/bigi-s-chapli-kabob',
    'https://bigi-awasaana-7b3ce.web.app/areas/reseda',
    'https://bigi-awasaana-7b3ce.web.app/blog/gyro-vs-shawarma-vs-doner-difference'
  ];

  for (const url of urls) {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log(`\nChecked ${url}:`);
    console.log(`Console errors (${errors.length}):`, errors);

    // Check 918px nav
    await page.setViewport({ width: 918, height: 800 });
    const navCheck = await page.evaluate(() => {
      const nav = document.querySelector('.site-nav');
      const hamburger = document.querySelector('.nav-hamburger');
      const navLinks = document.querySelector('.nav-links');
      return {
        hamburgerVisible: hamburger ? window.getComputedStyle(hamburger).display : 'none',
        linksVisible: navLinks ? window.getComputedStyle(navLinks).display : 'none'
      };
    });
    console.log('918px nav state:', navCheck);

    page.removeAllListeners('console');
  }

  // Also test item modal on mobile 375px on live
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app/menu', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const card = document.querySelector('.menu-card');
    if (card) {
      const btn = card.querySelector('.add-to-cart-btn') || card;
      btn.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const modalCheck = await page.evaluate(() => {
    const modal = document.querySelector('.item-modal');
    const btn = document.querySelector('#item-modal-add-btn');
    if (!modal || !btn) return null;
    const mR = modal.getBoundingClientRect();
    const bR = btn.getBoundingClientRect();
    return {
      modalBottom: Math.round(mR.bottom),
      btnBottom: Math.round(bR.bottom),
      btnInside: bR.bottom <= mR.bottom && bR.top >= mR.top
    };
  });
  console.log('\nLive Item Modal Check on 375px:', modalCheck);
  await page.screenshot({ path: 'scratch/final_live_modal_375.png' });

  // Take screenshot of 918px header
  await page.setViewport({ width: 918, height: 800 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app/', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'scratch/final_live_nav_918.png', clip: { x: 0, y: 0, width: 918, height: 160 } });

  await browser.close();
})();
