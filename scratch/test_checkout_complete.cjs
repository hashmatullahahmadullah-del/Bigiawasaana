const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

function startDistServer(port = 4174) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    let filePath = path.join(__dirname, '..', 'dist', reqPath);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://www.googletagmanager.com https://web.squarecdn.com https://*.squarecdn.com https://pay.google.com https://*.google.com https://apis.google.com https://*.firebaseio.com https://cdn.jsdelivr.net https://cdn.quilljs.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.quilljs.com https://web.squarecdn.com https://*.squarecdn.com; font-src 'self' https://fonts.gstatic.com data: https://cdn.jsdelivr.net; img-src 'self' data: blob: https://www.bigiawasaana.com https://bigiawasaana.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://*.googleusercontent.com https://maps.gstatic.com https://maps.googleapis.com; media-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.firebasestorage.app; connect-src 'self' https://*.cloudfunctions.net https://*.run.app https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.google.com https://*.googleapis.com https://web.squarecdn.com https://*.squarecdn.com https://*.squareup.com https://pci-connect.squareup.com https://connect.squareup.com https://pay.google.com https://*.firebasestorage.app https://firebasestorage.googleapis.com; frame-src 'self' https://bigi-awasaana-7b3ce.firebaseapp.com https://www.google.com https://maps.google.com https://web.squarecdn.com https://*.squarecdn.com https://*.squareup.com https://pci-connect.squareup.com https://pay.google.com; object-src 'none'; base-uri 'self';"
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

(async () => {
  const server = await startDistServer(4174);
  console.log('Dist server started on port 4174');

  const browser = await puppeteer.launch({ headless: 'new' });
  const cspErrors = [];
  const consoleLogs = [];

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    consoleLogs.push(msg.text());
    if (msg.text().includes('violates') || msg.text().includes('Content Security Policy')) {
      cspErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:4174/menu', { waitUntil: 'networkidle2' });

  // Add item using UI or page JS function
  await page.evaluate(() => {
    const addBtn = document.querySelector('.add-btn, .menu-card-btn, button[onclick*="addToCart"]');
    if (addBtn) {
      addBtn.click();
    } else if (typeof window.addToCart === 'function') {
      window.addToCart({ id: 'chapli', name: 'Chapli Kabob', price: 15.99, img: '/images/hero/hero-640.webp' });
    }
    const nameEl = document.getElementById('customer-name');
    const phoneEl = document.getElementById('customer-phone');
    if (nameEl) nameEl.value = 'John Doe';
    if (phoneEl) phoneEl.value = '3239211646';
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const modalBtn = document.querySelector('#item-modal-add-btn, #add-to-cart-btn, .modal-add-btn');
    if (modalBtn && modalBtn.offsetParent !== null) modalBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    if (typeof window.toggleCartDrawer === 'function') window.toggleCartDrawer(true);
    else {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) drawer.style.right = '0';
    }
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: 'scratch/verified_cart_drawer_desktop.png' });

  const cartCheck = await page.evaluate(() => {
    const item = document.querySelector('.cart-item');
    const minusBtn = document.querySelector('.cart-qty-minus');
    const plusBtn = document.querySelector('.cart-qty-plus');
    const removeBtn = document.querySelector('.cart-item-remove-btn');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cs = checkoutBtn ? window.getComputedStyle(checkoutBtn) : null;
    return {
      hasItem: !!item,
      minusBtnHtml: minusBtn ? minusBtn.innerHTML : null,
      removeBtnHtml: removeBtn ? removeBtn.innerHTML : null,
      checkoutBtnBg: cs ? cs.backgroundImage : null,
      checkoutBtnColor: cs ? cs.color : null
    };
  });
  console.log('Cart Details:', cartCheck);

  await page.evaluate(() => {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.click();
    else if (typeof window.openPaymentModal === 'function') window.openPaymentModal();
  });
  await new Promise(r => setTimeout(r, 2500));

  await page.screenshot({ path: 'scratch/verified_payment_modal_desktop.png' });

  const modalCheck = await page.evaluate(() => {
    const modal = document.getElementById('payment-modal');
    const payBtn = document.getElementById('pay-button');
    const csPay = payBtn ? window.getComputedStyle(payBtn) : null;
    const cardContainer = document.getElementById('card-container');
    const successDiv = document.getElementById('payment-success');
    return {
      modalDisplay: modal ? window.getComputedStyle(modal).display : null,
      payBtnBg: csPay ? csPay.backgroundImage : null,
      payBtnText: payBtn ? payBtn.innerText : null,
      cardContainerChildren: cardContainer ? cardContainer.children.length : 0,
      cardHtmlSnippet: cardContainer ? cardContainer.innerHTML.substring(0, 150) : null
    };
  });
  console.log('Modal Details:', modalCheck);
  console.log('CSP Errors:', cspErrors);

  // Mobile View
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 375, height: 667, isMobile: true });
  await mobilePage.goto('http://localhost:4174/menu', { waitUntil: 'networkidle2' });

  await mobilePage.evaluate(() => {
    const addBtn = document.querySelector('.add-btn, .menu-card-btn, button[onclick*="addToCart"]');
    if (addBtn) addBtn.click();
    const nameEl = document.getElementById('customer-name');
    const phoneEl = document.getElementById('customer-phone');
    if (nameEl) nameEl.value = 'John Doe';
    if (phoneEl) phoneEl.value = '3239211646';
  });
  await new Promise(r => setTimeout(r, 800));

  await mobilePage.evaluate(() => {
    const modalBtn = document.querySelector('#item-modal-add-btn, #add-to-cart-btn, .modal-add-btn');
    if (modalBtn && modalBtn.offsetParent !== null) modalBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await mobilePage.evaluate(() => {
    if (typeof window.openPaymentModal === 'function') window.openPaymentModal();
  });
  await new Promise(r => setTimeout(r, 2000));

  await mobilePage.screenshot({ path: 'scratch/verified_payment_modal_mobile.png' });

  const mobileCheck = await mobilePage.evaluate(() => {
    const modal = document.querySelector('.payment-modal');
    const payBtn = document.getElementById('pay-button');
    const cs = modal ? window.getComputedStyle(modal) : null;
    return {
      modalMaxHeight: cs ? cs.maxHeight : null,
      modalPadding: cs ? cs.padding : null,
      payBtnVisible: payBtn ? (payBtn.offsetParent !== null) : false
    };
  });
  console.log('Mobile Check:', mobileCheck);

  await browser.close();
  server.close();
})();
