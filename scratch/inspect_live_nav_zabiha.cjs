const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating to homepage...');
  await page.goto('https://www.bigiawasaana.com', { waitUntil: 'networkidle2' });

  // Scroll to zabiha section
  await page.evaluate(() => {
    const el = document.getElementById('zabiha-trust');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: 'scratch/live_scroll_zabiha_1280.png' });
  console.log('Saved scratch/live_scroll_zabiha_1280.png');

  // Let's inspect the computed styles of .site-nav
  const navStyles = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav');
    if (!nav) return null;
    const computed = window.getComputedStyle(nav);
    return {
      background: computed.backgroundColor,
      backdropFilter: computed.backdropFilter,
      webkitBackdropFilter: computed.webkitBackdropFilter,
      zIndex: computed.zIndex,
      opacity: computed.opacity,
      boxShadow: computed.boxShadow,
      className: nav.className
    };
  });
  console.log('Nav computed styles:', navStyles);

  await browser.close();
})();
