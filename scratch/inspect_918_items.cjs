const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.setViewport({ width: 918, height: 800 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app', { waitUntil: 'networkidle2' });

  const info = await page.evaluate(() => {
    const nav = document.querySelector('.site-nav');
    const navRect = nav.getBoundingClientRect();
    const items = Array.from(document.querySelectorAll('.site-nav .container > *'));
    const linkItems = Array.from(document.querySelectorAll('.nav-links > li'));
    
    return {
      nav: { left: navRect.left, right: navRect.right, width: navRect.width },
      linkItems: linkItems.map(li => {
        const r = li.getBoundingClientRect();
        return {
          text: li.innerText.trim().replace(/\n/g, ' '),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          overflows: r.right > navRect.right
        };
      })
    };
  });

  console.log("Nav at 918px:", info.nav);
  console.log("Link items at 918px:");
  console.table(info.linkItems);

  await browser.close();
})();
