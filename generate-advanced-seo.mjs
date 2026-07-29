import fs from 'fs';
import path from 'path';

// Local data for all 20 cities to ensure unique, localized content
const areas = {
  // --- TIER 1 (Highly Custom) ---
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

  // Generate a robust, 500+ word HTML structure
  const content = `
    <!-- Hero Section -->
    <section class="section halal-bg" style="padding: clamp(60px, 10vw, 96px) 0; border-top: 1px solid var(--border);">
      <div class="container text-center-mobile">
        <div style="font-family: 'Barlow Condensed'; font-size: 16px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; font-weight: 600;">YOUR LOCAL AFGHAN RESTAURANT</div>
        <h1 class="font-lalezar reveal" style="font-size: clamp(32px, 5vw, 48px); margin-bottom: 24px; line-height: 1.1;">${heroText}</h1>
        
        <div class="reveal" style="color: var(--gray); font-size: 17px; margin-bottom: 40px; line-height: 1.8; max-width: 800px; margin-left: auto; margin-right: auto; text-align: left;">
          
          <!-- Story / Intro (Unique per city) -->
          <p style="margin-bottom: 32px; font-size: 18px; color: var(--white);">
            ${storyText}
          </p>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; margin-bottom: 48px;">
            <!-- Bakery Section -->
            <div style="background: var(--surface); padding: 32px; border-radius: 8px; border: 1px solid var(--border);">
              <h2 style="color: var(--accent); font-family: 'Barlow Condensed'; font-size: 24px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Fresh Afghan Bakery</h2>
              <p>${bakeryText}</p>
            </div>
            
            <!-- Delivery & Catering Section -->
            <div style="background: var(--surface); padding: 32px; border-radius: 8px; border: 1px solid var(--border);">
              <h2 style="color: var(--accent); font-family: 'Barlow Condensed'; font-size: 24px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Delivery & Catering</h2>
              <p>We know you don't want to wait when you're hungry. We offer fast delivery to ${data.name} (typically ${data.distance} drive from our kitchen). Planning an event near ${data.landmark}? We also provide premium Halal catering trays for corporate events, weddings, and family gatherings.</p>
            </div>
          </div>

          <!-- Local FAQ -->
          <h2 style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 28px; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px;">Frequently Asked Questions about our ${data.name} Service</h2>
          
          <div style="margin-bottom: 16px;">
            <strong style="color: var(--accent);">Q: Is your meat 100% Halal?</strong><br>
            A: Yes, all of our meat, including our beef, chicken, and lamb, is strictly 100% Zabiha Halal. We are proud to be a trusted Halal source for the ${data.name} community.
          </div>
          <div style="margin-bottom: 16px;">
            <strong style="color: var(--accent);">Q: Do you deliver to ${data.name}?</strong><br>
            A: Yes! We deliver our fresh kabobs and bakery items directly to ${data.name}. You can order directly through our website or via UberEats and DoorDash.
          </div>
          <div style="margin-bottom: 32px;">
            <strong style="color: var(--accent);">Q: What is your most popular dish?</strong><br>
            A: Our Chapli Kabob Wrap, Saffron Qabuli Palou, and our fresh-baked Bolani are massive hits.
          </div>
        </div>

        <div class="reveal" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="/menu.html" class="btn-primary" style="text-decoration: none; padding: 16px 40px; font-size: 18px;">Order Online Now</a>
          <a href="https://maps.app.goo.gl/HRWCNVDR8fsv5jzv8" target="_blank" rel="noopener" class="btn-outline" style="text-decoration: none; padding: 16px 40px; font-size: 18px;">Get Directions</a>
        </div>
      </div>
    </section>
  `;

  const schema = `
    <script type="application/ld+json">
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
        }
      ]
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FoodEstablishment",
      "name": "Bigi Awasaana",
      "image": "https://bigiawasaana.com/logo.webp",
      "servesCuisine": "Afghan",
      "priceRange": "$$",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "18411 Victory Blvd",
        "addressLocality": "Reseda",
        "addressRegion": "CA",
        "postalCode": "91335"
      },
      "areaServed": "${data.name}",
      "telephone": "+13239211646"
    }
    </script>
  `;

  let html = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{META_DESC}}/g, description)
    .replace(/{{AREA_CONTENT}}/g, content)
    .replace(/{{META_ROBOTS}}/g, '')
    .replace(/{{SCHEMA}}/g, schema);

  fs.writeFileSync(path.join(outDir, `${id}.html`), html);
  console.log(`✅ Generated advanced SEO page: ${data.name} (Tier ${data.tier})`);
  count++;
}

console.log(`\n🎉 Successfully generated ${count} advanced long-form SEO pages!`);
