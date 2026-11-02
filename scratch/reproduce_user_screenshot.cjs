const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/admin') url = '/admin.html';
  if (url === '/catering') url = '/catering.html';
  let p = path.join(__dirname, '..', 'dist', url);
  if (!fs.existsSync(p)) {
    res.writeHead(404);
    res.end('Not found: ' + url);
    return;
  }
  let ct = 'text/plain';
  if (p.endsWith('.html')) ct = 'text/html';
  else if (p.endsWith('.js')) ct = 'application/javascript';
  else if (p.endsWith('.css')) ct = 'text/css';
  else if (p.endsWith('.webp')) ct = 'image/webp';
  else if (p.endsWith('.png')) ct = 'image/png';
  else if (p.endsWith('.jpg') || p.endsWith('.jpeg')) ct = 'image/jpeg';
  else if (p.endsWith('.svg')) ct = 'image/svg+xml';
  res.writeHead(200, { 'Content-Type': ct });
  fs.createReadStream(p).pipe(res);
});

server.listen(5199, async () => {
  console.log('Static server listening on http://localhost:5199');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    }
  });
  page.on('pageerror', err => console.log('[PAGEERROR]', err.toString()));

  await page.goto('http://localhost:5199/admin', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => typeof window.switchCateringTab === 'function', { timeout: 10000 });

  // Inject test data and switch to catering view
  const result = await page.evaluate(() => {
    // Reveal dashboard
    const loginSec = document.getElementById('login-section');
    if (loginSec) loginSec.style.display = 'none';
    const dashSec = document.getElementById('dashboard-section');
    if (dashSec) {
      dashSec.style.display = 'block';
      dashSec.style.height = 'auto';
    }

    // Switch to catering view
    if (typeof window.switchAdminView === 'function') {
      window.switchAdminView('catering-view');
    }

    // Populate mock quotes matching user screenshot
    window.state = window.state || {};
    window.state.quotes = [
      {
        id: 'q1',
        quoteNumber: 'BA-Q-2610-D2BA',
        createdAtDate: new Date('2026-10-30'),
        customer: { name: 'Areema Hannah', phone: '3235856621', email: 'areema@example.com' },
        event: { date: '2026-11-06', guests: 20, serviceType: 'pickup' },
        pricing: { total: 509.90, depositAmount: 152.97, depositPercentage: 30 },
        status: 'draft'
      },
      {
        id: 'q2',
        quoteNumber: 'BA-Q-2610-03EC',
        createdAtDate: new Date('2026-10-30'),
        customer: { name: 'Areema Hannah', phone: '3235856621', email: 'areema@example.com' },
        event: { date: '2026-11-06', guests: 20, serviceType: 'pickup' },
        pricing: { total: 509.90, depositAmount: 152.97, depositPercentage: 30 },
        status: 'viewed'
      }
    ];

    // Populate mock package request matching user screenshot
    window.state.packageRequests = [
      {
        id: 'pkg1',
        requestNumber: 'BA-PKG-2610-04A3',
        customerContact: { name: 'Areema Hannah', phone: '3235856621', email: 'ahmadhaidari2700@gmail.com', preferredContact: 'phone' },
        eventDetails: { date: '2026-11-06', time: '17:00', guests: 20, type: 'Family Gathering', fulfillment: 'delivery', deliveryAddress: '18411 Victory Blvd, Reseda, CA 91335', specialInstructions: 'Extra spicy chutney please' },
        selectedItems: [
          { name: "Bigi's Qabuli Pulao Rice Tray", portionSize: 'Large Party Tray (Serves 20-25)', quantity: 2, unitPrice: 110, totalPrice: 220, imageUrl: '/images/menu/qabuli.webp' },
          { name: "Charcoal Chicken Tikka Kabob Platter", portionSize: 'Large Skewer Platter (30 skewers)', quantity: 2, unitPrice: 135, totalPrice: 270, imageUrl: '/images/menu/chicken-tikka.webp' },
          { name: "Tender Beef Tikka Kabob Platter", portionSize: 'Large Skewer Platter (30 skewers)', quantity: 2, unitPrice: 165, totalPrice: 330, imageUrl: '/images/menu/beef-tikka.webp' }
        ],
        selectedServices: [
          { name: 'Wire Chafing Racks & Sterno Fuel', price: 35 }
        ],
        estimatedPriceBreakdown: {
          foodSubtotal: 820.00,
          servicesTotal: 35.00,
          deliveryFee: 15.00,
          taxAmount: 78.54,
          estimatedTotal: 948.54
        },
        status: 'new'
      }
    ];

    return { quotesCount: window.state.quotes.length, pkgCount: window.state.packageRequests.length };
  });

  console.log('Injected state:', result);

  // Switch to Quotes tab
  await page.evaluate(() => {
    window.switchCateringTab('quotes');
  });
  await new Promise(r => setTimeout(r, 600));

  // Check columns and table layout
  const quotesTableAudit = await page.evaluate(() => {
    const table = document.querySelector('#cat-tab-quotes table');
    if (!table) return { error: 'No table found in cat-tab-quotes' };
    const ths = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const firstRowTds = Array.from(table.querySelectorAll('tbody tr:first-child td')).map(td => ({
      dataLabel: td.getAttribute('data-label'),
      text: td.textContent.replace(/\s+/g, ' ').trim(),
      width: Math.round(td.getBoundingClientRect().width)
    }));
    const tableWidth = Math.round(table.getBoundingClientRect().width);
    const containerWidth = Math.round(table.parentElement.getBoundingClientRect().width);
    const hasTableOverflow = table.scrollWidth > containerWidth;

    return {
      thCount: ths.length,
      headers: ths,
      tdCount: firstRowTds.length,
      tds: firstRowTds,
      tableWidth,
      containerWidth,
      hasTableOverflow
    };
  });

  console.log('Quotes Table Audit:', JSON.stringify(quotesTableAudit, null, 2));
  await page.screenshot({ path: 'scratch/reproduced_user_quotes.png' });

  // Switch to Package Requests tab
  await page.evaluate(() => {
    window.switchCateringTab('packages');
  });
  await new Promise(r => setTimeout(r, 600));

  const pkgTableAudit = await page.evaluate(() => {
    const table = document.querySelector('#catering-packages-table');
    if (!table) return { error: 'No catering-packages-table found' };
    const ths = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const firstRowTds = Array.from(table.querySelectorAll('tbody tr:first-child td')).map(td => ({
      dataLabel: td.getAttribute('data-label'),
      html: td.innerHTML.substring(0, 100),
      text: td.textContent.replace(/\s+/g, ' ').trim(),
      width: Math.round(td.getBoundingClientRect().width)
    }));
    return {
      thCount: ths.length,
      headers: ths,
      tdCount: firstRowTds.length,
      tds: firstRowTds
    };
  });

  console.log('Package Requests Table Audit:', JSON.stringify(pkgTableAudit, null, 2));
  await page.screenshot({ path: 'scratch/reproduced_user_packages.png' });

  // Test Review Button Click -> Opens Modal
  console.log('Testing "Review" button click on package request...');
  await page.evaluate(() => {
    window.openPackageRequestById('pkg1');
  });
  await new Promise(r => setTimeout(r, 500));

  const modalAudit = await page.evaluate(() => {
    const modal = document.getElementById('package-request-modal');
    if (!modal) return { exists: false };
    const box = modal.querySelector('.crm-modal-box');
    const header = modal.querySelector('.crm-modal-header');
    const closeBtn = modal.querySelector('.crm-modal-close');
    return {
      exists: true,
      isOpen: modal.classList.contains('open'),
      display: window.getComputedStyle(modal).display,
      opacity: window.getComputedStyle(modal).opacity,
      boxVisible: box ? box.offsetHeight > 0 : false,
      boxW: box ? box.offsetWidth : 0,
      boxH: box ? box.offsetHeight : 0,
      closeBtnClass: closeBtn ? closeBtn.className : null,
      reqNumText: document.getElementById('prm-req-num')?.textContent,
      custNameText: document.getElementById('prm-cust-name')?.textContent
    };
  });
  console.log('Modal Audit:', JSON.stringify(modalAudit, null, 2));
  await page.screenshot({ path: 'scratch/reproduced_user_modal.png' });

  // Close modal
  await page.evaluate(() => {
    window.closePackageRequestModal();
  });
  await new Promise(r => setTimeout(r, 400));

  // Test Mobile viewports
  console.log('Testing Mobile 375px...');
  await page.setViewport({ width: 375, height: 667 });
  await page.evaluate(() => {
    window.switchCateringTab('quotes');
  });
  await new Promise(r => setTimeout(r, 600));

  const mobileQuotesAudit = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const card = document.querySelector('#cat-tab-quotes table tr');
    const cardW = card ? Math.round(card.getBoundingClientRect().width) : 0;
    const actionsCell = document.querySelector('#cat-tab-quotes .crm-actions-cell');
    const actionsW = actionsCell ? Math.round(actionsCell.getBoundingClientRect().width) : 0;
    const buttons = Array.from(document.querySelectorAll('#cat-tab-quotes .crm-actions-grid button')).map(b => ({
      text: b.textContent.trim(),
      width: Math.round(b.getBoundingClientRect().width),
      height: Math.round(b.getBoundingClientRect().height)
    }));

    return {
      docW,
      scrollW,
      hasOverflow: scrollW > docW,
      cardW,
      actionsW,
      buttons
    };
  });
  console.log('Mobile 375px Quotes Card Audit:', JSON.stringify(mobileQuotesAudit, null, 2));
  await page.screenshot({ path: 'scratch/reproduced_mobile_quotes.png' });

  await page.evaluate(() => {
    window.switchCateringTab('packages');
  });
  await new Promise(r => setTimeout(r, 600));

  const mobilePkgAudit = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const card = document.querySelector('#cat-tab-packages table tr');
    const cardW = card ? Math.round(card.getBoundingClientRect().width) : 0;
    const actionsCell = document.querySelector('#cat-tab-packages .crm-actions-cell');
    const actionsW = actionsCell ? Math.round(actionsCell.getBoundingClientRect().width) : 0;
    const buttons = Array.from(document.querySelectorAll('#cat-tab-packages .crm-actions-grid button')).map(b => ({
      text: b.textContent.trim(),
      width: Math.round(b.getBoundingClientRect().width),
      height: Math.round(b.getBoundingClientRect().height)
    }));

    return {
      docW,
      scrollW,
      hasOverflow: scrollW > docW,
      cardW,
      actionsW,
      buttons
    };
  });
  console.log('Mobile 375px Packages Card Audit:', JSON.stringify(mobilePkgAudit, null, 2));
  await page.screenshot({ path: 'scratch/reproduced_mobile_packages.png' });

  await browser.close();
  server.close();
  console.log('Done!');
  process.exit(0);
});
