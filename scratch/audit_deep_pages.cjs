const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const results = [];

  const checkPage = async (url, viewports = [375, 768, 1024, 1440]) => {
    const pageIssues = [];
    const consoleErrors = [];
    const failedRequests = [];

    const onConsole = msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known harmless 3rd party tracker errors if any
        consoleErrors.push(text);
      }
    };
    const onRequestFailed = req => {
      // Ignore analytics/pixel blocks
      if (!req.url().includes('google-analytics') && !req.url().includes('googletagmanager')) {
        failedRequests.push({ url: req.url(), error: req.failure() ? req.failure().errorText : 'failed' });
      }
    };

    page.on('console', onConsole);
    page.on('requestfailed', onRequestFailed);

    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      const status = resp ? resp.status() : 0;
      if (status >= 400) {
        pageIssues.push({ type: 'HTTP_STATUS', status, url });
      }

      for (const w of viewports) {
        await page.setViewport({ width: w, height: 850 });
        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientWidth = docEl.clientWidth;
          const hasOverflow = scrollWidth > clientWidth + 2;

          // Find specific overflowing elements if any
          let overflowingElements = [];
          if (hasOverflow) {
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const r = el.getBoundingClientRect();
              if (r.right > clientWidth + 2) {
                overflowingElements.push({
                  tag: el.tagName,
                  id: el.id,
                  className: el.className ? String(el.className).slice(0, 50) : '',
                  right: Math.round(r.right),
                  clientWidth
                });
                if (overflowingElements.length >= 5) break;
              }
            }
          }
          return { hasOverflow, scrollWidth, clientWidth, overflowingElements };
        });

        if (overflow.hasOverflow) {
          pageIssues.push({
            type: 'HORIZONTAL_OVERFLOW',
            viewport: w,
            scrollWidth: overflow.scrollWidth,
            clientWidth: overflow.clientWidth,
            elements: overflow.overflowingElements
          });
        }
      }

      // Check broken images on page
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => {
          return !img.complete || img.naturalWidth === 0;
        }).map(img => ({
          src: img.src,
          alt: img.alt,
          id: img.id,
          className: img.className
        }));
      });

      if (brokenImages.length > 0) {
        pageIssues.push({ type: 'BROKEN_IMAGES', images: brokenImages });
      }

    } catch (e) {
      pageIssues.push({ type: 'PAGE_CRASH_OR_TIMEOUT', error: e.message });
    }

    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);

    if (consoleErrors.length > 0) {
      pageIssues.push({ type: 'CONSOLE_ERRORS', errors: consoleErrors.slice(0, 5) });
    }
    if (failedRequests.length > 0) {
      pageIssues.push({ type: 'FAILED_REQUESTS', requests: failedRequests.slice(0, 5) });
    }

    return { url, issues: pageIssues };
  };

  const pagesToTest = [
    'https://bigi-awasaana-7b3ce.web.app/',
    'https://bigi-awasaana-7b3ce.web.app/menu',
    'https://bigi-awasaana-7b3ce.web.app/catering',
    'https://bigi-awasaana-7b3ce.web.app/locations',
    'https://bigi-awasaana-7b3ce.web.app/specials',
    'https://bigi-awasaana-7b3ce.web.app/blog',
    'https://bigi-awasaana-7b3ce.web.app/shop',
    'https://bigi-awasaana-7b3ce.web.app/faq',
    'https://bigi-awasaana-7b3ce.web.app/order-history',
    'https://bigi-awasaana-7b3ce.web.app/order-status',
    // Individual item prerender
    'https://bigi-awasaana-7b3ce.web.app/item/bigi-s-chapli-kabob',
    'https://bigi-awasaana-7b3ce.web.app/item/bigi-s-silk-road-wrap-aka-afghan-burger',
    // Area SEO prerender
    'https://bigi-awasaana-7b3ce.web.app/areas/reseda',
    'https://bigi-awasaana-7b3ce.web.app/areas/encino',
    // Blog post prerender
    'https://bigi-awasaana-7b3ce.web.app/blog/gyro-vs-shawarma-vs-doner-difference'
  ];

  for (const u of pagesToTest) {
    const res = await checkPage(u);
    results.push(res);
    console.log(`Audited: ${u} -> ${res.issues.length} issues found`);
    if (res.issues.length > 0) {
      console.log(JSON.stringify(res.issues, null, 2));
    }
  }

  await browser.close();
})();
