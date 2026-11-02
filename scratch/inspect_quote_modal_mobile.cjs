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
  
  // Inspect the quote items container
  const modalInfo = await page.evaluate(() => {
    const modalBox = document.querySelector('#quote-editor-modal .crm-modal-box');
    const modalContent = document.querySelector('#quote-editor-modal .crm-modal-content');
    const itemsContainer = document.getElementById('qe-items-container');
    const clientGrid = document.querySelector('#quote-editor-modal .quote-client-info-grid, #quote-editor-modal [style*="grid-template-columns"]');
    
    return {
      modalBoxWidth: modalBox?.offsetWidth,
      modalContentScrollWidth: modalContent?.scrollWidth,
      modalContentClientWidth: modalContent?.clientWidth,
      itemsContainerHTML: itemsContainer?.innerHTML.slice(0, 300),
      clientGridHTML: clientGrid?.outerHTML.slice(0, 200)
    };
  });
  
  console.log('Modal info on 375px:', modalInfo);
  await browser.close();
})();
