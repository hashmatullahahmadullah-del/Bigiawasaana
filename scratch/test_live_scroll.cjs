const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://www.bigiawasaana.com/', { waitUntil: 'networkidle2' });
  
  const initialClass = await page.evaluate(() => document.querySelector('.site-nav')?.className);
  
  // Scroll down 500px
  await page.evaluate(() => window.scrollTo(0, 500));
  await new Promise(r => setTimeout(r, 200));
  
  const scrolledClass = await page.evaluate(() => document.querySelector('.site-nav')?.className);
  const navStyle = await page.evaluate(() => {
    const el = document.querySelector('.site-nav');
    const comp = window.getComputedStyle(el);
    return {
      top: comp.top,
      width: comp.width,
      borderRadius: comp.borderRadius,
      backgroundColor: comp.backgroundColor,
      position: comp.position
    };
  });
  
  console.log('Initial class:', initialClass);
  console.log('Scrolled class:', scrolledClass);
  console.log('Computed nav style at scrollY=500:', navStyle);
  
  await page.screenshot({ path: 'scratch/live_scroll_test.png' });
  await browser.close();
})();
