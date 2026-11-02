const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:4173/waiver.html', { waitUntil: 'networkidle2' });

  // Simulate loaded agreement data by injecting test data into DOM
  await page.evaluate(() => {
    const mockAgreement = {
      agreementNumber: 'BA-W-2610-8A1C',
      status: 'sent',
      event: {
        date: '2026-11-08',
        time: '05:00 PM',
        guestCount: 30,
        fulfillment: 'pickup',
        menuSummary: '• 2x Braised Lamb Shank Qabuli Banquet Trays ($390.00)\n• 2x Bigi\'s Famous Chapli Kabob Platters ($290.00)\n• 1x Crispy Potato & Scallion Bolani Platter ($65.00)\n• 1x Mast-o-Khiar Mint Cucumber Yogurt'
      },
      pricing: {
        estimatedTotal: 745.00,
        depositRequired: 223.50,
        balanceDue: 521.50,
        penaltyFee: 199.00
      },
      client: {
        name: 'Farhad Karimi',
        phone: '(818) 555-0144',
        email: 'farhad@example.com',
        confirmedAddress: 'Trailer Pickup (18411 Victory Blvd, Reseda, CA)'
      }
    };

    document.getElementById('waiver-loading').style.display = 'none';
    document.getElementById('waiver-lookup').style.display = 'none';
    document.getElementById('waiver-content').style.display = 'block';

    document.getElementById('view-agreement-num').textContent = mockAgreement.agreementNumber;
    document.getElementById('view-estimated-total').textContent = '$745.00';
    document.getElementById('view-deposit-required').textContent = '$223.50';
    document.getElementById('view-balance-due').textContent = '$521.50';
    document.getElementById('btn-card-amt').textContent = '$223.50';
    document.getElementById('cash-amt-display').textContent = '$223.50';

    document.getElementById('view-event-datetime').textContent = 'Sun, Nov 8, 2026 at 05:00 PM';
    document.getElementById('view-fulfillment').textContent = 'Trailer Pickup';
    document.getElementById('view-guest-count').textContent = '30 Guests';
    document.getElementById('view-menu-summary').textContent = mockAgreement.event.menuSummary;

    document.getElementById('cust-full-name').value = mockAgreement.client.name;
    document.getElementById('cust-phone').value = mockAgreement.client.phone;
    document.getElementById('cust-email').value = mockAgreement.client.email;
    document.getElementById('cust-address').value = mockAgreement.client.confirmedAddress;
    document.getElementById('sig-typed-name').value = mockAgreement.client.name;
  });

  await page.screenshot({ path: 'scratch/verified_waiver_mobile_top.png', fullPage: false });
  console.log('Saved scratch/verified_waiver_mobile_top.png');

  // Scroll down to signature pad and draw signature
  await page.evaluate(() => {
    const el = document.getElementById('sig-pad-box');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });

  const canvasHandle = await page.$('#sig-canvas');
  if (canvasHandle) {
    const box = await canvasHandle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 30, box.y + 40);
      await page.mouse.down();
      await page.mouse.move(box.x + 70, box.y + 60);
      await page.mouse.move(box.x + 110, box.y + 35);
      await page.mouse.move(box.x + 150, box.y + 70);
      await page.mouse.move(box.x + 200, box.y + 45);
      await page.mouse.up();
    }
  }

  await page.screenshot({ path: 'scratch/verified_waiver_mobile_signature.png', fullPage: false });
  console.log('Saved scratch/verified_waiver_mobile_signature.png');

  // Click Cash Tab via evaluate
  await page.evaluate(() => {
    document.getElementById('tab-btn-cash')?.click();
    document.getElementById('path-cash-container')?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });

  await page.screenshot({ path: 'scratch/verified_waiver_mobile_cash_tab.png', fullPage: false });
  console.log('Saved scratch/verified_waiver_mobile_cash_tab.png');

  // Full page screenshot of mobile waiver
  await page.screenshot({ path: 'scratch/verified_waiver_mobile_full.png', fullPage: true });
  console.log('Saved scratch/verified_waiver_mobile_full.png');

  // Also simulate confirmed receipt view
  await page.evaluate(() => {
    document.getElementById('waiver-content').style.display = 'none';
    document.getElementById('waiver-confirmed-receipt').style.display = 'block';
    document.getElementById('receipt-num').textContent = 'BA-W-2610-8A1C';
    document.getElementById('receipt-signer').textContent = 'Farhad Karimi';
    document.getElementById('receipt-timestamp').textContent = 'Saturday, October 31, 2026 at 1:15 AM PDT';
    document.getElementById('receipt-payment-status').textContent = '30% Deposit Paid ($223.50) via Square';
  });

  await page.screenshot({ path: 'scratch/verified_waiver_mobile_receipt.png', fullPage: true });
  console.log('Saved scratch/verified_waiver_mobile_receipt.png');

  await browser.close();
})();
