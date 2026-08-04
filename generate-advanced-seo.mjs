import fs from 'fs';
import path from 'path';

// Local data for all 20 cities to ensure unique, localized content
const areas = {
  // --- TIER 1 (Highly Custom) ---
  'reseda': {
    name: 'Reseda',
    tier: 1,
    distance: '0 minutes (Local Headquarters)',
    landmark: 'Reseda Park',
    customHero: 'Your neighborhood destination in Reseda for premium Halal Kabobs and Afghan Street Food.',
    customStory: 'As proud members of the Reseda community, our flagship kitchen at 18411 Victory Blvd is the heart of Bigi Awasaana. We don\'t just serve the valley; we are a local Reseda establishment dedicated to bringing 100% Zabiha Halal, authentic Afghan cuisine right to your table. Whether you are walking in for a fresh Bolani or ordering delivery down the street, you get the absolute freshest, coal-fired kabobs in town.'
  },
  'encino': {
    name: 'Encino',
    tier: 1,
    distance: '10-15 minutes',
    landmark: 'Ventura Boulevard',
    customHero: 'Elevate your Encino dining experience with the finest Halal Afghan cuisine in the valley.',
    customStory: 'Whether you are returning from a day at the Sepulveda Basin or looking for a premium dinner near Ventura Blvd, Bigi Awasaana provides a culinary escape to the Silk Road. We know Encino residents appreciate high-quality, authentic food, which is why our 100% Zabiha Halal kabobs are always cooked fresh over open coals.'
  },
  'sherman-oaks': {
    name: 'Sherman Oaks',
    tier: 1,
    distance: '15-20 minutes',
    landmark: 'the Sherman Oaks Galleria',
    customHero: 'Authentic coal-fired kabobs and fresh Afghan bakery items, delivered to Sherman Oaks.',
    customStory: 'Sherman Oaks is a hub of incredible food, and we are proud to offer a completely unique, highly authentic Afghan dining experience just down the road in Reseda. Skip the usual delivery options and treat your family to our famous Chapli Kabobs, fresh baked Bolani, and saffron rice.'
  },
  'woodland-hills': {
    name: 'Woodland Hills',
    tier: 1,
    distance: '15 minutes',
    landmark: 'Warner Center',
    customHero: 'Experience the bold, traditional flavors of Afghanistan in Woodland Hills.',
    customStory: 'From the bustling offices of Warner Center to family homes across Woodland Hills, Bigi Awasaana is the top choice for authentic, Zabiha Halal Afghan food. Our chefs bring three generations of culinary expertise to every dish, ensuring your delivery or catering order is nothing short of spectacular.'
  },
  'tarzana': {
    name: 'Tarzana',
    tier: 1,
    distance: '5-10 minutes',
    landmark: 'Tarzana Safari Walk',
    customHero: 'Your local Tarzana destination for premium Halal Kabobs and Afghan Street Food.',
    customStory: 'Located right next door to Tarzana, our Reseda kitchen is perfectly positioned to serve you lightning-fast delivery. We are the premier Afghan bakery and kabob house for Tarzana residents who demand fresh, authentic, and 100% Halal meals for their families.'
  },
  'calabasas': {
    name: 'Calabasas',
    tier: 1,
    distance: '20-25 minutes',
    landmark: 'The Commons',
    customHero: 'Premium Zabiha Halal Afghan Catering and Delivery for Calabasas.',
    customStory: 'When residents of Calabasas want exceptional, high-quality catering or a remarkable family dinner, they choose Bigi Awasaana. Our commitment to premium ingredients, from our saffron-infused Qabuli Palou to our coal-fired Filet Mignon kabobs, makes us the perfect fit for the elevated tastes of Calabasas.'
  },
  
  // --- TIER 2 (Programmatically Varied) ---
  'canoga-park': { name: 'Canoga Park', tier: 2, distance: '10 minutes', landmark: 'Topanga Mall' },
  'chatsworth': { name: 'Chatsworth', tier: 2, distance: '15 minutes', landmark: 'Stoney Point Park' },
  'granada-hills': { name: 'Granada Hills', tier: 2, distance: '15-20 minutes', landmark: 'Zelzah Park' },
  'lake-balboa': { name: 'Lake Balboa', tier: 2, distance: '5-10 minutes', landmark: 'Lake Balboa Park' },
  'mission-hills': { name: 'Mission Hills', tier: 2, distance: '20 minutes', landmark: 'the San Fernando Mission' },
  'north-hills': { name: 'North Hills', tier: 2, distance: '15 minutes', landmark: 'the local community' },
  'north-hollywood': { name: 'North Hollywood', tier: 2, distance: '20-25 minutes', landmark: 'the NoHo Arts District' },
  'northridge': { name: 'Northridge', tier: 2, distance: '10-15 minutes', landmark: 'CSUN' },
  'porter-ranch': { name: 'Porter Ranch', tier: 2, distance: '15-20 minutes', landmark: 'the Porter Ranch Town Center' },
  'studio-city': { name: 'Studio City', tier: 2, distance: '25 minutes', landmark: 'CBS Studio Center' },
  'sun-valley': { name: 'Sun Valley', tier: 2, distance: '25 minutes', landmark: 'the Sun Valley area' },
  'sylmar': { name: 'Sylmar', tier: 2, distance: '25-30 minutes', landmark: 'the local foothills' },
  'van-nuys': { name: 'Van Nuys', tier: 2, distance: '15 minutes', landmark: 'the Van Nuys Civic Center' },
  'west-hills': { name: 'West Hills', tier: 2, distance: '15-20 minutes', landmark: 'Fallbrook Center' },
  'winnetka': { name: 'Winnetka', tier: 2, distance: '5-10 minutes', landmark: 'Winnetka Recreation Center' }
};

// Spintax / Phrase Variations to avoid duplicate content on Tier 2 pages
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
  // Use the city name length as a pseudo-seed so it's consistent but varied across cities
  const index = (cityId.length + cityId.charCodeAt(0)) % arr.length;
  return arr[index];
}

const templatePath = path.join(process.cwd(), 'functions', 'area-template.html');
const outDir = path.join(process.cwd(), 'public', 'areas');
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

  // Generate a robust, 500+ word HTML structure
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
      details.faq-item:hover {
        border-color: rgba(255, 69, 0, 0.3);
      }
      details.faq-item[open] {
        background: rgba(255, 255, 255, 0.04);
        border-color: var(--accent);
      }
      summary.faq-summary {
        padding: 24px;
        font-size: 18px;
        font-weight: 600;
        color: var(--white);
        cursor: pointer;
        list-style: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
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
        transform: rotate(180deg);
      }
      .faq-content {
        padding: 0 24px 24px 24px;
        color: var(--gray);
        line-height: 1.7;
      }
      
      .cta-section {
        padding: clamp(60px, 10vw, 96px) 0;
        background: radial-gradient(circle at center, rgba(255, 69, 0, 0.1) 0%, var(--bg) 70%);
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
          <a href="/menu.html" class="btn-primary" style="text-decoration: none; padding: 18px 48px; font-size: 18px; border-radius: 100px; box-shadow: 0 10px 20px rgba(255,69,0,0.2); transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 25px rgba(255,69,0,0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 20px rgba(255,69,0,0.2)';">Order Online Now</a>
          <a href="https://maps.app.goo.gl/HRWCNVDR8fsv5jzv8" target="_blank" rel="noopener" class="btn-outline" style="text-decoration: none; padding: 18px 48px; font-size: 18px; border-radius: 100px;">Get Directions</a>
        </div>
      </div>
    </section>
    
    <!-- 2. Story Section -->
    <section class="story-section">
      <div class="container">
        <div class="story-grid">
          <div class="reveal-animate delay-1">
            <h2 style="font-family: 'Barlow Condensed'; font-size: 40px; text-transform: uppercase; color: var(--white); margin-bottom: 24px;">Authentic Flavors, Delivered to ${data.name}</h2>
            <p style="font-size: 20px; color: var(--gray); line-height: 1.8; margin-bottom: 24px;">
              ${storyText}
            </p>
            <p style="font-size: 18px; color: var(--white); border-left: 4px solid var(--accent); padding-left: 16px;">
              "The best Afghan food in the valley, right here."
            </p>
          </div>
          <div class="story-img-container reveal-animate delay-2">
            <img src="/halal-afghan-restaurant-reseda.webp" alt="Bigi Awasaana Food Truck and Grill" loading="lazy">
          </div>
        </div>
      </div>
    </section>
    
    <!-- 3. Menu Highlights Section -->
    <section class="highlights-section">
      <div class="container">
        <div class="text-center-mobile reveal-animate" style="margin-bottom: 64px;">
          <h2 style="font-family: 'Barlow Condensed'; font-size: 48px; text-transform: uppercase; color: var(--white); margin-bottom: 16px;">Why ${data.name} Loves Us</h2>
          <p style="color: var(--gray); font-size: 20px; max-width: 600px; margin: 0 auto;">Everything is made from scratch, baked fresh, and grilled to order.</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px;">
          <!-- Bakery Section -->
          <div class="glass-card reveal-animate delay-1">
            <div class="glass-card-icon">🫓</div>
            <h2>Fresh Afghan Bakery</h2>
            <p style="margin: 0; line-height: 1.7; color: var(--gray); flex: 1;">${bakeryText}</p>
          </div>
          
          <!-- Halal Smash Burger Section -->
          <div class="glass-card reveal-animate delay-2">
            <div class="glass-card-icon">🍔</div>
            <h2>The Smash Burger</h2>
            <p style="margin: 0; line-height: 1.7; color: var(--gray); flex: 1;">${burgerText}</p>
          </div>
          
          <!-- Delivery & Catering Section -->
          <div class="glass-card reveal-animate delay-3">
            <div class="glass-card-icon">🚙</div>
            <h2>Delivery & Catering</h2>
            <p style="margin: 0; line-height: 1.7; color: var(--gray); flex: 1;">We know you don't want to wait when you're hungry. We offer fast delivery to ${data.name} (typically ${data.distance} drive from our kitchen). Planning an event near ${data.landmark}? We provide premium Halal catering trays for corporate events, weddings, and family gatherings.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. Local FAQ Section -->
    <section class="faq-section">
      <div class="container" style="max-width: 800px;">
        <h2 class="reveal-animate" style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 40px; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Frequently Asked Questions in ${data.name}</h2>
        
        <div class="reveal-animate delay-1">
          <details class="faq-item">
            <summary class="faq-summary">Is your meat 100% Halal?</summary>
            <div class="faq-content">
              Yes, all of our meat, including our beef, chicken, and lamb, is strictly 100% Zabiha Halal. We are proud to be a trusted Halal source for the ${data.name} community.
            </div>
          </details>
          
          <details class="faq-item">
            <summary class="faq-summary">Do you deliver to ${data.name}?</summary>
            <div class="faq-content">
              Yes! We deliver our fresh kabobs and bakery items directly to ${data.name}. You can order directly through our website or via UberEats and DoorDash.
            </div>
          </details>
          
          <details class="faq-item">
            <summary class="faq-summary">What is your most popular dish?</summary>
            <div class="faq-content">
              Our Chapli Kabob Wrap, Saffron Qabuli Palou, and our fresh-baked Bolani are massive hits across the valley.
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
    
    <!-- 5. CTA Section -->
    <section class="cta-section">
      <div class="container text-center-mobile reveal-animate">
        <h2 style="font-family: 'Barlow Condensed'; font-size: 48px; text-transform: uppercase; color: var(--white); margin-bottom: 16px;">Hungry yet?</h2>
        <p style="color: var(--gray); font-size: 20px; max-width: 600px; margin: 0 auto 40px auto;">Experience the best Halal food in the valley today. Pick up in Reseda or get it delivered to ${data.name}.</p>
        <a href="/menu.html" class="btn-primary" style="text-decoration: none; padding: 18px 48px; font-size: 18px; border-radius: 100px; box-shadow: 0 10px 20px rgba(255,69,0,0.2); transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 25px rgba(255,69,0,0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 20px rgba(255,69,0,0.2)';">View Full Menu</a>
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
        "description": "Authentic Afghan street food. Coal-fired kabobs, bolani, and saffron rice platters. 100% Zabiha Halal.",
        "url": "https://bigiawasaana.com",
        "image": "https://bigiawasaana.com/halal-afghan-restaurant-reseda.webp",
        "logo": "https://bigiawasaana.com/logo.webp",
        "telephone": "+13239211646",
        "servesCuisine": ["Afghan", "Middle Eastern", "Halal"],
        "priceRange": "$$",
        "hasMenu": "https://bigiawasaana.com/menu.html",
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
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
          "opens": "12:00",
          "closes": "22:30"
        },
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
              "text": "Yes, all of our meat is strictly 100% Zabiha Halal. We are a trusted Halal source for the ${data.name} community."
            }
          },
          {
            "@type": "Question",
            "name": "Do you deliver to ${data.name}?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! We deliver our fresh kabobs and bakery items directly to ${data.name}."
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
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://bigiawasaana.com/" },
          { "@type": "ListItem", "position": 2, "name": "Locations", "item": "https://bigiawasaana.com/locations.html" },
          { "@type": "ListItem", "position": 3, "name": "Halal Food in ${data.name}", "item": "https://bigiawasaana.com/areas/${id}" }
        ]
      }
    ]
    </script>
  `;

  // Generate unique meta keywords per city
  const keywords = `halal smash burger ${data.name}, halal food ${data.name}, afghan food ${data.name}, kabobs ${data.name}, halal delivery ${data.name}, afghan bakery ${data.name}, zabiha halal ${data.name}, halal catering ${data.name}, bolani ${data.name}, qabuli palou ${data.name}, bigi awasaana`;

  let html = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{META_DESC}}/g, description)
    .replace(/{{META_KEYWORDS}}/g, keywords)
    .replace(/{{AREA_ID}}/g, id)
    .replace(/{{AREA_CONTENT}}/g, content)
    .replace(/{{META_ROBOTS}}/g, '')
    .replace(/{{SCHEMA_DATA}}/g, schema);

  fs.writeFileSync(path.join(outDir, `${id}.html`), html);
  console.log(`✅ Generated advanced SEO page: ${data.name} (Tier ${data.tier})`);
  count++;
}

console.log(`\n🎉 Successfully generated ${count} advanced long-form SEO pages!`);
