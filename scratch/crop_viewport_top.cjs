const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('https://www.bigiawasaana.com', { waitUntil: 'networkidle2' });

  // Scroll to zabiha section
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

  // Take screenshot of top of viewport (0 to 1200, 0 to 120)
  await page.screenshot({ path: 'scratch/viewport_top.png', clip: { x: 0, y: 0, width: 1200, height: 120 } });
  console.log('Saved scratch/viewport_top.png');

  await browser.close();
})();
