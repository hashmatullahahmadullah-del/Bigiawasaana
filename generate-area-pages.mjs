import fs from 'fs';
import path from 'path';

const areas = [
  { id: 'calabasas', name: 'Calabasas' },
  { id: 'canoga-park', name: 'Canoga Park' },
  { id: 'chatsworth', name: 'Chatsworth' },
  { id: 'encino', name: 'Encino' },
  { id: 'granada-hills', name: 'Granada Hills' },
  { id: 'lake-balboa', name: 'Lake Balboa' },
  { id: 'mission-hills', name: 'Mission Hills' },
  { id: 'north-hills', name: 'North Hills' },
  { id: 'north-hollywood', name: 'North Hollywood' },
  { id: 'northridge', name: 'Northridge' },
  { id: 'porter-ranch', name: 'Porter Ranch' },
  { id: 'sherman-oaks', name: 'Sherman Oaks' },
  { id: 'studio-city', name: 'Studio City' },
  { id: 'sun-valley', name: 'Sun Valley' },
  { id: 'sylmar', name: 'Sylmar' },
  { id: 'tarzana', name: 'Tarzana' },
  { id: 'van-nuys', name: 'Van Nuys' },
  { id: 'west-hills', name: 'West Hills' },
  { id: 'winnetka', name: 'Winnetka' },
  { id: 'woodland-hills', name: 'Woodland Hills' }
];

const templatePath = path.join(process.cwd(), 'functions', 'area-template.html');
const outDir = path.join(process.cwd(), 'public', 'areas');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let template = fs.readFileSync(templatePath, 'utf8');

let count = 0;
for (const area of areas) {
  const title = `Halal Afghan Food Delivery in ${area.name} | Bigi Awasaana`;
  const description = `Looking for authentic Halal Afghan food in ${area.name}? Bigi Awasaana delivers fresh kabobs, bolani, and Afghan bakery items directly to you. Order now!`;
  
  const content = `
    <section class="section halal-bg" style="padding: clamp(60px, 10vw, 96px) 0; border-top: 1px solid var(--border);">
      <div class="container text-center-mobile">
        <div style="font-family: 'Barlow Condensed'; font-size: 16px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; font-weight: 600;">NOW DELIVERING</div>
        <h2 class="font-lalezar reveal" style="font-size: clamp(32px, 5vw, 48px); margin-bottom: 24px; line-height: 1.1;">AUTHENTIC HALAL AFGHAN FOOD IN ${area.name.toUpperCase()}</h2>
        
        <div class="reveal" style="color: var(--gray); font-size: 16px; margin-bottom: 40px; line-height: 1.8; max-width: 800px; margin-left: auto; margin-right: auto; text-align: left;">
          <p style="margin-bottom: 24px;">
            Are you craving authentic, coal-fired kabobs or fresh Afghan bakery items in <strong>${area.name}</strong>? Bigi Awasaana brings the bold, traditional flavors of the Silk Road directly to your door. We are a proudly 100% Zabiha Halal restaurant, serving the ${area.name} community with recipes that have been perfected over three generations.
          </p>
          
          <h3 style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 24px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Fresh Afghan Bakery & Kabobs</h3>
          <p style="margin-bottom: 24px;">
            Unlike other restaurants, we operate a full-service Afghan bakery right inside our kitchen. That means whether you are ordering our famous Chapli Kabobs, our juicy Chicken Tikka, or our Halal Smash Burgers, you are getting bread that was baked fresh that very same day. Our crispy, potato and leek stuffed <em>Bolani</em> is a local favorite in ${area.name}, always served hot with our signature homemade chutneys.
          </p>

          <h3 style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 24px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Fast & Reliable Delivery to ${area.name}</h3>
          <p style="margin-bottom: 32px;">
            We know that when you're hungry for quality Afghan cuisine, you don't want to wait. That's why we offer fast, reliable delivery throughout ${area.name} and the surrounding San Fernando Valley. Whether you are ordering a late-night meal, catering a family gathering, or just stopping by for a quick bite, Bigi Awasaana guarantees fresh ingredients, generous portions, and authentic Afghan hospitality.
          </p>
        </div>

        <div class="reveal" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="/menu.html" class="btn-primary" style="text-decoration: none; padding: 16px 40px; font-size: 18px;">Order Delivery to ${area.name} Now</a>
          <a href="https://maps.app.goo.gl/HRWCNVDR8fsv5jzv8" target="_blank" rel="noopener" class="btn-outline" style="text-decoration: none; padding: 16px 40px; font-size: 18px;">Get Directions to Store</a>
        </div>
      </div>
    </section>
  `;

  let html = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{META_DESC}}/g, description)
    .replace(/{{AREA_CONTENT}}/g, content)
    .replace(/{{META_ROBOTS}}/g, '')
    .replace(/{{SCHEMA}}/g, `
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
        "areaServed": "${area.name}",
        "telephone": "+13239211646"
      }
      </script>
    `);

  // Write to public/areas/<id>.html
  fs.writeFileSync(path.join(outDir, `${area.id}.html`), html);
  console.log(`✅ Generated static page: ${area.name}`);
  count++;
}

console.log(`\n🎉 Successfully generated ${count} static service area pages!`);
