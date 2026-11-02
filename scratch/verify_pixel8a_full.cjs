const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server for dist
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(__dirname, '..', 'dist', reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(4173, async () => {
  console.log('Static server listening on port 4173');
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Pixel 8a viewport: 412 x 915
    await page.setViewport({
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true
    });

    await page.goto('http://localhost:4173/admin.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Switch to Marketing view and screenshot
    await page.evaluate(() => {
      // Reveal marketing section
      document.querySelectorAll('.crm-view').forEach(v => v.style.display = 'none');
      const mkt = document.getElementById('marketing-view');
      if (mkt) mkt.style.display = 'block';
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(__dirname, 'pixel8a_marketing_view.png'), fullPage: false });
    console.log('Saved pixel8a_marketing_view.png');

    // Switch to TV layout view and screenshot
    await page.evaluate(() => {
      document.querySelectorAll('.crm-view').forEach(v => v.style.display = 'none');
      const tv = document.getElementById('tv-layout-view');
      if (tv) tv.style.display = 'block';
      if (window.renderTvLayout) window.renderTvLayout();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(__dirname, 'pixel8a_tv_layout_view.png'), fullPage: false });
    console.log('Saved pixel8a_tv_layout_view.png');

    // Scroll down on TV layout to verify sticky tabs
    await page.evaluate(() => {
      const main = document.querySelector('.crm-main');
      if (main) main.scrollTop = 300;
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(__dirname, 'pixel8a_tv_layout_scrolled.png'), fullPage: false });
    console.log('Saved pixel8a_tv_layout_scrolled.png');

    // Screenshot sidebar with Sign Out button
    await page.evaluate(() => {
      const nav = document.querySelector('.crm-nav');
      if (nav) nav.classList.add('open');
      const logout = document.getElementById('logout-btn');
      if (logout) logout.style.display = 'flex';
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(__dirname, 'pixel8a_sidebar_logout.png'), fullPage: false });
    console.log('Saved pixel8a_sidebar_logout.png');

    await browser.close();
  } catch (err) {
    console.error('Puppeteer verification failed:', err);
  } finally {
    server.close();
  }
});
