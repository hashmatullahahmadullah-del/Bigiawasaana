const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    window.switchAdminView('catering-view');
    window.switchCateringTab('packages');
  });
  
  const details = await page.evaluate(() => {
    const pane = document.getElementById('cat-tab-packages');
    return {
      paneDisplay: window.getComputedStyle(pane).display,
      rect: pane.getBoundingClientRect(),
      totalCountText: document.getElementById('pkg-total-count')?.innerText,
      tbodyText: document.getElementById('catering-packages-table-body')?.innerText,
      tableVisible: window.getComputedStyle(document.getElementById('catering-packages-table')).display
    };
  });
  
  console.log('Details:', details);
  await browser.close();
})();
