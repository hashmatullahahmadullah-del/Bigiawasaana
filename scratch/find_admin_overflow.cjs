const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  // Go to local admin page
  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  // Simulate authenticated admin so view renders
  await page.evaluate(() => {
    // switch to catering view
    const cateringNav = document.querySelector('[data-view="catering"]');
    if (cateringNav) cateringNav.click();
    
    // switch to dark mode first
    document.body.classList.remove('light-mode');
  });

  await new Promise(r => setTimeout(r, 1000));

  // Find all elements overflowing horizontally
  const overflowing = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const docScrollWidth = document.documentElement.scrollWidth;

    const badElements = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 2) {
        badElements.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          right: rect.right,
          width: rect.width,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          text: (el.innerText || '').slice(0, 40)
        });
      }
    });

    return {
      docWidth,
      bodyScrollWidth,
      docScrollWidth,
      badElements: badElements.slice(0, 20)
    };
  });

  console.log('Overflow Report at 375px:');
  console.log('docWidth:', overflowing.docWidth);
  console.log('docScrollWidth:', overflowing.docScrollWidth);
  console.log('bodyScrollWidth:', overflowing.bodyScrollWidth);
  console.log('Bad Elements count:', overflowing.badElements.length);
  overflowing.badElements.forEach((b, i) => {
    console.log(`[${i}] <${b.tag} id="${b.id}" class="${b.className}"> width: ${b.width}, right: ${b.right}, text: ${b.text}`);
  });

  await page.screenshot({ path: 'scratch/admin_mobile_overflow_debug.png' });

  // Test light mode
  await page.evaluate(() => {
    document.body.classList.add('light-mode');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/admin_mobile_light_overflow_debug.png' });

  await browser.close();
}

test().catch(console.error);
