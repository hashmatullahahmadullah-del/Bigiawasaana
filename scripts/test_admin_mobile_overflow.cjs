const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  // Check scrollWidth vs clientWidth of document and body
  const overflowInfo = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    
    // Find all elements wider than docWidth
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 2) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          right: rect.right,
          width: rect.width,
          outerHtml: el.outerHTML.substring(0, 100)
        });
      }
    });

    return {
      docWidth,
      scrollWidth,
      hasOverflow: scrollWidth > docWidth,
      overflowingCount: overflowing.length,
      overflowing: overflowing.slice(0, 10)
    };
  });

  console.log('Mobile 375px Overflow Results:');
  console.log(JSON.stringify(overflowInfo, null, 2));

  await page.screenshot({ path: 'scratch/admin_mobile_overflow_debug.png' });
  await browser.close();
})();
