import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  console.log('Visiting /blog to find published blog posts...');
  await page.goto('https://bigi-awasaana-7b3ce.web.app/blog', { waitUntil: 'networkidle2', timeout: 30000 });

  const postLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/blog/"]'));
    return anchors.map(a => a.getAttribute('href'));
  });
  console.log('Found blog post links:', postLinks);

  const testSlug = postLinks.length > 0 ? postLinks[0] : '/blog';
  const targetUrl = `https://bigi-awasaana-7b3ce.web.app${testSlug}`;
  console.log(`\nNavigating to published blog post: ${targetUrl}...`);

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('cookieConsent', JSON.stringify({ essential: true, analytics: true }));
  });

  const failedRequests = [];
  const consoleErrors = [];

  page.on('requestfailed', req => {
    failedRequests.push(`${req.url()} (${req.failure()?.errorText || 'failed'})`);
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('analytics.google.com') && !resp.url().includes('googletagmanager')) {
      failedRequests.push(`${resp.url()} (Status ${resp.status()})`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const response = await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log(`HTTP Status: ${response.status()}`);

  console.log('\n--- Failed Asset Requests ---');
  console.log(failedRequests.length ? failedRequests.join('\n') : 'None (All assets loaded successfully!)');

  console.log('\n--- Console Errors ---');
  console.log(consoleErrors.length ? consoleErrors.join('\n') : 'None (Clean console!)');

  // Test 1: Check initial nav elements
  const initialNav = await page.evaluate(() => {
    const hamburger = document.getElementById('nav-hamburger');
    const drawer = document.getElementById('nav-mobile-drawer');
    const backdrop = document.getElementById('nav-mobile-backdrop');
    return {
      hamburgerExists: !!hamburger,
      drawerExists: !!drawer,
      backdropExists: !!backdrop,
      drawerOpen: drawer ? drawer.classList.contains('open') : false
    };
  });
  console.log('\n--- Test 1: Initial Nav Elements ---', initialNav);

  // Test 2: Click hamburger to open drawer
  const openResult = await page.evaluate(() => {
    const hamburger = document.getElementById('nav-hamburger');
    const drawer = document.getElementById('nav-mobile-drawer');
    const backdrop = document.getElementById('nav-mobile-backdrop');
    hamburger.click();
    return {
      drawerOpen: drawer.classList.contains('open'),
      backdropOpen: backdrop ? backdrop.classList.contains('open') : false,
      bodyClass: document.body.classList.contains('nav-drawer-open')
    };
  });
  console.log('--- Test 2: Click Hamburger (Open) ---', openResult);

  // Wait for 500ms transition to finish
  await new Promise(r => setTimeout(r, 500));

  // Take screenshot of open drawer
  await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/7ee11dee-67d2-4ec5-bdbe-9efa8ae43b4b/blog_mobile_nav_open.png' });

  // Test 3: Click backdrop to close drawer
  const closeResult = await page.evaluate(() => {
    const backdrop = document.getElementById('nav-mobile-backdrop');
    const drawer = document.getElementById('nav-mobile-drawer');
    if (backdrop) backdrop.click();
    return {
      drawerOpen: drawer.classList.contains('open'),
      backdropOpen: backdrop ? backdrop.classList.contains('open') : false
    };
  });
  console.log('--- Test 3: Click Backdrop (Close) ---', closeResult);

  // Test 4: Language Switcher
  const langResult = await page.evaluate(() => {
    const toggle = document.querySelector('.site-lang-toggle');
    const initialText = toggle ? toggle.textContent : null;
    if (toggle) toggle.click();
    const afterClickText = toggle ? toggle.textContent : null;
    const currentLang = localStorage.getItem('site_lang') || document.documentElement.lang;
    return {
      toggleFound: !!toggle,
      initialText,
      afterClickText,
      currentLang
    };
  });
  console.log('--- Test 4: Language Switcher ---', langResult);

  await browser.close();
  console.log('\nVerification complete!');
})();
