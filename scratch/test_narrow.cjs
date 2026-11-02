const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  for (const w of [260, 320, 375]) {
    await page.setViewport({ width: w, height: 700 });
    await page.goto('http://localhost:4173/admin.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      const navBtn = document.querySelector('[data-target="catering-view"]');
      if (navBtn) navBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: `scratch/narrow_${w}_catering_light.png` });
  }
  await browser.close();
  console.log('Screenshots taken successfully');
})();
