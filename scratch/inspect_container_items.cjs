const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 918, height: 800 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app/', { waitUntil: 'networkidle2' });
  const data = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav');
    const container = document.querySelector('.site-nav .container');
    const navR = nav.getBoundingClientRect();
    const cR = container.getBoundingClientRect();
    const items = Array.from(container.children).map(c => {
      const r = c.getBoundingClientRect();
      return {
        tag: c.tagName,
        class: c.className,
        text: c.innerText.trim().replace(/\n+/g, ' '),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        overflowsNav: r.right > navR.right || r.left < navR.left
      };
    });
    return {
      nav: { left: Math.round(navR.left), right: Math.round(navR.right), width: Math.round(navR.width) },
      container: { left: Math.round(cR.left), right: Math.round(cR.right), width: Math.round(cR.width) },
      items
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
