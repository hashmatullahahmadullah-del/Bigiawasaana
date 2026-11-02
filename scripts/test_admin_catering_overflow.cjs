const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  // Click Catering nav item
  await page.evaluate(() => {
    const navBtn = document.querySelector('[data-target="catering-view"]');
    if (navBtn) navBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const cateringOverflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    
    const overflowing = [];
    document.querySelectorAll('#catering-view *').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 2) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          outerHtml: el.outerHTML.substring(0, 120)
        });
      }
    });

    return {
      docWidth,
      scrollWidth,
      hasOverflow: scrollWidth > docWidth,
      overflowingCount: overflowing.length,
      overflowing: overflowing.slice(0, 15)
    };
  });

  console.log('Catering View at 375px:');
  console.log(JSON.stringify(cateringOverflow, null, 2));

  await page.screenshot({ path: 'scratch/admin_catering_375_overflow.png' });
  await browser.close();
})();
