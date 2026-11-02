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
  
  // Click "+ CREATE QUOTE" button
  const res = await page.evaluate(() => {
    const btn = document.getElementById('btn-open-quote-editor');
    if (!btn) return { error: 'btn not found' };
    btn.click();
    
    const modal = document.getElementById('quote-editor-modal');
    return {
      modalClasses: modal ? modal.className : null,
      modalDisplay: modal ? window.getComputedStyle(modal).display : null,
      modalOpacity: modal ? window.getComputedStyle(modal).opacity : null,
      modalPointerEvents: modal ? window.getComputedStyle(modal).pointerEvents : null,
      modalVisibility: modal ? window.getComputedStyle(modal).visibility : null,
      modalZIndex: modal ? window.getComputedStyle(modal).zIndex : null
    };
  });
  
  console.log('Result after clicking + CREATE QUOTE:', res);
  await page.screenshot({ path: 'scratch/create_quote_modal_test.png' });
  await browser.close();
})();
