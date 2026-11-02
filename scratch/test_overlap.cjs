const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  await page.goto('https://www.bigiawasaana.com', { waitUntil: 'networkidle2' });

  // Find scroll position of the buttons
  const pos = await page.evaluate(() => {
    const btn = document.querySelector('a[href="/blog/zabiha-halal-food-reseda-san-fernando-valley"]');
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return rect.top + scrollTop;
  });

  console.log('Button position:', pos);
  if (pos) {
    // Scroll so that the button is right at top: 16px (behind navbar)
    await page.evaluate((top) => {
      window.scrollTo(0, top - 30);
    }, pos);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'scratch/navbar_overlap_test.png' });
    console.log('Saved scratch/navbar_overlap_test.png');
  }

  // Also check navbar styles
  const styles = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav');
    return {
      bg: window.getComputedStyle(nav).backgroundColor,
      opacity: window.getComputedStyle(nav).opacity,
      backdropFilter: window.getComputedStyle(nav).backdropFilter,
      webkitBackdropFilter: window.getComputedStyle(nav).webkitBackdropFilter
    };
  });
  console.log('Styles:', styles);

  await browser.close();
})();
