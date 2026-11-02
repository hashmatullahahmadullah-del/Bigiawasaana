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
  
  // Click "+ CREATE QUOTE" button and wait 400ms
  await page.evaluate(() => {
    document.getElementById('btn-open-quote-editor').click();
  });
  await new Promise(r => setTimeout(r, 400));
  
  const res = await page.evaluate(() => {
    const modal = document.getElementById('quote-editor-modal');
    return {
      modalClasses: modal ? modal.className : null,
      modalDisplay: modal ? window.getComputedStyle(modal).display : null,
      modalOpacity: modal ? window.getComputedStyle(modal).opacity : null,
      modalVisibility: modal ? window.getComputedStyle(modal).visibility : null,
      boxRect: modal?.querySelector('.crm-modal-box')?.getBoundingClientRect()
    };
  });
  
  console.log('Result after 400ms:', res);
  await page.screenshot({ path: 'scratch/create_quote_modal_rendered_now.png' });
  await browser.close();
})();
