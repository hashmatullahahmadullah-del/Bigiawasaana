const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message }));

  const url = 'http://localhost:4173/quote.html?q=BA-Q-2610-03EC&token=ZalIiEh2MwKwxUwH3Owik8N9axAUa23B2f7gBD1hXDK95edM';
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for quote data to render
  await page.waitForFunction(() => document.getElementById('portal-content')?.style.display === 'block', { timeout: 10000 });

  // Trigger acceptance or switch to accepted
  const stateAfterAccept = await page.evaluate(async () => {
    // Fill in signature
    const nameInput = document.getElementById('signer-name-input');
    const termsCheck = document.getElementById('accept-terms-checkbox');
    if (nameInput) nameInput.value = 'Areema Hannah';
    if (termsCheck) termsCheck.checked = true;

    // Trigger proposal accept or switch directly
    const form = document.getElementById('portal-acceptance-form');
    // If we call handleProposalAccept or simulate acceptance:
    const paymentCard = document.getElementById('portal-payment-card');
    const acceptanceCard = document.getElementById('portal-acceptance-card');
    acceptanceCard.style.display = 'none';
    paymentCard.style.display = 'block';

    // Wait for Square Payments
    if (typeof window.selectPaymentOption === 'function') {
      window.selectPaymentOption('deposit');
    }

    return {
      paymentCardVisible: paymentCard.style.display === 'block',
      btnPayText: document.getElementById('btn-pay-text')?.innerText,
      payDepositVal: document.getElementById('pay-deposit-val')?.innerText,
      payFullVal: document.getElementById('pay-full-val')?.innerText
    };
  });

  console.log('State after acceptance reveal:', stateAfterAccept);

  // Now test Square Card attach into #card-container
  const squareState = await page.evaluate(async () => {
    const Square = window.Square;
    if (!Square) return { error: 'Square not loaded' };

    const payments = Square.payments('sq0idp-ZNKswm32xh_nRRecm5ggFg', 'LVVN2XC88162M');
    let cardAttached = false;
    let cardError = null;
    try {
      const card = await payments.card();
      await card.attach('#card-container');
      cardAttached = true;
    } catch (e) {
      cardError = e.message;
    }

    // Also test googlePay / applePay paymentRequest
    const req = payments.paymentRequest({
      countryCode: 'US',
      currencyCode: 'USD',
      total: { amount: '152.97', label: 'Bigi Awasaana Catering Deposit' }
    });

    let gpayAvailable = false;
    try {
      const gpay = await payments.googlePay(req);
      await gpay.attach('#google-pay-button');
      gpayAvailable = true;
    } catch (e) {
      // In headless Linux/Windows Chrome without Google account, Google Pay may warn but SDK attaches or initializes
    }

    const cardContainer = document.getElementById('card-container');
    const iframe = cardContainer ? cardContainer.querySelector('iframe') : null;

    return {
      cardAttached,
      cardError,
      hasIframe: !!iframe,
      iframeSrc: iframe ? iframe.src : null,
      gpayAvailable
    };
  });

  console.log('Square Elements State:', squareState);
  console.log('Console logs:', consoleLogs);

  await page.screenshot({ path: 'scratch/verified-quote-payment-portal.png' });
  console.log('Screenshot saved to scratch/verified-quote-payment-portal.png');

  await browser.close();
})();
