const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Test 1: Public Catering page
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('https://www.bigiawasaana.com/catering', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'scratch/public_catering_mobile_top.png' });
  
  // Scroll down to package builder or inquiry section
  await page.evaluate(() => window.scrollTo(0, 800));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/public_catering_mobile_mid.png' });
  
  await page.evaluate(() => window.scrollTo(0, 1600));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/public_catering_mobile_bottom.png' });

  // Check overflow on public catering
  const publicOverflow = await page.evaluate(() => {
    const docW = document.documentElement.offsetWidth;
    const scrollW = document.documentElement.scrollWidth;
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > docW + 2) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          cls: el.className,
          right: Math.round(r.right),
          width: Math.round(r.width)
        });
      }
    });
    return { docW, scrollW, hasOverflow: scrollW > docW, overflowing: overflowing.slice(0, 10) };
  });
  console.log('Public Catering Mobile Overflow:', publicOverflow);

  // Test 2: Admin Catering section
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    if (typeof window.switchAdminView === 'function') {
      window.switchAdminView('catering-view');
    }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/admin_catering_mobile_live_top.png' });

  const adminOverflow = await page.evaluate(() => {
    const docW = document.documentElement.offsetWidth;
    const scrollW = document.documentElement.scrollWidth;
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > docW + 2) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          cls: el.className,
          right: Math.round(r.right),
          width: Math.round(r.width)
        });
      }
    });
    return { docW, scrollW, hasOverflow: scrollW > docW, overflowing: overflowing.slice(0, 10) };
  });
  console.log('Admin Catering Mobile Overflow:', adminOverflow);

  await browser.close();
})();
