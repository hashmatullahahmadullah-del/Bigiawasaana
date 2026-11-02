const puppeteer = require('puppeteer');

function getBox(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const widths = [1366, 1200, 1140, 1080, 1024, 950, 850];

  for (const w of widths) {
    await page.setViewport({ width: w, height: 800 });
    await page.goto('https://bigi-awasaana-7b3ce.web.app', { waitUntil: 'networkidle2' });
    
    await page.evaluate(() => window.scrollTo(0, 1200));
    await new Promise(r => setTimeout(r, 400));

    const navBox = await page.evaluate(() => {
      const getBox = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), right: Math.round(r.right) };
      };
      const nav = document.querySelector('.site-nav');
      const container = document.querySelector('.site-nav .container');
      const links = document.querySelector('.nav-links');
      const langBtn = document.querySelector('.site-lang-toggle');
      const phoneBtn = document.querySelector('.nav-cta-outline');
      
      return {
        nav: getBox(nav),
        container: getBox(container),
        links: getBox(links),
        lang: getBox(langBtn),
        phone: getBox(phoneBtn)
      };
    });

    console.log(`\n=== Viewport: ${w}px ===`);
    console.log(`Nav: left ${navBox.nav?.left}, right ${navBox.nav?.right}, width ${navBox.nav?.width}`);
    console.log(`Container: left ${navBox.container?.left}, right ${navBox.container?.right}, width ${navBox.container?.width}`);
    console.log(`Lang toggle: left ${navBox.lang?.left}, right ${navBox.lang?.right}`);
    console.log(`Phone btn: left ${navBox.phone?.left}, right ${navBox.phone?.right}`);
    if (navBox.nav && navBox.lang) {
      console.log(`Overflow? Lang is ${navBox.lang.right - navBox.nav.right}px relative to nav right`);
    }
    if (navBox.nav && navBox.phone) {
      console.log(`Overflow? Phone is ${navBox.phone.right - navBox.nav.right}px relative to nav right`);
    }
  }

  await browser.close();
})();
