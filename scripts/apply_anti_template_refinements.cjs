const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = 0;

  for (const { search, replace } of replacements) {
    if (typeof search === 'string') {
      if (content.includes(search)) {
        content = content.split(search).join(replace);
        changed++;
      }
    } else if (search instanceof RegExp) {
      if (search.test(content)) {
        content = content.replace(search, replace);
        changed++;
      }
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${filePath} (${changed} replacement groups applied)`);
  } else {
    console.log(`ℹ️ No changes needed in ${filePath}`);
  }
}

// 1. CATERING.HTML
replaceInFile('catering.html', [
  {
    search: 'Elevate your office lunches with individual lunchboxes or buffet-style catering setups.',
    replace: 'Generous family-style platters and boxed meals prepared fresh for meetings, conferences, and office gatherings.'
  },
  {
    search: '>Submit Inquiry</button>',
    replace: '>Send catering inquiry</button>'
  },
  {
    search: 'BOOK YOUR EVENT',
    replace: 'Catering & Events'
  },
  {
    search: 'PREMIUM HALAL CATERING',
    replace: 'Catering by Bigi Awasaana'
  },
  {
    search: '<span>Get Directions &rarr;</span>',
    replace: '<span>Get directions</span>'
  }
]);

// 2. INDEX.HTML
replaceInFile('index.html', [
  {
    search: 'class="nav-cta-primary">ORDER NOW</a>',
    replace: 'class="nav-cta-primary">Order Online</a>'
  },
  {
    search: '>Welcome to Bigi Awasaana<',
    replace: '>Welcome to Bigi Awasaana<'
  },
  {
    search: '>Order for Pickup<',
    replace: '>Order for pickup<'
  },
  {
    search: 'Or Order Delivery',
    replace: 'Order delivery'
  },
  {
    search: '>OUR STORY<',
    replace: '>Our story<'
  },
  {
    search: 'EXCLUSIVE WEB PROMOTIONS',
    replace: 'Current specials'
  },
  {
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>\r\n          Strict Halal Verification',
    replace: '100% Zabiha Halal'
  },
  {
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>\n          Strict Halal Verification',
    replace: '100% Zabiha Halal'
  },
  {
    search: '>100% HAND-SLAUGHTERED ZABIHA HALAL</h2>',
    replace: '>Hand-slaughtered Zabiha Halal</h2>'
  },
  {
    search: 'Read Our Zabiha Standards &rarr;',
    replace: 'Read our halal standards'
  },
  {
    search: 'Explore 100% Halal Menu',
    replace: 'Explore our menu'
  },
  {
    search: ' style="border-color: var(--accent);"',
    replace: ''
  },
  {
    search: '>ADD</button>',
    replace: '>Add</button>'
  },
  {
    search: 'Read Full Guide &rarr;',
    replace: 'Read guide'
  },
  {
    search: 'Read Guide &rarr;',
    replace: 'Read guide'
  },
  {
    search: '<span>Get Directions &rarr;</span>',
    replace: '<span>Get directions</span>'
  }
]);

// 3. MENU.HTML
replaceInFile('menu.html', [
  {
    search: '>ADD</button>',
    replace: '>Add</button>'
  },
  {
    search: 'Pay with Card →',
    replace: 'Pay with card'
  },
  {
    search: '<span>Get Directions &rarr;</span>',
    replace: '<span>Get directions</span>'
  }
]);

// 4. SHOP.HTML
replaceInFile('shop.html', [
  {
    search: 'Proceed to Checkout &rarr;',
    replace: 'Checkout'
  },
  {
    search: '<span>Get Directions &rarr;</span>',
    replace: '<span>Get directions</span>'
  }
]);

// 5. LOCATIONS.HTML
replaceInFile('locations.html', [
  {
    search: 'View on Google Maps &rarr;',
    replace: 'View on Google Maps'
  },
  {
    search: '<span>Get Directions &rarr;</span>',
    replace: '<span>Get directions</span>'
  }
]);

// 6. FAQ.HTML & SPECIALS.HTML
replaceInFile('faq.html', [
  { search: '<span>Get Directions &rarr;</span>', replace: '<span>Get directions</span>' }
]);
replaceInFile('specials.html', [
  { search: '<span>Get Directions &rarr;</span>', replace: '<span>Get directions</span>' }
]);

// 7. WAIVER.HTML & QUOTE.HTML
replaceInFile('waiver.html', [
  { search: 'Find Agreement &rarr;', replace: 'Find agreement' },
  { search: 'View Details &rarr;', replace: 'View agreement' },
  { search: '<span>Get Directions &rarr;</span>', replace: '<span>Get directions</span>' }
]);
replaceInFile('quote.html', [
  { search: '<span>Get Directions &rarr;</span>', replace: '<span>Get directions</span>' }
]);

// 8. ORDER-HISTORY.HTML
replaceInFile('order-history.html', [
  { search: '← Different phone', replace: 'Different phone number' },
  { search: '<span>Get Directions &rarr;</span>', replace: '<span>Get directions</span>' }
]);

// 9. ADMIN.HTML
replaceInFile('admin.html', [
  {
    search: 'Convert to Formal Quote &rarr;',
    replace: 'Convert to formal quote'
  },
  {
    search: '<button type="button" id="cancel-post-btn" class="crm-btn-icon" style="background: var(--hover-bg); border-radius: 50%;" aria-label="Close dialog">←</button>',
    replace: '<button type="button" id="cancel-post-btn" class="crm-btn-icon" style="background: var(--hover-bg); border-radius: 50%;" aria-label="Close dialog"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>'
  },
  {
    search: 'GENERATE WAIVER LINK &rarr;',
    replace: 'Generate waiver link'
  },
  {
    search: 'GENERATE WAIVER LINK →',
    replace: 'Generate waiver link'
  }
]);

// 9b. LOCATIONS.HTML
replaceInFile('locations.html', [
  { search: 'Get Directions →', replace: 'Get directions' },
  { search: 'Get Directions &rarr;', replace: 'Get directions' },
  {
    search: 'Open <span class="hero-days-display">Every Day</span><br><span style="color: var(--gray);" class="hero-hours-display">12:00 PM – 10:30 PM</span>',
    replace: '<span class="hero-days-display">Monday to Saturday</span><br><span style="color: var(--gray);" class="hero-hours-display">01:00 PM – 10:30 PM</span><br><span style="color: #ef4444; font-size: 13px; font-weight: 600;">Sunday: Closed</span>'
  }
]);

// 10. SRC/MAIN.JS
replaceInFile('src/main.js', [
  {
    search: "checkoutBtn.textContent = 'PROCEED TO CHECKOUT →';",
    replace: "checkoutBtn.textContent = 'Checkout';"
  },
  {
    search: '<span class="claim-arrow">→</span>',
    replace: ''
  }
]);

console.log('\n--- Anti-Template Text & Icon Refinements Done ---');

// Standardize remaining pages nav
const otherPages = ['catering.html', 'menu.html', 'shop.html', 'locations.html', 'faq.html', 'specials.html', 'order-history.html', 'blog.html'];
for (const p of otherPages) {
  replaceInFile(p, [
    { search: 'class="nav-cta-primary">ORDER NOW</a>', replace: 'class="nav-cta-primary">Order Online</a>' },
    { search: '<span>Get Directions &rarr;</span>', replace: '<span>Get directions</span>' }
  ]);
}
