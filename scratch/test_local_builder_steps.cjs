const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to http://localhost:4173/catering...');
  await page.goto('http://localhost:4173/catering', { waitUntil: 'networkidle2' });

  // Open builder
  await page.evaluate(() => window.openPackageBuilder(50));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/local_builder_step1.png' });
  console.log('Saved step 1');

  // Next to Step 2
  await page.evaluate(() => window.nextStep());
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/local_builder_step2.png' });
  console.log('Saved step 2');

  // Select first template
  await page.evaluate(() => {
    const firstTpl = document.querySelector('.template-card');
    if (firstTpl) firstTpl.click();
    else window.selectPackageType('custom_scratch');
  });
  await new Promise(r => setTimeout(r, 600));

  // Next to Step 3
  await page.evaluate(() => window.nextStep());
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/local_builder_step3.png' });
  console.log('Saved step 3');

  // Next to Step 4
  await page.evaluate(() => window.nextStep());
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/local_builder_step4.png' });
  console.log('Saved step 4');

  // Next to Step 5
  await page.evaluate(() => window.nextStep());
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/local_builder_step5.png' });
  console.log('Saved step 5');

  await browser.close();
})();
