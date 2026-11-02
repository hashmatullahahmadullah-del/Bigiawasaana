const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const distDir = path.resolve('dist');
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  let filePath = path.join(distDir, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join('public', reqPath);
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(4499, async () => {
  console.log('Serving on 4499');
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Index page
    await page.goto('http://localhost:4499/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    const brainDir = 'C:/Users/User/.gemini/antigravity/brain/7ee11dee-67d2-4ec5-bdbe-9efa8ae43b4b';
    await page.screenshot({ path: path.join(brainDir, 'verified_index_ui.png') });
    console.log('Index screenshot captured');

    // 2. Switch to mobile to test Mobile Sign In & Drawer
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(brainDir, 'verified_mobile_ui.png') });

    const signinBtn = await page.$('#nav-mobile-signin-btn');
    if (signinBtn) {
      await signinBtn.click();
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(brainDir, 'verified_login_modal.png') });
      console.log('Login modal screenshot captured');
    }

    // 3. Order History & Rewards page
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:4499/order-history.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(brainDir, 'verified_order_history_rewards.png') });
    console.log('Order History screenshot captured');

    await browser.close();
  } catch (e) {
    console.error(e);
  } finally {
    server.close();
    process.exit(0);
  }
});
