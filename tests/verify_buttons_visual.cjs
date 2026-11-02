const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: '320_compact_mobile', width: 320, height: 640 },
  { name: '375_iphone_se', width: 375, height: 667 },
  { name: '390_iphone_14', width: 390, height: 844 },
  { name: '430_iphone_14_pro_max', width: 430, height: 932 },
  { name: '768_tablet_portrait', width: 768, height: 1024 },
  { name: '1024_tablet_landscape', width: 1024, height: 768 },
  { name: '1440_desktop', width: 1440, height: 900 }
];

const PAGES_TO_TEST = [
  { url: 'http://localhost:4173/index.html', name: 'Homepage' },
  { url: 'http://localhost:4173/menu.html', name: 'Menu' },
  { url: 'http://localhost:4173/catering.html', name: 'Catering' },
  { url: 'http://localhost:4173/shop.html', name: 'Shop' },
  { url: 'http://localhost:4173/admin.html', name: 'Admin', isAdmin: true }
];

async function runVisualTests() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const report = {
    timestamp: new Date().toISOString(),
    viewportsTested: VIEWPORTS.length,
    pagesTested: PAGES_TO_TEST.length,
    totalButtonsAudited: 0,
    textOverflowViolations: [],
    viewportOverflowViolations: [],
    duplicateIconViolations: [],
    loadingStatePassed: false,
    screenshotsTaken: []
  };

  const scratchDir = path.join(__dirname, '..', 'scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const page = await browser.newPage();

  // 1. Dynamic setButtonLoading Test
  console.log('\n--- 1. Testing setButtonLoading & Width Locking ---');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:4173/menu.html', { waitUntil: 'networkidle2' });

  const loadingTestResult = await page.evaluate(() => {
    const testBtn = document.createElement('button');
    testBtn.className = 'btn btn-primary';
    testBtn.innerHTML = '<svg width="16" height="16"><circle cx="8" cy="8" r="6"/></svg><span>Order Now</span>';
    document.body.appendChild(testBtn);

    const initialRect = testBtn.getBoundingClientRect();
    const initialWidth = initialRect.width;

    // Trigger loading
    window.setButtonLoading(testBtn, true, 'Processing Order...');
    const loadingRect = testBtn.getBoundingClientRect();
    const loadingWidth = loadingRect.width;
    const hasSpinner = testBtn.querySelector('.btn-spinner') !== null;
    const isBusy = testBtn.getAttribute('aria-busy') === 'true';
    const isDisabled = testBtn.disabled === true;

    // Revert loading
    window.setButtonLoading(testBtn, false);
    const revertedRect = testBtn.getBoundingClientRect();
    const revertedWidth = revertedRect.width;
    const hasOriginalText = testBtn.textContent.includes('Order Now');
    const wasRemoved = testBtn.querySelector('.btn-spinner') === null;

    testBtn.remove();

    return {
      initialWidth,
      loadingWidth,
      revertedWidth,
      widthLocked: loadingWidth >= initialWidth - 1,
      hasSpinner,
      isBusy,
      isDisabled,
      revertedSuccessfully: hasOriginalText && wasRemoved
    };
  });

  report.loadingTest = loadingTestResult;
  report.loadingStatePassed = loadingTestResult.widthLocked && loadingTestResult.hasSpinner && loadingTestResult.revertedSuccessfully;
  console.log('setButtonLoading test passed:', report.loadingStatePassed, loadingTestResult);

  // 2. Multi-viewport Button Audit
  console.log('\n--- 2. Multi-Viewport Responsive & Alignment Audit ---');
  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 768 });

    for (const pageItem of PAGES_TO_TEST) {
      await page.goto(pageItem.url, { waitUntil: 'networkidle2' });

      // If admin, unlock dashboard & navigate to catering
      if (pageItem.isAdmin) {
        await page.evaluate(() => {
          const loginSec = document.getElementById('login-section');
          if (loginSec) loginSec.style.display = 'none';
          const dashSec = document.getElementById('dashboard-section');
          if (dashSec) dashSec.style.display = 'block';

          // Activate Catering
          document.querySelectorAll('.crm-view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
          const cat = document.getElementById('catering-view');
          if (cat) {
            cat.style.display = 'block';
            cat.classList.add('active');
          }
          if (window.switchCateringTab) {
            window.switchCateringTab('catalog');
          }
        });
        await new Promise(r => setTimeout(r, 400));
      }

      const auditData = await page.evaluate((vpWidth, pName) => {
        const buttons = Array.from(document.querySelectorAll('button, a.btn, [role="button"]'));
        const visibleButtons = buttons.filter(b => {
          const rect = b.getBoundingClientRect();
          const style = window.getComputedStyle(b);
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });

        const textOverflows = [];
        const viewportOverflows = [];
        const duplicateIcons = [];

        visibleButtons.forEach(b => {
          const rect = b.getBoundingClientRect();
          const text = b.textContent.trim();

          // Text overflow check
          if (b.scrollWidth > b.clientWidth + 2) {
            textOverflows.push({
              page: pName,
              text: text.substring(0, 30),
              scrollWidth: b.scrollWidth,
              clientWidth: b.clientWidth
            });
          }

          // Viewport overflow check
          if (rect.right > vpWidth + 2) {
            viewportOverflows.push({
              page: pName,
              text: text.substring(0, 30),
              right: Math.round(rect.right),
              vpWidth
            });
          }

          // Duplicate plus icons
          if (/\+\s*\+/.test(text) || (b.querySelectorAll('svg').length > 1 && !text.includes('Waiver'))) {
            duplicateIcons.push({
              page: pName,
              text: text.substring(0, 40),
              svgCount: b.querySelectorAll('svg').length
            });
          }
        });

        return {
          auditedCount: visibleButtons.length,
          textOverflows,
          viewportOverflows,
          duplicateIcons
        };
      }, vp.width, pageItem.name);

      report.totalButtonsAudited += auditData.auditedCount;
      if (auditData.textOverflows.length > 0) report.textOverflowViolations.push(...auditData.textOverflows);
      if (auditData.viewportOverflows.length > 0) report.viewportOverflowViolations.push(...auditData.viewportOverflows);
      if (auditData.duplicateIcons.length > 0) report.duplicateIconViolations.push(...auditData.duplicateIcons);
    }
  }

  // 3. Admin Catalog Tab Screenshots (Dark & Light Mode)
  console.log('\n--- 3. Capturing Admin Catalog Tab in Dark & Light Mode ---');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.querySelectorAll('.crm-view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const cat = document.getElementById('catering-view');
    cat.style.display = 'block';
    cat.classList.add('active');
    window.switchCateringTab('catalog');
    document.documentElement.removeAttribute('data-theme');
  });
  await new Promise(r => setTimeout(r, 600));

  const darkShotPath = path.join(scratchDir, 'admin_catalog_dark_verified.png');
  await page.screenshot({ path: darkShotPath });
  report.screenshotsTaken.push(darkShotPath);
  console.log('Dark mode catalog tab screenshot saved.');

  // Light Mode
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await new Promise(r => setTimeout(r, 600));

  const lightShotPath = path.join(scratchDir, 'admin_catalog_light_verified.png');
  await page.screenshot({ path: lightShotPath });
  report.screenshotsTaken.push(lightShotPath);
  console.log('Light mode catalog tab screenshot saved.');

  // 4. Mobile 375px Catering Builder Screenshots
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:4173/catering.html', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    if (window.openPackageBuilder) window.openPackageBuilder();
  });
  await new Promise(r => setTimeout(r, 600));
  const mobileBuilderShot = path.join(scratchDir, 'catering_builder_375_verified.png');
  await page.screenshot({ path: mobileBuilderShot });
  report.screenshotsTaken.push(mobileBuilderShot);

  await browser.close();

  // Print Summary
  console.log('\n======================================================');
  console.log('       BUTTON AUDIT & VERIFICATION RESULTS            ');
  console.log('======================================================');
  console.log(`Total Buttons Audited across ${VIEWPORTS.length} Viewports: ${report.totalButtonsAudited}`);
  console.log(`Text Overflow Violations: ${report.textOverflowViolations.length}`);
  console.log(`Viewport Overflow Violations: ${report.viewportOverflowViolations.length}`);
  console.log(`Duplicate Icon Violations: ${report.duplicateIconViolations.length}`);
  console.log(`setButtonLoading Passed: ${report.loadingStatePassed}`);
  console.log('======================================================\n');

  fs.writeFileSync(path.join(scratchDir, 'button_verification_report.json'), JSON.stringify(report, null, 2));
}

runVisualTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
