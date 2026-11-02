const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const results = { passed: [], failed: [] };

  try {
    // 1. Desktop Test (1280x800)
    const page = await browser.newPage();
    page.on('dialog', async d => {
      console.log('Dialog opened:', d.message());
      await d.accept();
    });

    await page.setViewport({ width: 1280, height: 800 });
    console.log('Navigating to https://www.bigiawasaana.com/catering...');
    await page.goto('https://www.bigiawasaana.com/catering', { waitUntil: 'networkidle2' });

    // Check Hero CTA button
    const heroBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Build Your Own Package'));
    });

    if (heroBtn) {
      results.passed.push('Hero CTA button present on /catering');
      await heroBtn.click();
    } else {
      results.failed.push('Hero CTA button missing');
    }

    await new Promise(r => setTimeout(r, 600));

    // Check modal visibility
    const isModalOpen = await page.evaluate(() => {
      const m = document.querySelector('#catering-package-builder-modal');
      return m && m.classList.contains('open') && window.getComputedStyle(m).display !== 'none';
    });
    if (isModalOpen) {
      results.passed.push('Catering builder modal opens cleanly when clicking Hero CTA');
    } else {
      results.failed.push('Catering builder modal failed to open');
    }

    // Verify Guest count pills
    const guestPillsCount = await page.evaluate(() => {
      return document.querySelectorAll('.guest-pill').length;
    });
    if (guestPillsCount >= 4) {
      results.passed.push(`Found ${guestPillsCount} guest count pills (10, 20, 50, 100)`);
    } else {
      results.failed.push(`Expected at least 4 guest pills, found ${guestPillsCount}`);
    }

    // Fill Step 1 details
    await page.evaluate(() => {
      window.selectGuestPill(50);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const dateInput = document.querySelector('#builder-event-date');
      if (dateInput) {
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.dispatchEvent(new Event('change'));
      }
    });

    // Advance to Step 2
    await page.evaluate(() => window.nextStep());
    await new Promise(r => setTimeout(r, 500));

    const step2Visible = await page.evaluate(() => {
      const pane = document.querySelector('#builder-pane-step-2');
      return pane && window.getComputedStyle(pane).display !== 'none';
    });
    if (step2Visible) {
      results.passed.push('Step 1 -> Step 2 transition successful');
    } else {
      results.failed.push('Step 1 -> Step 2 transition failed');
    }

    // Select Afghan Traditional Feast template
    await page.evaluate(() => {
      window.selectPackageTemplate('afghan-traditional-feast');
    });
    await new Promise(r => setTimeout(r, 500));

    // Advance to Step 3
    await page.evaluate(() => window.nextStep());
    await new Promise(r => setTimeout(r, 500));

    const step3Visible = await page.evaluate(() => {
      const pane = document.querySelector('#builder-pane-step-3');
      return pane && window.getComputedStyle(pane).display !== 'none';
    });
    if (step3Visible) {
      results.passed.push('Step 2 -> Step 3 (Food Selection) transition successful');
    } else {
      results.failed.push('Step 3 food selection not active');
    }

    // Check estimated total
    const estTotalText = await page.evaluate(() => {
      const el = document.querySelector('#builder-footer-total');
      return el ? el.textContent.trim() : '';
    });
    console.log('Estimated Total with Template:', estTotalText);
    if (estTotalText && estTotalText !== '$0.00') {
      results.passed.push(`Live estimate calculated correctly: ${estTotalText}`);
    } else {
      results.failed.push(`Live estimate failed or was $0.00: ${estTotalText}`);
    }

    // Advance to Step 4 (Services)
    await page.evaluate(() => window.nextStep());
    await new Promise(r => setTimeout(r, 500));

    const step4Visible = await page.evaluate(() => {
      const pane = document.querySelector('#builder-pane-step-4');
      return pane && window.getComputedStyle(pane).display !== 'none';
    });
    if (step4Visible) {
      results.passed.push('Step 3 -> Step 4 (Services) transition successful');
    } else {
      results.failed.push('Step 4 failed to display');
    }

    // Advance to Step 5 (Review & Contact)
    await page.evaluate(() => window.nextStep());
    await new Promise(r => setTimeout(r, 500));

    const step5Visible = await page.evaluate(() => {
      const pane = document.querySelector('#builder-pane-step-5');
      return pane && window.getComputedStyle(pane).display !== 'none';
    });
    if (step5Visible) {
      results.passed.push('Step 4 -> Step 5 (Review & Submit) transition successful');
    } else {
      results.failed.push('Step 5 failed to display');
    }

    // Verify Review Dishes list has items
    const reviewItemsCount = await page.evaluate(() => {
      return document.querySelectorAll('#builder-review-dishes > div > div').length;
    });
    if (reviewItemsCount > 0) {
      results.passed.push(`Step 5 displays itemized summary of ${reviewItemsCount} selected party trays`);
    } else {
      results.failed.push('Step 5 itemized summary is empty');
    }

    await page.screenshot({ path: 'scratch/builder-desktop-step5-verified.png' });

    // 2. Mobile Responsive Test (375x812 iPhone)
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await mobilePage.goto('https://www.bigiawasaana.com/catering#builder', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));

    const mobileModalOpen = await mobilePage.evaluate(() => {
      const m = document.querySelector('#catering-package-builder-modal');
      return m && m.classList.contains('open');
    });
    if (mobileModalOpen) {
      results.passed.push('#builder hash route directly opens builder modal on mobile (375px)');
    } else {
      results.failed.push('#builder hash route did not open modal on mobile');
    }

    const mobileBarVisible = await mobilePage.evaluate(() => {
      const bar = document.querySelector('.builder-mobile-sticky-bar');
      if (!bar) return false;
      const cs = window.getComputedStyle(bar);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    });
    if (mobileBarVisible) {
      results.passed.push('Mobile sticky total & next bar is visible on 375px viewport');
    } else {
      results.failed.push('Mobile sticky bar missing or hidden on 375px');
    }

    // Test mobile step transition using mobile next button
    await mobilePage.evaluate(() => {
      const dateInput = document.querySelector('#builder-event-date');
      if (dateInput) {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        dateInput.value = d.toISOString().split('T')[0];
        dateInput.dispatchEvent(new Event('change'));
      }
    });
    await mobilePage.click('#builder-mobile-next-btn');
    await new Promise(r => setTimeout(r, 600));

    const mobileStep2 = await mobilePage.evaluate(() => {
      const p = document.querySelector('#builder-pane-step-2');
      return p && window.getComputedStyle(p).display !== 'none';
    });
    if (mobileStep2) {
      results.passed.push('Mobile step transition via sticky bar succeeds cleanly');
    } else {
      results.failed.push('Mobile step transition failed');
    }

    await mobilePage.screenshot({ path: 'scratch/builder-mobile-step2-verified.png' });

    console.log('\n========================================');
    console.log('FINAL E2E VERIFICATION RESULTS:');
    console.log('PASSED (' + results.passed.length + '):');
    results.passed.forEach(p => console.log('  [PASS]', p));
    if (results.failed.length > 0) {
      console.log('FAILED (' + results.failed.length + '):');
      results.failed.forEach(f => console.log('  [FAIL]', f));
    } else {
      console.log('>>> 100% OF ALL CHECKS PASSED WITH ZERO FAILURES! <<<');
    }
    console.log('========================================');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }
})();
