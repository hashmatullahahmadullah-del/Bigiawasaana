const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://www.bigiawasaana.com', { waitUntil: 'networkidle2' });
  
  // Wait a couple seconds for any Firestore snapshot to settle
  await new Promise(r => setTimeout(r, 2000));
  
  const featured = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#featured-menu-grid .menu-card'));
    return cards.map(c => ({
      title: c.querySelector('.menu-card-title')?.textContent?.trim() || '',
      price: c.querySelector('.menu-card-price')?.textContent?.trim() || '',
      desc: c.querySelector('.menu-card-desc')?.textContent?.trim() || '',
      img: c.querySelector('img')?.src || 'NO_IMG'
    }));
  });
  
  console.log('Live Featured Items on Homepage:', JSON.stringify(featured, null, 2));
  await browser.close();
})();
