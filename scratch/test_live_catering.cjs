const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const pageErrors = [];
  const consoleLogs = [];
  page.on('pageerror', err => pageErrors.push(err.message + '\n' + err.stack));
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });
  
  // Navigate to catering view
  await page.evaluate(() => {
    window.switchAdminView('catering-view');
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click on "Package Requests" button
  await page.evaluate(() => {
    const btn = document.getElementById('btn-cat-packages');
    if (btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Check tab visibility
  const visibility = await page.evaluate(() => {
    const tabPackages = document.getElementById('cat-tab-packages');
    const tabInquiries = document.getElementById('cat-tab-inquiries');
    const btnPackages = document.getElementById('btn-cat-packages');
    
    return {
      tabPackagesDisplay: tabPackages ? window.getComputedStyle(tabPackages).display : null,
      tabInquiriesDisplay: tabInquiries ? window.getComputedStyle(tabInquiries).display : null,
      btnPackagesClasses: btnPackages ? btnPackages.className : null,
      tabPackagesOffsetHeight: tabPackages ? tabPackages.offsetHeight : 0,
      cateringTableBody: document.getElementById('catering-packages-table-body')?.innerHTML,
      rect: tabPackages ? tabPackages.getBoundingClientRect() : null
    };
  });
  
  console.log('Visibility:', visibility);
  console.log('Page Errors:', pageErrors);
  console.log('Console Logs:', consoleLogs);
  
  await page.screenshot({ path: 'scratch/check_admin_packages_now.png' });
  await browser.close();
})();
