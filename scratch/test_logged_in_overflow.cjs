const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  await page.goto('http://localhost:4173/admin.html', { waitUntil: 'networkidle2' });

  // Simulate authenticated state
  const report = await page.evaluate(() => {
    // Hide login, show dashboard
    document.getElementById('login-section').style.display = 'none';
    const dash = document.getElementById('dashboard-section');
    dash.style.display = 'block';

    // Activate catering view
    document.querySelectorAll('.crm-view').forEach(v => {
      v.classList.remove('active');
      v.style.display = 'none';
    });
    const catView = document.getElementById('catering-view') || document.getElementById('view-catering');
    if (catView) {
      catView.classList.add('active');
      catView.style.display = 'block';
    }

    // Activate Quotes tab
    if (window.switchCateringTab) {
      window.switchCateringTab('quotes');
    } else {
      const qTab = document.getElementById('cat-tab-quotes');
      if (qTab) qTab.style.display = 'block';
    }

    // Now find every element whose right edge > 375 or scrollWidth > 375
    const docWidth = window.innerWidth;
    const items = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1 || el.scrollWidth > docWidth + 1) {
        items.push({
          tag: el.tagName,
          id: el.id,
          class: el.className,
          rectRight: Math.round(rect.right),
          rectWidth: Math.round(rect.width),
          scrollWidth: el.scrollWidth,
          parent: el.parentElement ? `${el.parentElement.tagName}#${el.parentElement.id}.${el.parentElement.className}` : null
        });
      }
    });

    return {
      windowWidth: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      dashScrollWidth: dash.scrollWidth,
      items: items.slice(0, 30)
    };
  });

  console.log('Report when Logged In at 375px:');
  console.log('windowWidth:', report.windowWidth);
  console.log('docScrollWidth:', report.docScrollWidth);
  console.log('bodyScrollWidth:', report.bodyScrollWidth);
  console.log('dashScrollWidth:', report.dashScrollWidth);
  console.log('Items pushing width:', report.items.length);
  report.items.forEach((item, idx) => {
    console.log(`[${idx}] <${item.tag} id="${item.id}" class="${item.class}"> right:${item.rectRight} width:${item.rectWidth} scrollW:${item.scrollWidth} parent:${item.parent}`);
  });

  await page.screenshot({ path: 'scratch/admin_catering_mobile_live.png' });
  await browser.close();
}

test().catch(console.error);
