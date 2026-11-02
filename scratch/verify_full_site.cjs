const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const urls = [
      'https://www.bigiawasaana.com/',
      'https://www.bigiawasaana.com/menu',
      'https://www.bigiawasaana.com/admin',
      'https://www.bigiawasaana.com/tv1.html',
      'https://www.bigiawasaana.com/tv2.html',
      'https://www.bigiawasaana.com/blog'
    ];

    for (const url of urls) {
      const pageErrors = [];
      const consoleErrors = [];

      const onPageError = err => pageErrors.push(err.toString());
      const onConsole = msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      };

      page.on('pageerror', onPageError);
      page.on('console', onConsole);

      console.log(`\nTesting ${url} ...`);
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      console.log(`Status: ${response.status()}`);

      if (url.includes('/admin')) {
        const errorBanner = await page.evaluate(() => {
          const el = document.getElementById('global-error');
          const textEl = document.getElementById('global-error-text');
          return {
            visible: el ? window.getComputedStyle(el).display !== 'none' : false,
            text: textEl ? textEl.textContent.trim() : ''
          };
        });
        console.log(`Admin Error Banner:`, errorBanner);
      }

      if (url.includes('/menu')) {
        const menuCheck = await page.evaluate(() => {
          const cards = document.querySelectorAll('.menu-item-card, .menu-card');
          const names = Array.from(cards).map(c => c.querySelector('h3, h4')?.textContent?.trim() || '');
          const duplicateNames = names.filter((item, index) => names.indexOf(item) !== index && item !== '');
          return {
            totalCards: cards.length,
            duplicates: Array.from(new Set(duplicateNames))
          };
        });
        console.log(`Menu Items Check:`, menuCheck);
      }

      page.off('pageerror', onPageError);
      page.off('console', onConsole);

      if (pageErrors.length > 0) {
        console.log(`Page errors on ${url}:`, pageErrors);
      } else {
        console.log(`Zero page errors on ${url}`);
      }
    }

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
