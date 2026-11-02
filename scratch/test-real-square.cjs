const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'error', text: err.message }));

  await page.goto('http://localhost:4173/quote.html', { waitUntil: 'networkidle2' });

  const result = await page.evaluate(async () => {
    // Show payment card
    document.getElementById('portal-loading').style.display = 'none';
    document.getElementById('portal-content').style.display = 'block';
    document.getElementById('portal-payment-card').style.display = 'block';

    const cardContainer = document.getElementById('card-container');
    try {
      const payments = window.Square.payments(
        'sq0idp-ZNKswm32xh_nRRecm5ggFg',
        'LVVN2XC88162M'
      );
      const card = await payments.card();
      await card.attach('#card-container');
      return {
        ok: true,
        containerHtmlLength: cardContainer.innerHTML.length,
        hasIframe: !!cardContainer.querySelector('iframe')
      };
    } catch (e) {
      return { ok: false, error: e.message, stack: e.stack };
    }
  });

  console.log('Result with real Square IDs:', result);
  console.log('Browser logs:', logs);

  await page.screenshot({ path: 'scratch/real-square-attach.png' });
  await browser.close();
})();
