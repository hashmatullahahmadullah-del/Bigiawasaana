const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server for dist/
function startServer() {
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.avif': 'image/avif',
  };

  const server = http.createServer((req, res) => {
    let cleanPath = req.url.split('?')[0];
    if (cleanPath === '/' || cleanPath === '') cleanPath = '/index.html';
    if (!path.extname(cleanPath)) cleanPath += '.html';

    let filePath = path.join(__dirname, '..', 'dist', cleanPath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '..', 'public', cleanPath);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found: ' + req.url);
    }
  });

  return new Promise(resolve => {
    server.listen(4199, () => {
      resolve(server);
    });
  });
}

(async () => {
  const server = await startServer();
  console.log('Dist server running on http://localhost:4199');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // 1. Desktop Test
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:4199/', { waitUntil: 'networkidle2' });

  const desktopBtnInfo = await page.evaluate(() => {
    const btn = document.getElementById('nav-account-btn');
    return {
      exists: Boolean(btn),
      text: btn ? btn.textContent.trim() : null,
      display: btn ? window.getComputedStyle(btn).display : null,
      visibility: btn ? window.getComputedStyle(btn).visibility : null
    };
  });
  console.log('1. Desktop nav-account-btn info:', desktopBtnInfo);

  // Click desktop sign-in button
  if (desktopBtnInfo.exists) {
    console.log('Clicking desktop sign-in button...');
    await page.click('#nav-account-btn');
    await new Promise(r => setTimeout(r, 1000));

    const modalState = await page.evaluate(() => {
      const modal = document.getElementById('auth-modal');
      return {
        exists: Boolean(modal),
        display: modal ? window.getComputedStyle(modal).display : null,
        activeClass: modal ? modal.classList.contains('active') : false,
        phoneInput: Boolean(document.getElementById('auth-phone-input')),
        googleBtn: Boolean(document.getElementById('btn-auth-google')),
        appleBtn: Boolean(document.getElementById('btn-auth-apple'))
      };
    });
    console.log('Modal state after desktop click:', modalState);
  }

  // 2. Mobile Test
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:4199/menu', { waitUntil: 'networkidle2' });

  const mobileBtnInfo = await page.evaluate(() => {
    const btn = document.getElementById('nav-mobile-signin-btn');
    return {
      exists: Boolean(btn),
      text: btn ? btn.textContent.trim() : null,
      display: btn ? window.getComputedStyle(btn).display : null
    };
  });
  console.log('2. Mobile menu nav-mobile-signin-btn info:', mobileBtnInfo);

  // Click mobile header sign-in
  if (mobileBtnInfo.exists) {
    console.log('Clicking mobile header sign-in button...');
    await page.click('#nav-mobile-signin-btn');
    await new Promise(r => setTimeout(r, 1000));

    const mobileModalState = await page.evaluate(() => {
      const modal = document.getElementById('auth-modal');
      return {
        exists: Boolean(modal),
        activeClass: modal ? modal.classList.contains('active') : false,
        phoneInput: Boolean(document.getElementById('auth-phone-input'))
      };
    });
    console.log('Modal state after mobile click:', mobileModalState);
  }

  // 3. Order History Page Test
  await page.goto('http://localhost:4199/order-history', { waitUntil: 'networkidle2' });
  const orderHistoryInfo = await page.evaluate(() => {
    return {
      title: document.title,
      verifyTitle: document.getElementById('verify-title')?.textContent?.trim(),
      hasPhoneForm: Boolean(document.getElementById('form-phone')),
      hasPinForm: Boolean(document.getElementById('form-pin')),
      hasGoogleBtn: Boolean(document.getElementById('btn-page-google')),
      hasAppleBtn: Boolean(document.getElementById('btn-page-apple'))
    };
  });
  console.log('3. Order History page info:', orderHistoryInfo);

  // 4. Check Menu items count on /menu
  const menuCount = await page.evaluate(async () => {
    const res = await fetch('/menu.html');
    const text = await res.text();
    const ids = (text.match(/data-item-id="([^"]+)"/g) || []);
    return {
      totalCards: ids.length,
      uniqueCards: new Set(ids).size
    };
  });
  console.log('4. Menu items in dist/menu.html:', menuCount);

  // 5. Check TV Screens
  await page.goto('http://localhost:4199/tv1', { waitUntil: 'networkidle2' });
  const tv1Title = await page.title();
  const tv1HasGrid = await page.evaluate(() => Boolean(document.getElementById('tv-grid') || document.querySelector('.tv-menu-container')));
  console.log('5. TV1 title & grid:', { tv1Title, tv1HasGrid });

  await browser.close();
  server.close();
  console.log('All tests finished successfully.');
})();
