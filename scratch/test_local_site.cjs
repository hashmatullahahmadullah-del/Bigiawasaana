const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Test Admin Catering Tabs
  console.log('Testing Admin Catering Tabs...');
  await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle2' });

  // Navigate to Catering section
  const cateringNav = await page.$('a[data-view="catering"]');
  if (cateringNav) {
    await cateringNav.click();
    await new Promise(r => setTimeout(r, 600));

    // Click "PACKAGE REQUESTS" tab
    const pkgTabBtn = await page.$('#cat-subnav button:nth-child(2)');
    if (pkgTabBtn) {
      await pkgTabBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'scratch/local_admin_packages_tab.png' });
      console.log('Saved scratch/local_admin_packages_tab.png');
    }

    // Click "CATALOG & TEMPLATES" tab
    const catalogTabBtn = await page.$('#cat-subnav button:nth-child(5)');
    if (catalogTabBtn) {
      await catalogTabBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'scratch/local_admin_catalog_tab.png' });
      console.log('Saved scratch/local_admin_catalog_tab.png');
    }
  }

  // 2. Test Catering Page
  console.log('Testing /catering page...');
  await page.goto('http://localhost:4173/catering', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'scratch/local_catering_page.png' });

  // Check if button exists
  const buildBtn = await page.$('#btn-start-builder');
  console.log('Build button found:', !!buildBtn);
  if (buildBtn) {
    await buildBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: 'scratch/local_builder_step1.png' });
    console.log('Saved scratch/local_builder_step1.png');

    // Click next step
    const nextBtn = await page.$('#cat-builder-modal #btn-step-next');
    if (nextBtn) {
      await nextBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'scratch/local_builder_step2.png' });
      console.log('Saved scratch/local_builder_step2.png');

      // Click "Build From Scratch"
      const scratchBtn = await page.$('#btn-start-scratch');
      if (scratchBtn) {
        await scratchBtn.click();
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: 'scratch/local_builder_step3.png' });
        console.log('Saved scratch/local_builder_step3.png');
      }
    }
  }

  await browser.close();
})();
