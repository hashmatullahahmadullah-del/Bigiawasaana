const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const viewports = [375, 768, 918, 1280];

  for (const w of viewports) {
    await page.setViewport({ width: w, height: 800 });
    await page.goto('https://bigi-awasaana-7b3ce.web.app/', { waitUntil: 'networkidle2' });

    // Switch to Farsi (RTL)
    await page.evaluate(() => {
      // Find toggle button
      const btn = document.querySelector('.site-lang-toggle') || document.querySelector('.lang-btn');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    const check = await page.evaluate((width) => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientWidth = docEl.clientWidth;
      const dir = docEl.getAttribute('dir');
      
      const nav = document.querySelector('.site-nav');
      const navR = nav ? nav.getBoundingClientRect() : null;
      const navLinks = document.querySelector('.nav-links');
      const linksR = navLinks ? navLinks.getBoundingClientRect() : null;

      // Check all elements for horizontal overflow in RTL
      const overflowing = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > clientWidth + 2 || r.left < -2) {
          overflowing.push({
            tag: el.tagName,
            class: el.className ? String(el.className).slice(0, 40) : '',
            id: el.id,
            left: Math.round(r.left),
            right: Math.round(r.right),
            clientWidth
          });
        }
      });

      return {
        width,
        dir,
        hasHorizontalOverflow: scrollWidth > clientWidth + 2,
        scrollWidth,
        clientWidth,
        overflowing: overflowing.slice(0, 5)
      };
    }, w);

    console.log(`Viewport ${w}px RTL test:`, JSON.stringify(check, null, 2));
    await page.screenshot({ path: `scratch/rtl_test_${w}.png` });
  }

  await browser.close();
})();
