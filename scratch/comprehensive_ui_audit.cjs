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
  '/blog.html',
  '/review.html',
  '/tv1.html',
  '/tv2.html'
];

const VIEWPORTS = [
  { name: 'Mobile (375x812)', width: 375, height: 812 },
  { name: 'Tablet (768x1024)', width: 768, height: 1024 },
  { name: 'Desktop (1280x800)', width: 1280, height: 800 }
];

const BASE_URL = 'https://bigi-awasaana-7b3ce.web.app';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const auditResults = [];

  for (const pagePath of PAGES) {
    const pageUrl = `${BASE_URL}${pagePath}`;
    console.log(`\n========================================\nAuditing: ${pageUrl}\n========================================`);

    const pageErrors = [];
    const brokenResources = [];

    const page = await browser.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known harmless 3rd-party noise if any
        pageErrors.push(text);
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    page.on('response', res => {
      if (res.status() >= 400 && res.status() !== 403) {
        // 403 might be expected for protected orders without token
        brokenResources.push(`${res.status()} ${res.url()}`);
      }
    });

    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    } catch (e) {
      console.error(`Failed to load ${pageUrl}:`, e.message);
      await page.close();
      continue;
    }

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 400));

      const vpAudit = await page.evaluate((vpName, w) => {
        const issues = [];

        // 1. Check Horizontal Overflow (Causes horizontal wiggle/scrolling on mobile!)
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        if (docWidth > winWidth + 2 || bodyWidth > winWidth + 2) {
          // Find the overflowing elements
          const allEls = Array.from(document.querySelectorAll('*'));
          const overflowers = [];
          for (const el of allEls) {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 2 && rect.width > 0 && rect.height > 0) {
              const tag = el.tagName.toLowerCase();
              const cls = el.className ? `.${String(el.className).trim().split(/\s+/).join('.')}` : '';
              const id = el.id ? `#${el.id}` : '';
              overflowers.push(`${tag}${id}${cls} (right: ${Math.round(rect.right)}px, w: ${Math.round(rect.width)}px)`);
              if (overflowers.length >= 4) break;
            }
          }
          issues.push({
            type: 'HORIZONTAL_OVERFLOW',
            detail: `Doc scrollWidth (${docWidth}px) > viewport (${winWidth}px). Culprits: ${overflowers.join(', ')}`
          });
        }

        // 2. Check Broken Images (naturalWidth === 0)
        const images = Array.from(document.querySelectorAll('img'));
        const brokenImgs = [];
        for (const img of images) {
          if (img.complete && img.naturalWidth === 0 && img.src && !img.src.includes('data:image')) {
            brokenImgs.push(img.src.substring(0, 100));
          }
        }
        if (brokenImgs.length > 0) {
          issues.push({
            type: 'BROKEN_IMAGES',
            detail: `${brokenImgs.length} broken image(s): ${brokenImgs.slice(0, 3).join(', ')}`
          });
        }

        // 3. Check for empty buttons or links without accessible name / text
        const badButtons = [];
        const buttons = Array.from(document.querySelectorAll('button:not([aria-hidden="true"])'));
        for (const b of buttons) {
          const text = (b.innerText || b.getAttribute('aria-label') || b.getAttribute('title') || '').trim();
          const hasImgOrSvg = b.querySelector('img, svg');
          const isVisible = b.offsetWidth > 0 && b.offsetHeight > 0;
          if (isVisible && !text && !hasImgOrSvg) {
            badButtons.push(b.outerHTML.substring(0, 80));
          }
        }
        if (badButtons.length > 0) {
          issues.push({
            type: 'ACCESSIBILITY_BUTTON',
            detail: `Buttons with no text or label: ${badButtons.join(', ')}`
          });
        }

        // 4. Check for unreadable/overlapping elements
        // Check z-index collisions or negative margin cutoffs if any

        return issues;
      }, vp.name, vp.width);

      if (vpAudit.length > 0) {
        console.log(`[${vp.name}] Issues found:`, JSON.stringify(vpAudit, null, 2));
      }
    }

    if (brokenResources.length > 0) {
      console.log(`Broken Resources (>=400):`, brokenResources);
    }
    if (pageErrors.length > 0) {
      console.log(`Console Errors:`, pageErrors);
    }

    await page.close();
  }

  await browser.close();
})();
