const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      errors.push(`[PAGE ERROR] ${err.toString()}`);
    });

    console.log('Navigating to https://www.bigiawasaana.com/admin ...');
    await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2', timeout: 30000 });

    await new Promise(r => setTimeout(r, 4000));

    const globalError = await page.evaluate(() => {
      const el = document.getElementById('global-error');
      const textEl = document.getElementById('global-error-text');
      return {
        display: el ? window.getComputedStyle(el).display : 'not_found',
        text: textEl ? textEl.textContent.trim() : ''
      };
    });

    console.log('Global Error State:', JSON.stringify(globalError, null, 2));
    if (errors.length > 0) {
      console.log('Errors caught on page:');
      errors.forEach(e => console.log('  ' + e));
    } else {
      console.log('No unhandled console or page errors detected.');
    }
  } catch (err) {
    console.error('Puppeteer verification failed:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
