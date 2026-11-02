const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://bigi-awasaana-7b3ce.web.app', { waitUntil: 'networkidle2' });
  
  // Click first ADD button
  const firstAddBtn = await page.$('#featured-menu-grid .menu-card .add-to-cart-btn');
  if (firstAddBtn) {
    await firstAddBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if cart badge updated or modal opened
    const cartCount = await page.$eval('.cart-badge, #cart-count, .cart-counter', el => el.innerText).catch(() => 'not found');
    console.log("Cart count after clicking ADD:", cartCount);
  } else {
    console.log("No ADD button found");
  }

  await browser.close();
})();
