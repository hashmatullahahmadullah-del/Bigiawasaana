const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('https://bigi-awasaana-7b3ce.web.app/menu.html', { waitUntil: 'domcontentloaded' });
  
  // Click Smash Burger (id should be in the DOM)
  // Let's just evaluate a function to open the modal
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const waitForCards = setInterval(() => {
        const cards = Array.from(document.querySelectorAll('.menu-item-content h3'));
        const smash = cards.find(c => c.textContent.includes('Smash Burger'));
        if (smash) {
            clearInterval(waitForCards);
            smash.closest('.menu-item-card').click();
            setTimeout(resolve, 1000);
        }
      }, 500);
    });
  });
  
  // Get modal HTML
  const modalHtml = await page.evaluate(() => {
    return document.getElementById('item-details-modal').innerHTML;
  });
  
  console.log("MODAL HTML:\n" + modalHtml);
  
  await browser.close();
})();
