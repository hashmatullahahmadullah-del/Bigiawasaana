const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4173/quote.html', { waitUntil: 'networkidle2' });

  const result = await page.evaluate(async () => {
    // Keep #portal-payment-card at display: none
    const cardEl = document.getElementById('card-container');
    const paymentCard = document.getElementById('portal-payment-card');
    paymentCard.style.display = 'none';

    try {
      const payments = window.Square.payments('sq0idp-ZNKswm32xh_nRRecm5ggFg', 'LVVN2XC88162M');
      const card = await payments.card();
      await card.attach('#card-container');
      
      // Now show it
      paymentCard.style.display = 'block';

      const iframe = cardEl.querySelector('iframe');
      return {
        ok: true,
        iframeRect: iframe ? iframe.getBoundingClientRect() : null,
        containerRect: cardEl.getBoundingClientRect()
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  console.log('Result when attached while display:none:', result);
  await browser.close();
})();
