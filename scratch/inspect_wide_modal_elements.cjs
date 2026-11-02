const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('https://www.bigiawasaana.com/admin', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    window.switchAdminView('catering-view');
    window.openCreateQuoteModal();
  });
  
  await new Promise(r => setTimeout(r, 400));
  
  const wideElements = await page.evaluate(() => {
    const modalContent = document.querySelector('#quote-editor-modal .crm-modal-content');
    const containerWidth = modalContent.clientWidth;
    const res = [];
    
    modalContent.querySelectorAll('*').forEach(el => {
      if (el.offsetWidth > containerWidth) {
        res.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          style: el.getAttribute('style'),
          offsetWidth: el.offsetWidth,
          containerWidth
        });
      }
    });
    return res;
  });
  
  console.log('Wide elements inside modal:', JSON.stringify(wideElements, null, 2));
  await browser.close();
})();
