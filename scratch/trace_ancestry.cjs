const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-target="catering-view"]');
    if (btn) btn.click();
    const pkgBtn = document.getElementById('btn-cat-packages');
    if (pkgBtn) pkgBtn.click();
  });
  const chain = await page.evaluate(() => {
    let el = document.getElementById('cat-tab-packages');
    const ancestry = [];
    while (el) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      ancestry.push({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        display: style.display,
        width: rect.width,
        height: rect.height,
        position: style.position,
        overflow: style.overflow
      });
      el = el.parentElement;
    }
    return ancestry;
  });
  console.log('Ancestry:', JSON.stringify(chain, null, 2));
  await browser.close();
})();
