const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });

  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });

  // Get info
  const navStyle = await page.evaluate(() => {
    const nav = document.querySelector('.crm-nav');
    const main = document.querySelector('.crm-main');
    const csNav = nav ? window.getComputedStyle(nav) : null;
    const csMain = main ? window.getComputedStyle(main) : null;
    return {
      navPosition: csNav ? csNav.position : null,
      navWidth: csNav ? csNav.width : null,
      navLeft: csNav ? csNav.left : null,
      mainWidth: csMain ? csMain.width : null,
      mainPadding: csMain ? csMain.padding : null,
      docW: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth
    };
  });

  console.log('Live Admin on 375px:', navStyle);
  await browser.close();
})();
