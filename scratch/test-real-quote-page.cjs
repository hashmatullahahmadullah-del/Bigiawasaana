const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message }));

  const url = 'http://localhost:4173/quote.html?q=BA-Q-2610-03EC&token=ZalIiEh2MwKwxUwH3Owik8N9axAUa23B2f7gBD1hXDK95edM';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait a few seconds for Firebase functions call to return
  await new Promise(r => setTimeout(r, 3000));

  const pageState = await page.evaluate(() => {
    return {
      loadingDisplay: document.getElementById('portal-loading')?.style.display,
      authCardDisplay: document.getElementById('portal-auth-card')?.style.display,
      contentDisplay: document.getElementById('portal-content')?.style.display,
      acceptanceCardDisplay: document.getElementById('portal-acceptance-card')?.style.display,
      paymentCardDisplay: document.getElementById('portal-payment-card')?.style.display,
      confirmedCardDisplay: document.getElementById('portal-confirmed-card')?.style.display,
      authErrorText: document.getElementById('auth-error-banner')?.innerText,
      paymentErrorText: document.getElementById('payment-error-msg')?.innerText,
      quoteNumText: document.getElementById('portal-quote-number')?.innerText,
      depositAmountText: document.getElementById('portal-deposit-amount')?.innerText,
      cardContainerIframe: !!document.querySelector('#card-container iframe'),
      cardContainerHtml: document.getElementById('card-container')?.innerHTML
    };
  });

  console.log('Page State:', JSON.stringify(pageState, null, 2));
  console.log('Console Logs:', consoleLogs);

  await page.screenshot({ path: 'scratch/real-quote-view.png' });
  await browser.close();
})();
