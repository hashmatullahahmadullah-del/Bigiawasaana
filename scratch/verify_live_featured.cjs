const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  console.log("Navigating to https://bigi-awasaana-7b3ce.web.app...");
  await page.goto('https://bigi-awasaana-7b3ce.web.app', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const items = await page.$$eval('#featured-menu-grid .menu-card', cards => {
    return cards.map(c => {
      const title = c.querySelector('.menu-card-title')?.innerText?.trim() || '';
      const price = c.querySelector('.menu-card-price')?.innerText?.trim() || '';
      const img = c.querySelector('img')?.src || '';
      const btn = c.querySelector('button')?.innerText?.trim() || '';
      return { title, price, img, btn };
    });
  });

  console.log(`Found ${items.length} featured items on live page:`);
  console.log(JSON.stringify(items, null, 2));

  await browser.close();
})();
