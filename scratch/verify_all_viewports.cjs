const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const viewports = [375, 414, 768, 850, 918, 1024, 1280, 1440];

  for (const w of viewports) {
    await page.setViewport({ width: w, height: 800 });
    await page.goto('https://bigi-awasaana-7b3ce.web.app', { waitUntil: 'networkidle2' });

    const state = await page.evaluate(() => {
      const nav = document.querySelector('.site-nav');
      const hamburger = document.querySelector('.nav-hamburger');
      const navLinks = document.querySelector('.nav-links');
      const langToggle = document.querySelector('.site-nav .site-lang-toggle');
      const navRect = nav?.getBoundingClientRect();
      const langRect = langToggle?.getBoundingClientRect();
      const isMobileNav = hamburger && window.getComputedStyle(hamburger).display !== 'none';
      const areLinksVisible = navLinks && window.getComputedStyle(navLinks).display !== 'none';
      const overflows = langRect && navRect ? langRect.right > navRect.right : false;

      return { isMobileNav, areLinksVisible, overflows, navWidth: navRect?.width };
    });

    console.log(`Viewport ${w}px -> MobileNav: ${state.isMobileNav}, DesktopLinks: ${state.areLinksVisible}, Any Overflow: ${state.overflows}, NavWidth: ${state.navWidth}`);
  }

  await browser.close();
})();
