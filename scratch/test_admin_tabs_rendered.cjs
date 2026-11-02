const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to http://localhost:4173/admin...');
  await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle2' });

  // Unhide dashboard and activate catering-view
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    
    // Switch to catering view
    const catBtn = document.querySelector('button[data-target="catering-view"]');
    if (catBtn) catBtn.click();
    else if (window.switchAdminView) window.switchAdminView('catering-view');

    // Switch to package requests tab
    window.switchCateringTab('packages');
  });

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/admin_packages_rendered.png' });
  console.log('Saved scratch/admin_packages_rendered.png');

  // Switch to catalog tab
  await page.evaluate(() => window.switchCateringTab('catalog'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/admin_catalog_rendered.png' });
  console.log('Saved scratch/admin_catalog_rendered.png');

  // Switch to quotes tab
  await page.evaluate(() => window.switchCateringTab('quotes'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/admin_quotes_rendered.png' });
  console.log('Saved scratch/admin_quotes_rendered.png');

  // Open Create Quote modal
  await page.evaluate(() => window.openCreateQuoteModal());
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/admin_create_quote_modal_rendered.png' });
  console.log('Saved scratch/admin_create_quote_modal_rendered.png');

  await browser.close();
})();
