const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/admin' || reqPath === '/admin.html') reqPath = '/admin.html';
  if (reqPath === '/admin/orders.html') reqPath = '/admin/orders.html';

  const fullPath = path.join(process.cwd(), 'dist', reqPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    let contentType = 'text/html';
    if (fullPath.endsWith('.js')) contentType = 'application/javascript';
    if (fullPath.endsWith('.css')) contentType = 'text/css';
    if (fullPath.endsWith('.json')) contentType = 'application/json';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(fullPath));
  } else {
    // SPA fallback
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(process.cwd(), 'dist', 'admin.html')));
  }
});

server.listen(4899, async () => {
  console.log('Test server running on port 4899');
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    const page = await browser.newPage();

    // Test 1: Query param ?view=live-orders
    await page.goto('http://localhost:4899/admin?view=live-orders', { waitUntil: 'domcontentloaded' });
    const liveOrdersActive1 = await page.evaluate(() => {
      const el = document.getElementById('live-orders-view');
      return el && el.classList.contains('active') && el.style.display !== 'none';
    });
    console.log('Test 1 (?view=live-orders): live-orders-view active =', liveOrdersActive1);

    // Test 2: Hash #live-orders-view
    await page.goto('http://localhost:4899/admin#live-orders-view', { waitUntil: 'domcontentloaded' });
    const liveOrdersActive2 = await page.evaluate(() => {
      const el = document.getElementById('live-orders-view');
      return el && el.classList.contains('active') && el.style.display !== 'none';
    });
    console.log('Test 2 (#live-orders-view): live-orders-view active =', liveOrdersActive2);

    // Test 3: Alias #order-manager
    await page.goto('http://localhost:4899/admin#order-manager', { waitUntil: 'domcontentloaded' });
    const liveOrdersActive3 = await page.evaluate(() => {
      const el = document.getElementById('live-orders-view');
      return el && el.classList.contains('active') && el.style.display !== 'none';
    });
    console.log('Test 3 (#order-manager): live-orders-view active =', liveOrdersActive3);

    // Test 4: Static fallback /admin/orders.html redirects
    await page.goto('http://localhost:4899/admin/orders.html', { waitUntil: 'networkidle0' });
    console.log('Test 4 (/admin/orders.html): Landed on URL =', page.url());
    const liveOrdersActive4 = await page.evaluate(() => {
      const el = document.getElementById('live-orders-view');
      return el && el.classList.contains('active') && el.style.display !== 'none';
    });
    console.log('Test 4 (/admin/orders.html redirected): live-orders-view active =', liveOrdersActive4);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
