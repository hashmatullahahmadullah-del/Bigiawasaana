const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('https://bigi-awasaana-7b3ce.web.app/menu', { waitUntil: 'networkidle2' });

  // Inject the CSS fix
  await page.addStyleTag({
    content: `
      @media (max-width: 767px) {
        .item-modal {
          max-height: 88vh !important;
          height: 88vh !important;
        }
        .item-modal-left {
          min-height: 150px !important;
          height: 150px !important;
          flex-shrink: 0 !important;
          flex: none !important;
        }
        .item-modal-right {
          flex: 1 !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        .item-modal-scrollable {
          flex: 1 !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          padding: 16px 20px !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .item-modal-footer {
          flex-shrink: 0 !important;
          padding: 12px 16px !important;
        }
      }
    `
  });

  // Open modal
  await page.evaluate(() => {
    const card = document.querySelector('.menu-card');
    if (card) {
      const btn = card.querySelector('.add-to-cart-btn') || card;
      btn.click();
    }
  });

  await new Promise(r => setTimeout(r, 600));

  const result = await page.evaluate(() => {
    const modal = document.querySelector('.item-modal');
    const btn = document.querySelector('#item-modal-add-btn');
    const scrollable = document.querySelector('.item-modal-scrollable');
    const mR = modal.getBoundingClientRect();
    const bR = btn.getBoundingClientRect();
    return {
      modalBottom: Math.round(mR.bottom),
      addBtnBottom: Math.round(bR.bottom),
      addBtnTop: Math.round(bR.top),
      isAddBtnInsideModal: bR.bottom <= mR.bottom && bR.top >= mR.top,
      scrollableHeight: Math.round(scrollable.getBoundingClientRect().height)
    };
  });

  console.log('Result with fix:', result);
  await page.screenshot({ path: 'scratch/fixed_modal_mobile.png' });

  await browser.close();
})();
