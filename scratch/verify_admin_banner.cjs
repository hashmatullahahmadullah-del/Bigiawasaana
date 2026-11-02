const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });
  
  // Check if global-error element is displayed
  const errorVisible = await page.evaluate(() => {
    const el = document.getElementById('global-error');
    return el && el.style.display !== 'none' && window.getComputedStyle(el).display !== 'none';
  });
  
  const errorText = await page.evaluate(() => {
    const el = document.getElementById('global-error-text');
    return el ? el.textContent : '';
  });
  
  console.log('Global error banner visible:', errorVisible);
  if (errorVisible) {
    console.log('Error text:', errorText);
  }
  
  console.log('\nConsole warnings/errors during load:');
  consoleMessages.filter(m => m.includes('error') || m.includes('warn')).forEach(m => console.log(m));
  
  await browser.close();
})();
