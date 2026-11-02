const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  const res = await page.goto('https://www.bigiawasaana.com/waiver.html', { waitUntil: 'networkidle2' });
  console.log('Production HTTP Status:', res.status());

  await page.screenshot({ path: 'scratch/verified_live_production_waiver.png' });
  console.log('Saved scratch/verified_live_production_waiver.png');

  await browser.close();
})();
