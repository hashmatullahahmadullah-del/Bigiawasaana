const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });

  await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/admin.html', { waitUntil: 'domcontentloaded' });

  // Make dashboard-section visible and catering-view active
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('catering-view').style.display = 'block';
    document.getElementById('catering-view').classList.add('active');
  });

  // Check overflow on catering view
  const overflowElements = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const overflowing = [];
    document.querySelectorAll('#catering-view *').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docW + 1) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          docW
        });
      }
    });
    return overflowing;
  });

  console.log('Overflowing elements in #catering-view on 375px:', JSON.stringify(overflowElements, null, 2));
  await browser.close();
})();
