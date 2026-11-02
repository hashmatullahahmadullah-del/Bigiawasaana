const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });

  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });

  const info = await page.evaluate(() => {
    return {
      docW: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  console.log('Live Production Check:', info);
  await browser.close();
})();
