const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Desktop Viewport (1280x800)
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:4173/waiver.html', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'scratch/verified_waiver_lookup_desktop.png' });
  console.log('Saved scratch/verified_waiver_lookup_desktop.png');

  // Test 2: Mobile Viewport (375x812 - iPhone X)
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.screenshot({ path: 'scratch/verified_waiver_lookup_mobile.png' });
  console.log('Saved scratch/verified_waiver_lookup_mobile.png');

  await browser.close();
})();
