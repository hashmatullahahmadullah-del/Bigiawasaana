const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const viewports = [
    { name: 'iPhone SE (320px)', width: 320, height: 568 },
    { name: 'iPhone 13 (375px)', width: 375, height: 667 },
    { name: 'Pixel 7 (412px)', width: 412, height: 915 }
  ];

  console.log('=== AUDITING PUBLIC CATERING BUILDER ON SERVER ===');
  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5099/catering', { waitUntil: 'networkidle2' });

    // Open builder
    await page.evaluate(() => {
      if (typeof window.openPackageBuilder === 'function') {
        window.openPackageBuilder(50);
      } else {
        const btn = document.querySelector('.catering-builder-hero-cta button');
        if (btn) btn.click();
      }
    });

    await new Promise(r => setTimeout(r, 600));

    // Audit Steps 1 to 5
    for (let step = 1; step <= 5; step++) {
      if (step > 1) {
        await page.evaluate((s) => {
          if (typeof window.goToStep === 'function') {
            window.goToStep(s);
          }
        }, step);
        await new Promise(r => setTimeout(r, 400));
      }

      const audit = await page.evaluate((stepNum) => {
        const modal = document.querySelector('.builder-modal-container');
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;

        const overflows = [];
        document.querySelectorAll('.builder-modal-container *').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.right > docW + 2) {
            overflows.push({
              tag: el.tagName,
              id: el.id,
              className: el.className,
              right: Math.round(r.right),
              width: Math.round(r.width)
            });
          }
        });

        return {
          step: stepNum,
          modalW: modal ? modal.getBoundingClientRect().width : 0,
          docW,
          scrollW,
          hasOverflow: scrollW > docW,
          overflowsCount: overflows.length,
          sample: overflows.slice(0, 3)
        };
      }, step);

      console.log(`[${vp.name}] Step ${step}: modalW=${audit.modalW}px, scrollW=${audit.scrollW}px vs docW=${audit.docW}px, overflows=${audit.overflowsCount}`);
      if (audit.overflowsCount > 0) {
        console.log('  Overflow samples:', JSON.stringify(audit.sample, null, 2));
      }
      await page.screenshot({ path: `scratch/builder_${vp.width}_step${step}.png` });
    }
    await page.close();
  }

  await browser.close();
  console.log('=== BUILDER VERIFICATION COMPLETE ===');
  process.exit(0);
})();
