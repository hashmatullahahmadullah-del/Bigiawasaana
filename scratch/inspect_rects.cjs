const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 918, height: 800 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app/', { waitUntil: 'networkidle2' });
  const data = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav');
    const navR = nav.getBoundingClientRect();
    const children = Array.from(nav.children).map(c => {
      const r = c.getBoundingClientRect();
      return {
        tag: c.tagName,
        class: c.className,
        text: c.innerText.trim().replace(/\n+/g, ' '),
        rect: { left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom }
      };
    });
    return {
      windowWidth: window.innerWidth,
      nav: { left: navR.left, right: navR.right, width: navR.width },
      children
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
