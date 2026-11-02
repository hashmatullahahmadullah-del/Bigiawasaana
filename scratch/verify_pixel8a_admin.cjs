const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set Pixel 8a viewport
  await page.setViewport({
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true
  });

  console.log('Navigating to local admin...');
  // We can test dist/admin.html via file or local server
  await page.goto('http://localhost:5173/admin.html', { waitUntil: 'networkidle2', timeout: 15000 }).catch(async () => {
    console.log('Falling back to file url or preview...');
  });

  await browser.close();
})();
