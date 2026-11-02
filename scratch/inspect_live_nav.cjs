const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 918, height: 800 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app/', { waitUntil: 'networkidle2' });
  const navInfo = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav') || document.querySelector('nav');
    const lang = document.querySelector('.site-lang-toggle') || document.querySelector('.lang-btn');
    const links = Array.from(document.querySelectorAll('.site-nav a, .site-nav button, nav a, nav button')).map(el => ({
      text: el.innerText.trim().replace(/\n+/g, ' '),
      tag: el.tagName,
      className: el.className,
      rect: el.getBoundingClientRect(),
      display: window.getComputedStyle(el).display
    }));
    return {
      navRect: nav ? nav.getBoundingClientRect() : null,
      navBg: nav ? window.getComputedStyle(nav).backgroundColor : null,
      navBackdrop: nav ? window.getComputedStyle(nav).backdropFilter : null,
      langRect: lang ? lang.getBoundingClientRect() : null,
      langStyles: lang ? {
        border: window.getComputedStyle(lang).border,
        color: window.getComputedStyle(lang).color,
        background: window.getComputedStyle(lang).background
      } : null,
      links
    };
  });
  console.log(JSON.stringify(navInfo, null, 2));
  await browser.close();
})();
