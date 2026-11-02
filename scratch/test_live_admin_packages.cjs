const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGEERROR] ${err.toString()}`));

  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });

  // Navigate to Catering
  await page.evaluate(() => {
    if (typeof window.showView === 'function') {
      window.showView('catering');
    } else {
      const navItem = Array.from(document.querySelectorAll('.crm-nav-item')).find(el => el.textContent.includes('Catering'));
      if (navItem) navItem.click();
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Now click PACKAGE REQUESTS tab
  await page.evaluate(() => {
    const btn = document.getElementById('btn-cat-packages');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  // Check state of cat-tab-packages and take screenshot
  const info = await page.evaluate(() => {
    const pane = document.getElementById('cat-tab-packages');
    const btn = document.getElementById('btn-cat-packages');
    return {
      paneExists: !!pane,
      paneDisplay: pane ? pane.style.display : null,
      paneComputedDisplay: pane ? window.getComputedStyle(pane).display : null,
      paneOffsetHeight: pane ? pane.offsetHeight : null,
      paneChildrenCount: pane ? pane.children.length : null,
      paneHtmlLength: pane ? pane.innerHTML.length : null,
      btnClass: btn ? btn.className : null,
      cateringViewDisplay: document.getElementById('catering-view') ? window.getComputedStyle(document.getElementById('catering-view')).display : null
    };
  });

  console.log('Pane info:', info);
  console.log('Console logs:', consoleLogs.slice(-20));

  await page.screenshot({ path: 'scratch/check_admin_packages_now.png' });
  console.log('Screenshot saved to scratch/check_admin_packages_now.png');

  await browser.close();
})();
