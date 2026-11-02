const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('https://www.bigiawasaana.com/menu', { waitUntil: 'networkidle2' });

  // Add item
  const addBtn = await page.$('.menu-card .btn-primary, .menu-card button');
  if (addBtn) {
    await addBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const modalAddBtn = await page.$('#item-modal-add-btn');
    if (modalAddBtn) await modalAddBtn.click();
    await new Promise(r => setTimeout(r, 600));
  }

  // Fill customer info
  await page.evaluate(() => {
    document.getElementById('customer-name').value = 'Ahmad Karimi';
    document.getElementById('customer-phone').value = '(818) 555-0199';
    const schedRadio = document.querySelector('input[value="scheduled"]');
    if (schedRadio) {
      schedRadio.checked = true;
      schedRadio.dispatchEvent(new Event('change'));
    }
  });

  // Call openPaymentModal()
  console.log('Calling openPaymentModal()...');
  const res = await page.evaluate(async () => {
    try {
      await window.openPaymentModal();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message, stack: e.stack };
    }
  });
  console.log('openPaymentModal result:', res);

  // Wait 3 seconds to let Square initialize
  await new Promise(r => setTimeout(r, 3000));

  // Inspect #card-container innerHTML and computed style
  const cardContainerInfo = await page.evaluate(() => {
    const el = document.getElementById('card-container');
    const errors = document.getElementById('card-errors');
    return {
      hasEl: !!el,
      innerHTML: el?.innerHTML,
      display: el ? window.getComputedStyle(el).display : null,
      height: el ? window.getComputedStyle(el).height : null,
      errorsText: errors?.textContent,
      hasSquareSDK: !!window.Square
    };
  });
  console.log('Card container info:', cardContainerInfo);

  await browser.close();
})();
