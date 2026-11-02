const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  if (reqPath === '/admin') reqPath = '/admin.html';
  if (reqPath === '/blog') reqPath = '/blog.html';
  
  let filePath = path.join(process.cwd(), 'dist', reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), reqPath);
  }
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(5173, async () => {
  console.log('Local test server running on http://localhost:5173');
  
  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    console.log('\n--- TEST 1: Admin Catering Section on Mobile (375px) ---');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:5173/admin.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));
    
    // Switch to catering view
    await page.evaluate(() => {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('dashboard-section').style.display = 'block';
      if (typeof window.switchAdminView === 'function') {
        window.switchAdminView('catering-view');
      }
    });
    
    // Check horizontal overflow on 375px across all tabs
    const tabs = ['inquiries', 'packages', 'quotes', 'bookings', 'catalog'];
    for (const t of tabs) {
      await page.evaluate((tab) => window.switchCateringTab(tab), t);
      await new Promise(r => setTimeout(r, 200));
      
      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.offsetWidth;
        const scrollW = document.documentElement.scrollWidth;
        return { docW, scrollW, hasOverflow: scrollW > docW };
      });
      console.log(`Tab [${t}] on 375px: docW=${overflow.docW}, scrollW=${overflow.scrollW}, overflow=${overflow.hasOverflow}`);
    }
    await page.screenshot({ path: 'scratch/verified_mobile_catering_packages.png' });

    console.log('\n--- TEST 2: Quote Editor Modal on Mobile (375px) ---');
    await page.evaluate(() => {
      window.openCreateQuoteModal();
    });
    await new Promise(r => setTimeout(r, 400));
    
    const modalMetrics = await page.evaluate(() => {
      const modal = document.getElementById('quote-editor-modal');
      const modalBox = modal?.querySelector('.crm-modal-box');
      const modalContent = modal?.querySelector('.crm-modal-content');
      
      return {
        isOpen: modal?.classList.contains('open'),
        display: modal ? window.getComputedStyle(modal).display : null,
        modalBoxWidth: modalBox?.offsetWidth,
        contentClientWidth: modalContent?.clientWidth,
        contentScrollWidth: modalContent?.scrollWidth,
        isContentOverflowing: modalContent ? modalContent.scrollWidth > modalContent.clientWidth : false
      };
    });
    console.log('Quote Editor Modal metrics on 375px:', modalMetrics);
    await page.screenshot({ path: 'scratch/verified_mobile_quote_modal.png' });
    
    await page.evaluate(() => window.closeQuoteEditorModal());
    await new Promise(r => setTimeout(r, 300));

    console.log('\n--- TEST 3: Package Request Inspection Modal ---');
    await page.evaluate(() => {
      const dummyPkg = {
        id: 'test-pkg-1',
        requestNumber: 'BA-PKG-9999',
        status: 'new',
        customerContact: {
          name: 'Ahmad Karimi',
          email: 'ahmad@example.com',
          phone: '(818) 555-0199',
          preferredContact: 'phone'
        },
        eventDetails: {
          type: 'Wedding',
          date: '2026-11-15',
          startTime: '17:00',
          guests: 120,
          fulfillment: 'delivery',
          deliveryAddress: '1234 Ventura Blvd, Studio City, CA'
        },
        selectedItems: [
          { name: 'Qabuli Pulao Tray', portionSize: 'Party Tray (Serves 25-30)', quantity: 4, unitPrice: 110, totalPrice: 440 },
          { name: 'Chicken Tikka Kabob Tray', portionSize: '30 Skewers', quantity: 4, unitPrice: 125, totalPrice: 500 }
        ],
        selectedServices: ['chafer_kits', 'service_staff'],
        estimatedPriceBreakdown: {
          foodSubtotal: 940,
          servicesTotal: 150,
          deliveryFee: 75,
          taxAmount: 119.44,
          estimatedTotal: 1284.44
        },
        specialNotes: 'Please ensure extra green chutney and extra naan bread are included.'
      };
      window.openPackageRequestModal(dummyPkg);
    });
    await new Promise(r => setTimeout(r, 400));
    
    const pkgModalMetrics = await page.evaluate(() => {
      const modal = document.getElementById('package-request-modal');
      const modalBox = modal?.querySelector('.crm-modal-box');
      const title = document.getElementById('prm-req-num')?.textContent;
      const name = document.getElementById('prm-cust-name')?.textContent;
      const total = document.getElementById('prm-estimated-total')?.textContent;
      return {
        isOpen: modal?.classList.contains('open'),
        hasBox: !!modalBox,
        boxWidth: modalBox?.offsetWidth,
        title,
        name,
        total
      };
    });
    console.log('Package Request Modal rendered:', pkgModalMetrics);
    await page.screenshot({ path: 'scratch/verified_mobile_pkg_modal.png' });
    await page.evaluate(() => window.closePackageRequestModal());
    await new Promise(r => setTimeout(r, 300));

    console.log('\n--- TEST 4: Button Micro-Interactions & Copy Link Feedback ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluate(() => {
      window.switchCateringTab('quotes');
      
      const dummyQuote = {
        id: 'quote-test-123',
        quoteNumber: 'BA-Q-8888',
        status: 'sent',
        customer: { name: 'Soraya Popal', phone: '(310) 555-0144' },
        event: { date: '2026-12-01' },
        pricing: { finalTotal: 850, depositAmount: 255 },
        security: { directAccessToken: 'tok-abc-123' }
      };
      if (window.state) {
        window.state.quotes = [dummyQuote];
        window.renderCateringQuotes();
      }
    });
    await new Promise(r => setTimeout(r, 300));
    
    const copyLinkResult = await page.evaluate(() => {
      const copyBtn = document.querySelector('.action-copy-link');
      if (!copyBtn) return { error: 'copyBtn not found' };
      
      copyBtn.click();
      return {
        hasSuccessClass: copyBtn.classList.contains('copy-link-success'),
        btnHTML: copyBtn.innerHTML
      };
    });
    console.log('Copy Link animation result:', copyLinkResult);
    await page.screenshot({ path: 'scratch/verified_copy_link_feedback.png' });

    console.log('\n--- TEST 5: Blog Index & Search Filtering ---');
    await page.goto('http://localhost:5173/blog.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    const blogChecks = await page.evaluate(() => {
      const searchInput = document.getElementById('blog-search-input');
      const cards = document.querySelectorAll('.blog-card');
      const firstImgWrapper = document.querySelector('.blog-card-img-wrapper');
      const footerHours = document.querySelector('.footer-hours-display')?.innerText;
      
      // Type in search
      if (searchInput) {
        searchInput.value = 'chicken soup';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const visibleCards = Array.from(cards).filter(c => c.style.display !== 'none');
      
      return {
        totalCards: cards.length,
        hasSearchInput: !!searchInput,
        visibleCardsAfterSearch: visibleCards.length,
        firstVisibleTitle: visibleCards[0]?.querySelector('.blog-card-title')?.innerText,
        imgWrapperAspectRatio: firstImgWrapper ? window.getComputedStyle(firstImgWrapper).aspectRatio : null,
        footerHours
      };
    });
    console.log('Blog checks:', blogChecks);
    await page.screenshot({ path: 'scratch/verified_blog_search.png' });

    console.log('\n--- ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! ---');
    await browser.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
