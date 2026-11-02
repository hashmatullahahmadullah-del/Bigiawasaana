const puppeteer = require('puppeteer');

const PAGES = [
  '/',
  '/menu.html',
  '/catering.html',
  '/locations.html',
  '/specials.html',
  '/order-history.html',
  '/order-status.html',
  '/shop.html',
  '/faq.html',
  '/blog.html'
];

const VIEWPORTS = [
  { name: 'Mobile', width: 375, height: 812 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 800 }
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const allIssues = [];

  for (const path of PAGES) {
    const page = await browser.newPage();
    const errors = [];
    const broken = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    page.on('response', res => {
      if (res.status() >= 400 && res.status() !== 403) {
        broken.push(`${res.status()} ${res.url()}`);
      }
    });

    const url = `https://bigi-awasaana-7b3ce.web.app${path}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    } catch (e) {
      console.log(`Failed loading ${url}:`, e.message);
      await page.close();
      continue;
    }

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 300));

      const ov = await page.evaluate((vpW) => {
        const scrollW = document.documentElement.scrollWidth;
        const bodyW = document.body.scrollWidth;
        const maxW = Math.max(scrollW, bodyW);
        if (maxW > vpW + 2) {
          // Find culprit
          const elements = Array.from(document.querySelectorAll('*'));
          for (const el of elements) {
            const r = el.getBoundingClientRect();
            if (r.right > vpW + 4 && r.width > 0 && r.height > 0) {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : '';
              const cls = el.className ? `.${String(el.className).trim().split(/\s+/).join('.')}` : '';
              return { overflow: true, maxW, vpW, culprit: `${tag}${id}${cls} right: ${Math.round(r.right)}px` };
            }
          }
          return { overflow: true, maxW, vpW, culprit: 'unknown' };
        }
        return { overflow: false };
      }, vp.width);

      if (ov.overflow) {
        allIssues.push({ page: path, viewport: vp.name, issue: `Horizontal overflow: ${ov.maxW}px > ${ov.vpW}px. Culprit: ${ov.culprit}` });
      }
    }

    if (broken.length > 0) {
      allIssues.push({ page: path, issue: `Broken resources: ${broken.join(', ')}` });
    }
    if (errors.length > 0) {
      allIssues.push({ page: path, issue: `Console errors: ${errors.join(', ')}` });
    }

    await page.close();
  }

  console.log("\n================ AUDIT SUMMARY ================");
  console.log(JSON.stringify(allIssues, null, 2));
  await browser.close();
})();
