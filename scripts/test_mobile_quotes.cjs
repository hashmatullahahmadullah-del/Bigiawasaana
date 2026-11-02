const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  const info = await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';

    document.querySelectorAll('.crm-view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const cat = document.getElementById('catering-view');
    cat.style.display = 'block';
    cat.classList.add('active');

    Object.assign(window.state, {
      quotes: [
        {
          id: 'q-test-1',
          quoteNumber: 'BA-Q-2610-D2BA',
          createdAt: { seconds: Date.now() / 1000 },
          customer: { name: 'Areema Hannah', phone: '3235856621', email: 'areema@example.com' },
          event: { date: '2026-11-06', time: '17:00', guestCount: 20 },
          pricing: { total: 509.90, depositPercentage: 30, depositAmount: 152.97 },
          status: 'draft'
        }
      ]
    });

    window.switchCateringTab('quotes');

    const card = document.querySelector('#catering-quotes-table-body tr');
    const buttons = document.querySelectorAll('#catering-quotes-table-body .crm-actions-grid button');
    
    return {
      cardWidth: card ? card.offsetWidth : null,
      cardHeight: card ? card.offsetHeight : null,
      buttons: Array.from(buttons).map(b => ({
        text: b.textContent.trim(),
        width: b.offsetWidth,
        height: b.offsetHeight,
        display: window.getComputedStyle(b).display
      }))
    };
  });

  console.log('Mobile Quote Card & Buttons Metrics:');
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: 'scratch/mobile_quotes_card_active.png' });
  await browser.close();
})();
