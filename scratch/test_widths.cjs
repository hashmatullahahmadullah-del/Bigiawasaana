const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Test local dist or live
  for (let w = 860; w <= 1200; w += 20) {
    await page.setViewport({ width: w, height: 800 });
    await page.goto('https://bigi-awasaana-7b3ce.web.app/', { waitUntil: 'networkidle2' });
    const check = await page.evaluate(() => {
      const nav = document.querySelector('.site-nav');
      const lang = document.querySelector('.site-lang-toggle');
      const navLinks = document.querySelector('.nav-links');
      if (!nav || !lang || !navLinks) return null;
      const navR = nav.getBoundingClientRect();
      const langR = lang.getBoundingClientRect();
      const linksR = navLinks.getBoundingClientRect();
      return {
        navRight: Math.round(navR.right),
        linksRight: Math.round(linksR.right),
        langRight: Math.round(langR.right),
        overflow: langR.right > navR.right || linksR.right > navR.right,
        langDiff: Math.round(langR.right - navR.right)
      };
    });
    if (check && check.overflow) {
      console.log(`OVERFLOW at width ${w}px: lang overflows nav by ${check.langDiff}px!`);
    } else {
      console.log(`OK at width ${w}px`);
    }
  }
  await browser.close();
})();
