import { requireAuth } from 'firebase-tools/lib/requireAuth.js';
import { getAccessToken } from 'firebase-tools/lib/auth.js';
import fetch from 'node-fetch';

const projectId = 'bigi-awasaana-7b3ce';

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

async function run() {
  await requireAuth({});
  const token = await getAccessToken();
  
  if (!token) throw new Error("Could not get Firebase token");

  let count = 0;
  for (const area of areas) {
    const docPath = `projects/${projectId}/databases/(default)/documents/serviceAreas/${area.id}`;
    const url = `https://firestore.googleapis.com/v1/${docPath}`;

    const document = {
      fields: {
        id: { stringValue: area.id },
        name: { stringValue: area.name },
        title: { stringValue: `Halal Afghan Food Delivery in ${area.name} | Bigi Awasaana` },
        metaDescription: { stringValue: `Looking for authentic Halal Afghan food in ${area.name}? Bigi Awasaana delivers fresh kabobs, bolani, and Afghan bakery items directly to you. Order now!` },
        content: { stringValue: `
        <section class="section halal-bg" style="padding: clamp(60px, 10vw, 96px) 0; border-top: 1px solid var(--border);">
          <div class="container text-center-mobile">
            <div style="font-family: 'Barlow Condensed'; font-size: 16px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; font-weight: 600;">NOW DELIVERING</div>
            <h2 class="font-lalezar reveal" style="font-size: clamp(32px, 5vw, 48px); margin-bottom: 24px; line-height: 1.1;">FRESH AFGHAN FOOD IN ${area.name.toUpperCase()}</h2>
            <p class="reveal" style="color: var(--gray); font-size: 16px; margin-bottom: 32px; line-height: 1.6; max-width: 700px; margin-left: auto; margin-right: auto;">
              Craving authentic, coal-fired kabobs or fresh Afghan bakery items? Bigi Awasaana brings the bold flavors of the Silk Road directly to your door in ${area.name}. We are a 100% Zabiha Halal restaurant proudly serving the local community.
            </p>
            <div class="reveal" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <a href="/menu.html" class="btn-primary" style="text-decoration: none; padding: 12px 32px;">Order Delivery Now</a>
              <a href="https://maps.app.goo.gl/HRWCNVDR8fsv5jzv8" target="_blank" rel="noopener" class="btn-outline" style="text-decoration: none;">Get Directions to Store</a>
            </div>
          </div>
        </section>
        `},
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(document)
    });

    if (!res.ok) {
      console.error(`Failed to update ${area.id}:`, await res.text());
    } else {
      console.log(`✅ Created/Updated area: ${area.name}`);
      count++;
    }
  }
  
  console.log(`\n🎉 Successfully pushed ${count} service areas via REST API!`);
}

run().catch(console.error);
