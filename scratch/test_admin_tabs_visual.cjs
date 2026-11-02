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
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  // Now take screenshot of initial catering view (Inquiries tab)
  await page.screenshot({ path: 'scratch/live_catering_inquiries.png' });
  
  // Now click btn-cat-packages
  await page.evaluate(() => {
    window.switchCateringTab('packages');
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  // Now take screenshot of Packages tab
  await page.screenshot({ path: 'scratch/live_catering_packages.png' });
  
  // Now click btn-cat-quotes
  await page.evaluate(() => {
    window.switchCateringTab('quotes');
  });
  
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/live_catering_quotes.png' });
  
  // Now click btn-cat-catalog
  await page.evaluate(() => {
    window.switchCateringTab('catalog');
  });
  
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/live_catering_catalog.png' });

  console.log('All screenshots captured!');
  await browser.close();
})();
