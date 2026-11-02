const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('https://www.bigiawasaana.com', { waitUntil: 'networkidle2' });

  // Scroll so that the zabiha button is right under the nav
  const pos = await page.evaluate(() => {
    const btn = document.querySelector('a[href="/blog/zabiha-halal-food-reseda-san-fernando-valley"]');
    const rect = btn.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return rect.top + scrollTop;
  });

  await page.evaluate((top) => {
    window.scrollTo(0, top - 30);
  }, pos);
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: 'scratch/viewport_full.png' });
  console.log('Saved scratch/viewport_full.png');

  await browser.close();
})();
