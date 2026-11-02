const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const viewports = [
    { name: 'iPhone SE (320px)', width: 320, height: 568 },
    { name: 'iPhone 13 (375px)', width: 375, height: 667 },
    { name: 'Pixel 7 (412px)', width: 412, height: 915 },
    { name: 'iPad Mini (768px)', width: 768, height: 1024 }
  ];

  console.log('=== AUDITING PUBLIC CATERING PAGE (catering.html) ===');
  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/catering.html', { waitUntil: 'domcontentloaded' });

    const audit = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const overflowingElements = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > docW + 1) {
          overflowingElements.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            right: Math.round(r.right),
            width: Math.round(r.width),
            docWidth: docW
          });
        }
      });
      return {
        clientWidth: docW,
        scrollWidth: scrollW,
        hasHorizontalOverflow: scrollW > docW,
        overflowCount: overflowingElements.length,
        sampleOverflows: overflowingElements.slice(0, 5)
      };
    });

    console.log(`[${vp.name}] Public Page Overflow: ${audit.hasHorizontalOverflow} (scroll: ${audit.scrollWidth}px vs client: ${audit.clientWidth}px)`);
    if (audit.hasHorizontalOverflow) {
      console.log('  Sample overflowing elements:', JSON.stringify(audit.sampleOverflows, null, 2));
    }
    await page.close();
  }

  console.log('\n=== AUDITING CATERING PACKAGE BUILDER MODAL ON MOBILE (375px) ===');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/catering.html', { waitUntil: 'networkidle2' });

    // Open package builder
    await page.evaluate(() => {
      if (typeof window.openCateringPackageBuilder === 'function') {
        window.openCateringPackageBuilder();
      } else {
        const btn = document.getElementById('open-package-builder-btn') || document.querySelector('.btn-catering-builder');
        if (btn) btn.click();
      }
    });

    await new Promise(r => setTimeout(r, 600));

    // Audit Step 1 to 5
    for (let step = 1; step <= 5; step++) {
      if (step > 1) {
        await page.evaluate((s) => {
          if (typeof window.goToBuilderStep === 'function') {
            window.goToBuilderStep(s);
          }
        }, step);
        await new Promise(r => setTimeout(r, 400));
      }

      const stepAudit = await page.evaluate((stepNum) => {
        const modal = document.querySelector('.builder-modal-container');
        const modalOverlay = document.querySelector('.builder-modal-overlay');
        const body = document.querySelector('.builder-content-body');
        const activeStep = document.getElementById(`builder-step-${stepNum}`);
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;

        // Check if any element inside active step overflows
        const overflows = [];
        if (activeStep) {
          activeStep.querySelectorAll('*').forEach(el => {
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
        }

        return {
          step: stepNum,
          modalVisible: modalOverlay ? window.getComputedStyle(modalOverlay).display !== 'none' : false,
          modalWidth: modal ? modal.getBoundingClientRect().width : 0,
          docWidth: docW,
          scrollWidth: scrollW,
          overflowsCount: overflows.length,
          sampleOverflows: overflows.slice(0, 3)
        };
      }, step);

      console.log(`Step ${step} on 375px: modalW=${stepAudit.modalWidth}px, docW=${stepAudit.docWidth}px, scrollW=${stepAudit.scrollWidth}px, overflows=${stepAudit.overflowsCount}`);
      if (stepAudit.overflowsCount > 0) {
        console.log('  Overflows:', JSON.stringify(stepAudit.sampleOverflows, null, 2));
      }
      await page.screenshot({ path: `scratch/builder_mobile_step${step}.png` });
    }
    await page.close();
  }

  console.log('\n=== AUDITING ADMIN CATERING SECTION ON MOBILE (375px) ===');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/admin.html', { waitUntil: 'domcontentloaded' });

    // Show dashboard and catering view
    await page.evaluate(() => {
      const loginSection = document.getElementById('login-section');
      if (loginSection) loginSection.style.display = 'none';
      const dashSection = document.getElementById('dashboard-section');
      if (dashSection) dashSection.style.display = 'block';

      // Hide all crm-views and show catering-view
      document.querySelectorAll('.crm-view').forEach(v => v.classList.remove('active'));
      const catView = document.getElementById('catering-view');
      if (catView) {
        catView.style.display = 'block';
        catView.classList.add('active');
      }
    });

    const adminTabs = ['inquiries', 'packages', 'quotes', 'bookings', 'catalog'];
    for (const t of adminTabs) {
      await page.evaluate((tabName) => {
        if (typeof window.switchCateringTab === 'function') {
          window.switchCateringTab(tabName);
        } else {
          const btn = document.getElementById(`btn-cat-${tabName}`);
          if (btn) btn.click();
        }
      }, t);
      await new Promise(r => setTimeout(r, 300));

      const tabAudit = await page.evaluate((tabName) => {
        const pane = document.getElementById(`cat-tab-${tabName}`);
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const overflows = [];
        if (pane) {
          pane.querySelectorAll('*').forEach(el => {
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
        }
        return {
          tab: tabName,
          docW,
          scrollW,
          hasOverflow: scrollW > docW,
          overflowCount: overflows.length,
          sample: overflows.slice(0, 3)
        };
      }, t);

      console.log(`Admin Tab [${t}] on 375px: scrollW=${tabAudit.scrollW}px vs docW=${tabAudit.docW}px, overflows=${tabAudit.overflowCount}`);
      if (tabAudit.overflowCount > 0) {
        console.log('  Overflow samples:', JSON.stringify(tabAudit.sample, null, 2));
      }
      await page.screenshot({ path: `scratch/admin_mobile_tab_${t}.png` });
    }
    await page.close();
  }

  await browser.close();
  console.log('=== AUDIT COMPLETE ===');
})();
