const puppeteer = require('puppeteer');

async function testOverviewFlatUi() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  // Simulate authenticated admin on dashboard-view
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.querySelectorAll('.crm-view').forEach(v => {
      v.classList.remove('active');
      v.style.display = 'none';
    });
    const dashView = document.getElementById('dashboard-view');
    if (dashView) {
      dashView.classList.add('active');
      dashView.style.display = 'block';
    }
    document.body.classList.remove('light-mode');

    // Mock realistic business data across sections to verify hydration
    window.state = window.state || {};
    window.state.orders = [
      { id: 'ord-1', total: 64.50, status: 'completed', date: new Date(), customerName: 'Farhad Nazari', items: [{ name: 'Chapli Kabob Platter', qty: 2 }] },
      { id: 'ord-2', total: 32.00, status: 'pending', date: new Date(), customerName: 'Zainab Wardak', items: [{ name: 'Qabuli Pulao Tray', qty: 1 }] },
      { id: 'ord-3', total: 48.00, status: 'completed', date: new Date(), customerName: 'Mustafa Popal', items: [{ name: 'Charcoal Chicken Tikka', qty: 3 }] }
    ];
    window.state.catering = [
      { id: 'cat-1', status: 'new', client: { name: 'Soraya Etemadi' } },
      { id: 'cat-2', status: 'contacted', client: { name: 'Kabul Banquet Hall' } }
    ];
    window.state.quotes = [
      { id: 'q-1', status: 'sent', quoteNumber: 'BA-Q-2610-01', pricing: { total: 1450.00 } },
      { id: 'q-2', status: 'viewed', quoteNumber: 'BA-Q-2610-02', pricing: { total: 2100.00 } }
    ];
    window.state.agreements = [
      { id: 'w-1', status: 'sent', agreementNumber: 'BA-W-2610-01', pricing: { estimatedTotal: 1850.00 }, client: { name: 'Mina Ahmad' }, createdAtDate: new Date() }
    ];
    window.state.retailOrders = [
      { id: 'ret-1', status: 'paid', total: 75.00 }
    ];
    window.state.reviews = [
      { id: 'rev-1', rating: 5, name: 'Ahmad Khan', comment: 'Best authentic Afghan food in Reseda!', date: new Date() }
    ];
    window.state.customers = [
      { phone: '8185550101', name: 'Farhad Nazari', totalSpent: 1250.00, totalOrders: 14 },
      { phone: '3105550199', name: 'Zainab Wardak', totalSpent: 890.00, totalOrders: 9 }
    ];

    if (window.renderDashboard) {
      window.renderDashboard();
    }
  });

  await new Promise(r => setTimeout(r, 600));

  const status = await page.evaluate(() => ({
    trailerText: document.getElementById('dash-trailer-status-text')?.textContent,
    todayRev: document.getElementById('today-revenue')?.textContent,
    todayOrders: document.getElementById('today-orders')?.textContent,
    todayPending: document.getElementById('today-pending')?.textContent,
    catInquiries: document.getElementById('dash-cat-inquiries')?.textContent,
    catQuotes: document.getElementById('dash-cat-quotes')?.textContent,
    catWaivers: document.getElementById('dash-cat-waivers')?.textContent,
    catPipeline: document.getElementById('dash-cat-pipeline')?.textContent,
    avgRating: document.getElementById('dash-avg-rating')?.textContent,
    feedItems: document.querySelectorAll('.crm-feed-item').length,
    spendersItems: document.querySelectorAll('.crm-list-item').length
  }));

  console.log('Hydrated Overview State:', status);

  await page.screenshot({ path: 'scratch/overview_hydrated_flat_1280_dark.png', fullPage: true });

  // Light Mode
  await page.evaluate(() => {
    document.body.classList.add('light-mode');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'scratch/overview_hydrated_flat_1280_light.png', fullPage: true });

  // Mobile View
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.evaluate(() => {
    document.body.classList.remove('light-mode');
  });
  await new Promise(r => setTimeout(r, 400));
  const mobileMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  console.log(`Mobile 375px: scrollWidth ${mobileMetrics.scrollWidth} / innerWidth ${mobileMetrics.innerWidth}`);
  await page.screenshot({ path: 'scratch/overview_hydrated_flat_375_mobile.png', fullPage: true });

  await browser.close();
}

testOverviewFlatUi().catch(console.error);
