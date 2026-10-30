function safeWriteFileSync(filePath, content) {
  let attempts = 5;
  while (attempts > 0) {
    try {
      fs.writeFileSync(filePath, content);
      return;
    } catch (err) {
      attempts--;
      if (attempts === 0) throw err;
      const end = Date.now() + 150;
      while (Date.now() < end) {}
    }
  }
}
import fs from 'fs';
import path from 'path';

// The 10 closest service areas kept per technical audit
const areas = {
  'reseda': {
    name: 'Reseda',
    tier: 1,
    distance: '0 minutes (Local Flagship)',
    landmark: 'Reseda Park',
    blog: '/blog/zabiha-halal-food-reseda-san-fernando-valley',
    blogTitle: 'Zabiha Halal in Reseda: The SFV Destination',
    customHero: 'Your neighborhood destination in Reseda for premium Halal Kabobs and Afghan Street Food.',
    customStory: 'As proud members of the Reseda community, our flagship kitchen at 18411 Victory Blvd is the heart of Bigi Awasaana. We don\'t just serve the valley; we are a local Reseda establishment dedicated to bringing 100% Zabiha Halal, authentic Afghan cuisine right to your table. Whether you are walking in for a fresh Bolani or ordering delivery down the street, you get the absolute freshest, coal-fired kabobs in town.'
  },
  'tarzana': {
    name: 'Tarzana',
    tier: 1,
    distance: '5 minutes',
    landmark: 'Ventura Boulevard',
    blog: '/blog/halal-smash-burger-reseda-tarzana',
    blogTitle: 'Halal Smash Burger in Reseda & Tarzana',
    customHero: 'Your local Tarzana destination for premium Halal Kabobs and Afghan Street Food.',
    customStory: 'Located right next door to Tarzana, our Reseda kitchen at Victory & Reseda Blvd is perfectly positioned to serve you lightning-fast delivery. We are the premier Afghan charcoal grill and smash burger trailer for Tarzana residents who demand fresh, authentic, and 100% hand-slaughtered Halal meals for their families.'
  },
  'winnetka': {
    name: 'Winnetka',
    tier: 2,
    distance: '5-8 minutes',
    landmark: 'Winnetka Recreation Center',
    blog: '/blog/best-late-night-halal-food-san-fernando-valley',
    blogTitle: 'Late Night Halal Food in Reseda & SFV'
  },
  'lake-balboa': {
    name: 'Lake Balboa',
    tier: 2,
    distance: '5-8 minutes',
    landmark: 'Lake Balboa Park & Sepulveda Basin',
    blog: '/blog/complete-guide-to-afghan-food-los-angeles',
    blogTitle: 'The Complete Guide to Authentic Afghan Food in Los Angeles'
  },
  'northridge': {
    name: 'Northridge',
    tier: 2,
    distance: '8-12 minutes',
    landmark: 'CSUN & Northridge Fashion Center',
    blog: '/blog/complete-guide-to-afghan-food-los-angeles',
    blogTitle: 'The Complete Guide to Authentic Afghan Food in Los Angeles'
  },
  'canoga-park': {
    name: 'Canoga Park',
    tier: 2,
    distance: '10-12 minutes',
    landmark: 'Topanga Mall & Sherman Way',
    blog: '/blog/what-is-bolani-afghan-street-food',
    blogTitle: 'What Is Bolani? Afghan Flatbread Guide'
  },
  'west-hills': {
    name: 'West Hills',
    tier: 2,
    distance: '12-15 minutes',
    landmark: 'Fallbrook Center',
    blog: '/blog/art-of-afghan-charcoal-kabobs-reseda',
    blogTitle: 'The Art of Afghan Charcoal Kabobs in Reseda'
  },
  'van-nuys': {
    name: 'Van Nuys',
    tier: 2,
    distance: '10-14 minutes',
    landmark: 'Van Nuys Civic Center',
    blog: '/blog/authentic-qabuli-palao-los-angeles',
    blogTitle: 'Authentic Qabuli Palao in Los Angeles'
  },
  'encino': {
    name: 'Encino',
    tier: 1,
    distance: '8-12 minutes',
    landmark: 'Encino Commons on Ventura Blvd',
    blog: '/blog/best-halal-catering-los-angeles-weddings-events',
    blogTitle: 'Halal Catering in Los Angeles & SFV',
    customHero: 'Elevate your Encino dining experience with the finest Halal Afghan cuisine in the valley.',
    customStory: 'Whether you are returning from a day at the Sepulveda Basin or looking for a premium dinner near Ventura Blvd, Bigi Awasaana provides a culinary escape to the Silk Road. We know Encino residents appreciate high-quality, authentic food, which is why our 100% Zabiha Halal kabobs are always cooked fresh over open coals.'
  },
  'woodland-hills': {
    name: 'Woodland Hills',
    tier: 1,
    distance: '10-14 minutes',
    landmark: 'Warner Center',
    blog: '/blog/chapli-kabab-vs-shami-kabab-guide',
    blogTitle: 'Chapli Kabab vs. Shami Kabab Guide',
    customHero: 'Experience the bold, traditional flavors of Afghanistan in Woodland Hills.',
    customStory: 'From the bustling offices of Warner Center to family homes across Woodland Hills, Bigi Awasaana is the top choice for authentic, Zabiha Halal Afghan food. Our chefs bring three generations of culinary expertise to every dish, ensuring your delivery or catering order is nothing short of spectacular.'
  }
};

// 11 dropped areas that are 301 redirected
const droppedAreas = [
  'calabasas', 'chatsworth', 'granada-hills', 'mission-hills', 'north-hills',
  'north-hollywood', 'porter-ranch', 'sherman-oaks', 'studio-city', 'sun-valley', 'sylmar'
];

// Clean up any old static files for dropped areas so redirects work cleanly
for (const dropped of droppedAreas) {
  const dirs = [
    path.join(process.cwd(), 'areas', `${dropped}.html`),
    path.join(process.cwd(), 'public', 'areas', `${dropped}.html`),
    path.join(process.cwd(), 'dist', 'areas', `${dropped}.html`)
  ];
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      try {
        fs.unlinkSync(d);
        console.log(`Cleaned up dropped area file: ${d}`);
      } catch (e) {}
    }
  }
}

const phrases = {
  intros: [
    "Are you searching for authentic, mouth-watering Halal food near {CITY}? ",
    "Craving the bold, traditional flavors of the Silk Road in {CITY}? ",
    "When residents of {CITY} want incredible, coal-fired kabobs, they turn to Bigi Awasaana. "
  ],
  mid: [
    "Located just {DISTANCE} away from {LANDMARK}, our kitchen in Reseda is perfectly positioned to serve you. ",
    "We are proud to serve the {CITY} community with recipes perfected over three generations. ",
    "Our chefs bring the night markets of Kabul right to {CITY} with our specialized delivery and catering services. "
  ],
  bakeryIntro: [
    "Unlike standard restaurants, we operate a full-service Afghan bakery in-house. ",
    "The secret to our legendary food is our bread. We bake our Afghan flatbreads fresh every single day. ",
    "Our in-house bakery ensures that every meal delivered to {CITY} comes with piping hot, oven-fresh bread. "
  ],
  bakeryMid: [
    "Our crispy, potato and leek stuffed Bolani is a favorite across {CITY}. ",
    "Whether you order our Chapli Kabobs or our Smash Burgers, you'll taste the difference our fresh bakery makes. ",
    "From sweet Afghan desserts to our savory signature flatbreads, everything is made from scratch."
  ]
};

function getRandom(arr, cityId) {
  const index = (cityId.length + cityId.charCodeAt(0)) % arr.length;
  return arr[index];
}

const templatePath = path.join(process.cwd(), 'area-template.html');
const outDir = path.join(process.cwd(), 'dist', 'areas');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
let template = fs.readFileSync(templatePath, 'utf8');

let count = 0;
for (const [id, data] of Object.entries(areas)) {
  const title = `Best Halal Afghan Food & Kabobs in ${data.name} | Bigi Awasaana`;
  const description = `Looking for the best authentic Halal Afghan food in ${data.name}? Bigi Awasaana delivers fresh coal-fired kabobs, bolani, and Afghan bakery items. Order online!`;
  
  let heroText = data.tier === 1 ? data.customHero : `FRESH AFGHAN FOOD IN ${data.name.toUpperCase()}`;
  let storyText = data.tier === 1 ? data.customStory : 
    (getRandom(phrases.intros, id).replace('{CITY}', data.name) + 
     getRandom(phrases.mid, id).replace('{CITY}', data.name).replace('{LANDMARK}', data.landmark).replace('{DISTANCE}', data.distance) +
     "We are a 100% Zabiha Halal restaurant committed to quality and tradition.");

  let bakeryText = getRandom(phrases.bakeryIntro, id).replace('{CITY}', data.name) + 
                   getRandom(phrases.bakeryMid, id).replace('{CITY}', data.name);
                   
  let burgerText = `Looking for the best Halal Smash Burger in ${data.name}? Our famous Bigi's Smash Burger is made with 100% Zabiha Halal beef, smashed thin on a screaming-hot griddle for perfect crispy, lacey edges. Stacked with melted cheese, fresh veggies, and our house sauce, it's the ultimate Halal burger experience near ${data.landmark}.`;

  const content = `
    <style>
      .area-hero {
        position: relative;
        padding: clamp(100px, 20vw, 160px) 0;
        overflow: hidden;
        background: url('/hero-food-spread.webp') center/cover no-repeat;
      }
      .area-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(17,17,17,0.7) 0%, rgba(17,17,17,0.95) 100%);
      }
      .area-hero-content {
        position: relative;
        z-index: 2;
      }
      
      .story-section {
        padding: clamp(60px, 10vw, 96px) 0;
        background: var(--bg);
      }
      .story-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 48px;
        align-items: center;
      }
      @media (min-width: 900px) {
        .story-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
      .story-img-container {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      .story-img-container img {
        width: 100%;
        height: auto;
        display: block;
        transition: transform 0.5s ease;
      }
      .story-img-container:hover img {
        transform: scale(1.05);
      }
      
      .highlights-section {
        padding: clamp(60px, 10vw, 96px) 0;
        background: #151515;
      }
      
      .glass-card {
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 40px 32px;
        transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.4s ease, border-color 0.4s ease;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .glass-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 40px rgba(255, 69, 0, 0.08);
        border: 1px solid rgba(255, 69, 0, 0.2);
      }
      .glass-card-icon {
        font-size: 40px;
        margin-bottom: 24px;
        display: inline-block;
      }
      .glass-card h2 {
        color: var(--accent);
        font-family: 'Barlow Condensed';
        font-size: 28px;
        margin-bottom: 16px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
      }
      
      .faq-section {
        padding: clamp(60px, 10vw, 96px) 0;
        background: var(--bg);
      }
      
      details.faq-item {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        margin-bottom: 16px;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      details.faq-item[open] {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 69, 0, 0.2);
      }
      summary.faq-summary {
        padding: 24px;
        cursor: pointer;
        font-family: 'Barlow Condensed';
        font-size: 20px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--white);
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      }
      summary.faq-summary::-webkit-details-marker {
        display: none;
      }
      summary.faq-summary::after {
        content: '+';
        font-size: 24px;
        color: var(--accent);
        transition: transform 0.3s ease;
      }
      details.faq-item[open] summary.faq-summary::after {
        content: '−';
      }
      .faq-content {
        padding: 0 24px 24px 24px;
        color: var(--gray);
        font-size: 16px;
        line-height: 1.7;
      }
      
      .cta-section {
        padding: clamp(60px, 10vw, 96px) 0;
        background: var(--bg);
        text-align: center;
        border-top: 1px solid rgba(255,255,255,0.05);
      }
      
      .reveal-animate {
        opacity: 0;
        transform: translateY(30px);
        animation: fadeInUp 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
      }
      .delay-1 { animation-delay: 0.1s; }
      .delay-2 { animation-delay: 0.2s; }
      .delay-3 { animation-delay: 0.3s; }
      @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
    </style>

    <!-- 1. Hero Section -->
    <section class="area-hero">
      <div class="container text-center-mobile area-hero-content">
        <div class="reveal-animate" style="font-family: 'Barlow Condensed'; font-size: 16px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; font-weight: 700;">YOUR LOCAL AFGHAN RESTAURANT</div>
        <h1 class="font-lalezar reveal-animate delay-1" style="font-size: clamp(40px, 6vw, 64px); margin-bottom: 24px; line-height: 1.1; text-shadow: 0 10px 30px rgba(0,0,0,0.5);">${heroText}</h1>
        
        <div class="reveal-animate delay-3" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-top: 48px;">
          <a href="/menu" class="btn-primary" style="text-decoration: none; padding: 18px 48px; font-size: 18px; border-radius: 100px; box-shadow: 0 10px 20px rgba(255,69,0,0.2); transition: transform 0.2s ease, box-shadow 0.2s ease;">Order Online Now</a>
          <a href="https://maps.app.goo.gl/HRWCNVDR8fsv5jzv8" target="_blank" rel="noopener" class="btn-outline" style="text-decoration: none; padding: 18px 48px; font-size: 18px; border-radius: 100px;">Get Directions</a>
        </div>
      </div>
    </section>
    
    <!-- 2. Deals & Special Combos Section -->
    <section class="deals-section py-xl" id="deals-section" style="padding: clamp(48px, 8vw, 72px) 0; background: #0e0e10; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06);">
      <div class="container">
        <div class="text-center-mobile reveal-animate" style="text-align: center; margin-bottom: 36px;">
          <div style="font-family: 'Barlow Condensed'; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; font-weight: 700;">EXCLUSIVE ONLINE SPECIALS</div>
          <h2 style="font-family: 'Barlow Condensed'; font-size: clamp(32px, 5vw, 44px); text-transform: uppercase; color: var(--white); margin: 0 0 10px 0;">Special Offers &amp; Combos for ${data.name}</h2>
          <p style="color: var(--gray); font-size: 16px; max-width: 580px; margin: 0 auto;">Claim our exclusive chef combos online. 100% Zabiha Halal charcoal-grilled kabobs with complimentary drinks and sides.</p>
        </div>
        <div id="deals-grid" class="deals-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; max-width: 900px; margin: 0 auto;"></div>
      </div>
    </section>

    <!-- 3. Story Section -->
    <section class="story-section">
      <div class="container">
        <div class="story-grid">
          <div class="reveal-animate delay-1">
            <h2 style="font-family: 'Barlow Condensed'; font-size: 40px; text-transform: uppercase; color: var(--white); margin-bottom: 24px;">Authentic Flavors, Delivered to ${data.name}</h2>
            <p style="font-size: 18px; color: var(--gray); line-height: 1.8; margin-bottom: 24px;">
              ${storyText}
            </p>
            
            <!-- Local Guide Link -->
            <div style="background: rgba(255, 106, 0, 0.08); border: 1px solid var(--accent); border-radius: 8px; padding: 20px; margin-top: 24px;">
              <div style="font-family: 'Barlow Condensed'; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent); font-weight: 700; margin-bottom: 6px;">LOCAL DINING GUIDE</div>
              <h3 style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 20px; margin: 0 0 8px 0;"><a href="${data.blog}" style="color: var(--white); text-decoration: none;">${data.blogTitle}</a></h3>
              <p style="color: var(--gray); font-size: 14px; line-height: 1.5; margin: 0 0 12px 0;">Read our complete guide to charcoal grilling techniques, 100% Zabiha Halal standards, and authentic dishes in the San Fernando Valley.</p>
              <a href="${data.blog}" style="color: var(--accent); font-weight: 600; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Read Full Guide &rarr;</a>
            </div>
          </div>
          <div class="story-img-container reveal-animate delay-2">
            <img src="/halal-afghan-restaurant-reseda.webp" alt="Authentic 100% Zabiha Halal Afghan Street Food &amp; Charcoal Grills in ${data.name}" loading="lazy">
          </div>
        </div>
      </div>
    </section>
    
    <!-- 4. Menu Highlights Section -->
    <section class="highlights-section">
      <div class="container">
        <div class="text-center-mobile reveal-animate" style="margin-bottom: 64px;">
          <h2 style="font-family: 'Barlow Condensed'; font-size: 48px; text-transform: uppercase; color: var(--white); margin-bottom: 16px;">Why ${data.name} Loves Us</h2>
          <p style="color: var(--gray); font-size: 20px; max-width: 600px; margin: 0 auto;">Everything is made from scratch, baked fresh, and grilled to order.</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px;">
          <!-- Bakery Section -->
          <div class="glass-card reveal-animate delay-1">
            <div class="glass-card-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10a4 4 0 0 1-8 0V2"/><path d="M11 2v4"/><path d="M15 14v8"/><path d="M7 14v8"/></svg></div>
            <h2>Fresh Afghan Bakery</h2>
            <p style="margin: 0; line-height: 1.7; color: var(--gray); flex: 1;">${bakeryText}</p>
          </div>
          
          <!-- Halal Smash Burger Section -->
          <div class="glass-card reveal-animate delay-2">
            <div class="glass-card-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg></div>
            <h2>The Smash Burger</h2>
            <p style="margin: 0; line-height: 1.7; color: var(--gray); flex: 1;">${burgerText}</p>
          </div>
          
          <!-- Delivery & Catering Section -->
          <div class="glass-card reveal-animate delay-3">
            <div class="glass-card-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
            <h2>Delivery &amp; Catering</h2>
            <p style="margin: 0; line-height: 1.7; color: var(--gray); flex: 1;">We know you don't want to wait when you're hungry. We offer fast delivery to ${data.name} (typically ${data.distance} drive from our kitchen). Planning an event near ${data.landmark}? We provide premium Halal catering trays for corporate events, weddings, and family gatherings.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. Local FAQ Section -->
    <section class="faq-section">
      <div class="container" style="max-width: 800px;">
        <h2 class="reveal-animate" style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 40px; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Frequently Asked Questions in ${data.name}</h2>
        
        <div class="reveal-animate delay-1">
          <details class="faq-item">
            <summary class="faq-summary">Is your meat 100% Halal?</summary>
            <div class="faq-content">
              Yes, all of our meat, including our beef, chicken, and lamb, is strictly 100% hand-slaughtered Zabiha Halal. We are proud to be a trusted Halal source for the ${data.name} community.
            </div>
          </details>
          
          <details class="faq-item">
            <summary class="faq-summary">Do you deliver to ${data.name}?</summary>
            <div class="faq-content">
              Yes! We deliver our fresh kabobs and bakery items directly to ${data.name}. You can order directly through our website or via Uber Eats and DoorDash.
            </div>
          </details>
          
          <details class="faq-item">
            <summary class="faq-summary">What is your most popular dish?</summary>
            <div class="faq-content">
              Our Chapli Kabob, Saffron Qabuli Palau, and fresh-baked Bolani are massive hits across ${data.name} and the San Fernando Valley.
            </div>
          </details>
          
          <details class="faq-item">
            <summary class="faq-summary">Do you serve Halal Smash Burgers?</summary>
            <div class="faq-content">
              Yes! Our Bigi's Smash Burger is completely Zabiha Halal, featuring a crispy-edged beef patty, melted cheese, and house sauce, served fresh to the ${data.name} area.
            </div>
          </details>
        </div>
      </div>
    </section>
    
    <!-- 6. CTA Section -->
    <section class="cta-section">
      <div class="container text-center-mobile reveal-animate">
        <h2 style="font-family: 'Barlow Condensed'; font-size: 48px; text-transform: uppercase; color: var(--white); margin-bottom: 16px;">Hungry yet?</h2>
        <p style="color: var(--gray); font-size: 20px; max-width: 600px; margin: 0 auto 40px auto;">Experience the best Halal food in the valley today. Pick up in Reseda or get it delivered to ${data.name}.</p>
        <a href="/menu" class="btn-primary" style="text-decoration: none; padding: 18px 48px; font-size: 18px; border-radius: 100px; box-shadow: 0 10px 20px rgba(255,69,0,0.2);">View Full Menu</a>
      </div>
    </section>
  `;

  const schema = `
    <script type="application/ld+json">
    [
      {
        "@context": "https://schema.org",
        "@type": ["Restaurant", "FoodEstablishment"],
        "name": "Bigi Awasaana",
        "description": "Authentic Afghan street food and charcoal grill. Coal-fired kabobs, bolani, and saffron rice platters. 100% Zabiha Halal.",
        "url": "https://www.bigiawasaana.com",
        "image": "https://www.bigiawasaana.com/halal-afghan-restaurant-reseda.webp",
        "logo": "https://www.bigiawasaana.com/logo.webp",
        "telephone": "+13239211646",
        "servesCuisine": ["Afghan", "Middle Eastern", "Halal"],
        "priceRange": "$$",
        "hasMenu": "https://www.bigiawasaana.com/menu",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "18411 Victory Blvd",
          "addressLocality": "Reseda",
          "addressRegion": "CA",
          "postalCode": "91335",
          "addressCountry": "US"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 34.1866938,
          "longitude": -118.5331266
        },
        "areaServed": {
          "@type": "City",
          "name": "${data.name}"
        },
        "openingHoursSpecification": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
          "opens": "13:00",
          "closes": "22:30"
        },
        "foundingDate": "2012",
        "founder": {
          "@type": "Person",
          "name": "Ahmadullah Hashmatullah"
        },
        "knowsAbout": ["Zabiha Halal", "Afghan Cuisine", "Coal-Fired Kabobs", "Silk Road Spices"],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "142"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is your meat 100% Halal in ${data.name}?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, all of our meat is strictly 100% hand-slaughtered Zabiha Halal. We are a trusted Halal source for the ${data.name} community."
            }
          },
          {
            "@type": "Question",
            "name": "Do you deliver to ${data.name}?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! We deliver our fresh kabobs and bakery items directly to ${data.name} via our website, Uber Eats, and DoorDash."
            }
          },
          {
            "@type": "Question",
            "name": "Do you serve Halal Smash Burgers in ${data.name}?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! Our Bigi's Smash Burger is completely Zabiha Halal, featuring a crispy-edged beef patty, melted cheese, and house sauce, served fresh to the ${data.name} area."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bigiawasaana.com/" },
          { "@type": "ListItem", "position": 2, "name": "Locations", "item": "https://www.bigiawasaana.com/locations" },
          { "@type": "ListItem", "position": 3, "name": "Halal Food in ${data.name}", "item": "https://www.bigiawasaana.com/areas/${id}" }
        ]
      }
    ]
    </script>
  `;

  let html = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{META_DESC}}/g, description)
    .replace(/{{META_KEYWORDS}}/g, '')
    .replace(/{{AREA_ID}}/g, id)
    .replace(/{{AREA_CONTENT}}/g, content)
    .replace(/{{META_ROBOTS}}/g, '')
    .replace(/{{SCHEMA_DATA}}/g, schema);

  safeWriteFileSync(path.join(outDir, `${id}.html`), html);
  const srcAreasDir = path.join(process.cwd(), 'areas');
  if (fs.existsSync(srcAreasDir)) {
    safeWriteFileSync(path.join(srcAreasDir, `${id}.html`), html);
  }
  const pubAreasDir = path.join(process.cwd(), 'public', 'areas');
  if (fs.existsSync(pubAreasDir)) {
    safeWriteFileSync(path.join(pubAreasDir, `${id}.html`), html);
  }
  count++;
  console.log(`✅ Generated advanced SEO page: ${data.name} (Tier ${data.tier})`);
}

console.log(`Done! Generated exactly ${count} active area pages.`);
