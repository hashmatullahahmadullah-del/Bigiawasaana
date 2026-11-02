const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    window.switchAdminView('catering-view');
    window.switchCateringTab('packages');
  });
  
  const hierarchy = await page.evaluate(() => {
    const el = document.getElementById('cat-tab-packages');
    if (!el) return 'not found';
    
    const res = [];
    let curr = el;
    while (curr) {
      res.push({
        tag: curr.tagName,
        id: curr.id,
        className: curr.className,
        display: window.getComputedStyle(curr).display,
        visibility: window.getComputedStyle(curr).visibility,
        height: window.getComputedStyle(curr).height,
        offsetHeight: curr.offsetHeight,
        parentElement: curr.parentElement ? curr.parentElement.tagName : null
      });
      curr = curr.parentElement;
    }
    return res;
  });
  
  console.log('Hierarchy:', JSON.stringify(hierarchy, null, 2));
  await browser.close();
})();
