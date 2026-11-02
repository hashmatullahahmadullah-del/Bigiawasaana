const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  // 1. Test Admin Panel Catering Tabs
  console.log('Testing Admin Catering Tabs...');
  await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle2' });

  // Navigate to Catering section
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-target="catering-view"]');
    if (btn) btn.click();
    else if (window.switchAdminView) window.switchAdminView('catering-view');
  });
  await new Promise(r => setTimeout(r, 600));

  // Click "PACKAGE REQUESTS" tab
  await page.evaluate(() => window.switchCateringTab('packages'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/verified_admin_packages.png' });
  console.log('Saved scratch/verified_admin_packages.png');

  // Click "QUOTES & PROPOSALS" tab
  await page.evaluate(() => window.switchCateringTab('quotes'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/verified_admin_quotes.png' });
  console.log('Saved scratch/verified_admin_quotes.png');

  // Open Create Quote modal
  await page.evaluate(() => window.openCreateQuoteModal());
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/verified_admin_quote_modal.png' });
  console.log('Saved scratch/verified_admin_quote_modal.png');

  // Close modal
  await page.evaluate(() => window.closeQuoteEditorModal());
  await new Promise(r => setTimeout(r, 300));

  // Click "CATALOG & TEMPLATES" tab
  await page.evaluate(() => window.switchCateringTab('catalog'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/verified_admin_catalog.png' });
  console.log('Saved scratch/verified_admin_catalog.png');

  // 2. Test Scrolled Navbar on Homepage
  console.log('Testing Scrolled Nav on Homepage...');
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });

  // Scroll down so that zabiha section passes under nav
  await page.evaluate(() => {
    const el = document.getElementById('zabiha-trust');
    if (el) {
      const rect = el.getBoundingClientRect();
      const st = window.pageYOffset || document.documentElement.scrollTop;
      window.scrollTo(0, st + rect.top + 80);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/verified_nav_scrolled.png' });
  console.log('Saved scratch/verified_nav_scrolled.png');

  await browser.close();
  console.log('All local tests complete!');
})();
