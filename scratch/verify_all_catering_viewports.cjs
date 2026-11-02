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

server.listen(5288, async () => {
  console.log('Test server listening on http://localhost:5288');

  const browser = await puppeteer.launch({ headless: 'new' });
  const viewports = [
    { name: 'iPhone SE (320px)', width: 320, height: 568 },
    { name: 'iPhone 13 (375px)', width: 375, height: 667 },
    { name: 'Pixel 7 (412px)', width: 412, height: 915 },
    { name: 'iPad Portrait (768px)', width: 768, height: 1024 },
    { name: 'Laptop (1024px)', width: 1024, height: 768 },
    { name: 'Desktop (1280px)', width: 1280, height: 800 }
  ];

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5288/admin', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => typeof window.switchCateringTab === 'function', { timeout: 10000 });

  // Inject full mock data
  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    const dash = document.getElementById('dashboard-section');
    dash.style.display = 'block';
    dash.style.height = 'auto';

    window.switchAdminView('catering-view');

    window.state = window.state || {};
    window.state.catering = [
      {
        id: 'inq1',
        createdAt: '2026-10-30T10:00:00Z',
        name: 'Ahmad Haidari',
        phone: '8185550192',
        email: 'ahmad@example.com',
        date: '2026-11-12',
        guests: 45,
        status: 'new'
      }
    ];

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

    window.state.packageRequests = [
      {
        id: 'pkg1',
        requestNumber: 'BA-PKG-2610-04A3',
        customerContact: { name: 'Areema Hannah', phone: '3235856621', email: 'ahmadhaidari2700@gmail.com', preferredContact: 'phone' },
        eventDetails: { date: '2026-11-06', time: '17:00', guests: 20, type: 'Family Gathering', fulfillment: 'delivery', deliveryAddress: '18411 Victory Blvd, Reseda, CA 91335' },
        selectedItems: [
          { name: "Bigi's Qabuli Pulao Rice Tray", portionSize: 'Large Party Tray', quantity: 2, unitPrice: 110, totalPrice: 220 }
        ],
        selectedServices: [],
        estimatedPriceBreakdown: { foodSubtotal: 820.00, servicesTotal: 0, deliveryFee: 15.00, taxAmount: 78.54, estimatedTotal: 948.54 },
        status: 'new'
      }
    ];
  });

  const tabs = ['inquiries', 'packages', 'quotes', 'bookings', 'catalog'];
  const results = [];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 200));

    for (const t of tabs) {
      await page.evaluate((tabName) => window.switchCateringTab(tabName), t);
      await new Promise(r => setTimeout(r, 250));

      const audit = await page.evaluate((tabName) => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const hasDocOverflow = scrollW > docW;

        // Find any elements exceeding docW
        const overflowing = [];
        const pane = document.getElementById(`cat-tab-${tabName}`);
        if (pane) {
          pane.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            // allow 2px rounding tolerance
            if (r.right > docW + 2) {
              overflowing.push({
                tag: el.tagName,
                className: el.className,
                right: Math.round(r.right),
                width: Math.round(r.width)
              });
            }
          });
        }

        return {
          tab: tabName,
          docW,
          scrollW,
          hasDocOverflow,
          overflowCount: overflowing.length,
          sample: overflowing.slice(0, 2)
        };
      }, t);

      results.push({
        viewport: vp.name,
        tab: t,
        docW: audit.docW,
        scrollW: audit.scrollW,
        hasDocOverflow: audit.hasDocOverflow,
        overflowCount: audit.overflowCount
      });
    }

    // Capture visual screenshot of Quotes tab at this viewport
    await page.evaluate(() => window.switchCateringTab('quotes'));
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: `scratch/viewport_${vp.width}_quotes.png` });
  }

  console.table(results);

  // Test modal at 375px
  console.log('Testing Package Request Modal at 375px...');
  await page.setViewport({ width: 375, height: 667 });
  await page.evaluate(() => window.switchCateringTab('packages'));
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => window.openPackageRequestById('pkg1'));
  await new Promise(r => setTimeout(r, 400));

  const modalMobileAudit = await page.evaluate(() => {
    const modal = document.getElementById('package-request-modal');
    const box = modal ? modal.querySelector('.crm-modal-box') : null;
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const boxW = box ? Math.round(box.getBoundingClientRect().width) : 0;
    const boxRight = box ? Math.round(box.getBoundingClientRect().right) : 0;

    return {
      docW,
      scrollW,
      hasOverflow: scrollW > docW,
      boxW,
      boxRight,
      fitsInScreen: boxRight <= docW
    };
  });
  console.log('Modal Mobile Audit:', modalMobileAudit);
  await page.screenshot({ path: 'scratch/viewport_375_modal.png' });

  await page.evaluate(() => window.closePackageRequestModal());
  await new Promise(r => setTimeout(r, 200));

  await browser.close();
  server.close();
  console.log('All Viewport Verification Complete!');
  process.exit(0);
});
