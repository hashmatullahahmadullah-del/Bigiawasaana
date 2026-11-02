const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('https://www.bigiawasaana.com', { waitUntil: 'networkidle2' });

  // Scroll to 2290
  await page.evaluate(() => window.scrollTo(0, 2290));
  await new Promise(r => setTimeout(r, 500));

  const navClip = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav');
    const r = nav.getBoundingClientRect();
    return { x: 0, y: 0, width: 1200, height: Math.round(r.bottom + 20) };
  });

  await page.screenshot({ path: 'scratch/navbar_crop_live.png', clip: navClip });
  console.log('Saved scratch/navbar_crop_live.png with clip', navClip);

  await browser.close();
})();
