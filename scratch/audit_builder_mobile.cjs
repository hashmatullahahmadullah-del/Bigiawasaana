const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('https://www.bigiawasaana.com/catering', { waitUntil: 'networkidle2' });
  
  // Open the builder modal
  await page.evaluate(() => {
    if (typeof window.openPackageBuilder === 'function') {
      window.openPackageBuilder();
    }
  });
  await new Promise(r => setTimeout(r, 600));
  
  const checkOverflow = (stepNum) => {
    const modalBox = document.querySelector('.builder-modal-box');
    const modalContent = document.querySelector('.builder-content-body');
    const docW = document.documentElement.offsetWidth;
    const scrollW = document.documentElement.scrollWidth;
    
    const overflowing = [];
    if (modalBox) {
      modalBox.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > modalBox.getBoundingClientRect().right + 2) {
          overflowing.push({
            tag: el.tagName,
            id: el.id,
            cls: el.className,
            right: Math.round(r.right),
            boxRight: Math.round(modalBox.getBoundingClientRect().right),
            width: Math.round(r.width)
          });
        }
      });
    }
    return {
      stepNum,
      docW,
      scrollW,
      modalBoxW: modalBox ? modalBox.offsetWidth : 0,
      modalContentScrollW: modalContent ? modalContent.scrollWidth : 0,
      modalContentClientW: modalContent ? modalContent.clientWidth : 0,
      overflowingElements: overflowing.slice(0, 8)
    };
  };

  const step1Results = await page.evaluate(checkOverflow, 1);
  console.log('Step 1:', JSON.stringify(step1Results, null, 2));
  await page.screenshot({ path: 'scratch/builder_mobile_step1.png' });

  // Go to step 2
  await page.evaluate(() => window.goToStep(2));
  await new Promise(r => setTimeout(r, 400));
  const step2Results = await page.evaluate(checkOverflow, 2);
  console.log('Step 2:', JSON.stringify(step2Results, null, 2));
  await page.screenshot({ path: 'scratch/builder_mobile_step2.png' });

  // Go to step 3
  await page.evaluate(() => window.goToStep(3));
  await new Promise(r => setTimeout(r, 400));
  const step3Results = await page.evaluate(checkOverflow, 3);
  console.log('Step 3:', JSON.stringify(step3Results, null, 2));
  await page.screenshot({ path: 'scratch/builder_mobile_step3.png' });

  // Go to step 4
  await page.evaluate(() => window.goToStep(4));
  await new Promise(r => setTimeout(r, 400));
  const step4Results = await page.evaluate(checkOverflow, 4);
  console.log('Step 4:', JSON.stringify(step4Results, null, 2));
  await page.screenshot({ path: 'scratch/builder_mobile_step4.png' });

  // Go to step 5
  await page.evaluate(() => window.goToStep(5));
  await new Promise(r => setTimeout(r, 400));
  const step5Results = await page.evaluate(checkOverflow, 5);
  console.log('Step 5:', JSON.stringify(step5Results, null, 2));
  await page.screenshot({ path: 'scratch/builder_mobile_step5.png' });

  await browser.close();
})();
