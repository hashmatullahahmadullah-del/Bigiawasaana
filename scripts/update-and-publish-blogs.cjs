const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

process.env.GOOGLE_APPLICATION_CREDENTIALS = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce'
  });
}

const db = getFirestore();

// ─────────────────────────────────────────────────────────────────
// TASK 1: Update existing blog posts for better indexing
// ─────────────────────────────────────────────────────────────────

async function updateExistingPosts() {
  console.log("── Updating existing blog posts for better SEO ──");

  // Update Post 1: "3 Authentic Afghan Street Foods"
  const snap1 = await db.collection('posts').where('slug', '==', '3-authentic-afghan-street-foods-reseda').limit(1).get();
  if (!snap1.empty) {
    await snap1.docs[0].ref.update({
      title: "3 Authentic Afghan Street Foods You Need to Try in Reseda, CA",
      excerpt: "Discover the best Halal Afghan street food in the San Fernando Valley. From crispy Chapli Kababs to stuffed Bolani flatbreads and the legendary Afghan Burger, here are the top 3 must-try dishes at Bigi Awasaana in Reseda, Los Angeles.",
      keywords: "Afghan food Reseda, Halal street food San Fernando Valley, Chapli Kabab Reseda, Bolani Afghan flatbread LA, Afghan Burger Los Angeles, best halal food truck LA, Zabiha Halal Reseda, Afghan food near me",
      content: `
<p>If you're searching for the most <strong>authentic Afghan street food in Los Angeles</strong>, you don't need to look any further than Reseda. <strong>Bigi Awasaana</strong> brings the vibrant, spice-filled streets of Kabul straight to the San Fernando Valley with 100% Zabiha Halal ingredients, coal-fired cooking, and recipes passed down through generations.</p>

<p>Whether you're a lifelong Afghan food lover or trying it for the very first time, here are three absolute must-try items on our menu that will transport your taste buds straight to the bustling food stalls of Afghanistan.</p>

<h2>1. Chapli Kabab — The King of Afghan Street Food</h2>
<p>This isn't your average patty. The <strong>Chapli Kabab</strong> is a legendary Pashtun-style minced meat kabab, flattened and pan-fried to crispy perfection. Packed with a fragrant blend of coriander, pomegranate seeds, green chilies, and tomatoes, every bite offers a complex crunch and burst of savory heat. We serve ours fresh off the grill, exactly how it's done in the bustling food markets of Peshawar and Jalalabad.</p>

<p>What makes our Chapli Kabab different? We use <strong>100% Zabiha Halal beef</strong> and hand-mix every patty daily with fresh herbs and spices. No shortcuts, no frozen patties—just real, honest street food.</p>

<h2>2. Authentic Bolani — Afghan Stuffed Flatbread</h2>
<p>Think of <strong>Bolani</strong> as the ultimate Afghan comfort food and the perfect shareable appetizer. It's a thin, rustic flatbread stuffed with a savory filling—most traditionally, freshly chopped leeks, potatoes, and herbs—then pan-fried until the exterior is golden and blistered. It's crispy on the outside, soft and savory on the inside, and absolutely incredible when dipped in our homemade <strong>cilantro-mint chutney</strong>.</p>

<p>Fun fact: Bolani is one of the most popular street foods sold at Kabul's famous <em>Mandawi Market</em>. At Bigi Awasaana, we make ours fresh to order, just like the vendors back home.</p>

<h2>3. The Halal Afghan Burger — A Street Food Masterpiece</h2>
<p>Don't let the word "burger" fool you; this is a <strong>street food masterpiece</strong> unlike anything you'll find at a typical fast-food joint. Our Afghan Burger features a massive, flavor-packed Halal beef patty layered with fresh vegetables, zesty sauces, and sometimes even crispy fries, all wrapped tightly in a soft lavash bread. It's a handheld feast that perfectly captures the bold, hearty essence of Afghan street eating.</p>

<p>The Afghan Burger has exploded in popularity across Los Angeles, and people drive from <a href="/areas/woodland-hills">Woodland Hills</a>, <a href="/areas/northridge">Northridge</a>, <a href="/areas/encino">Encino</a>, and beyond just to try ours.</p>

<h2>Where to Find Us</h2>
<p>Bigi Awasaana is located at <strong>18411 Victory Blvd, Reseda, CA 91335</strong>, right in the heart of the San Fernando Valley. We're open every day from 12 PM to 10:30 PM.</p>

<p>We also deliver through <strong>DoorDash</strong> and <strong>Uber Eats</strong> to neighborhoods across the Valley including <a href="/areas/canoga-park">Canoga Park</a>, <a href="/areas/tarzana">Tarzana</a>, <a href="/areas/van-nuys">Van Nuys</a>, <a href="/areas/north-hollywood">North Hollywood</a>, and more.</p>

<p><em>Ready to experience these flavors for yourself? <a href="/menu">Check out our full menu</a> or visit us at Bigi Awasaana in Reseda today. You can also call us at <a href="tel:+13239211646">(323) 921-1646</a> to order pickup!</em></p>
`,
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log("✓ Updated: 3 Authentic Afghan Street Foods");
  } else {
    console.log("⚠ Post not found: 3-authentic-afghan-street-foods-reseda");
  }

  // Update Post 2: "What to Order at an Afghan Restaurant"
  const snap2 = await db.collection('posts').where('slug', '==', 'what-to-order-afghan-restaurant-guide-los-angeles').limit(1).get();
  if (!snap2.empty) {
    await snap2.docs[0].ref.update({
      title: "What to Order at an Afghan Restaurant: A Beginner's Guide (Los Angeles)",
      excerpt: "First time trying Afghan cuisine? Here's your complete guide to ordering at an Afghan restaurant in Los Angeles. From Kabuli Pulao to Mantu dumplings and coal-fired kebabs, discover the best dishes at Bigi Awasaana in Reseda, CA.",
      keywords: "Afghan restaurant Los Angeles, what to order Afghan food, Afghan food near me Reseda, Kabuli Pulao recipe, Mantu Afghan dumplings LA, Bolani flatbread, Halal Afghan food guide, best kebabs San Fernando Valley",
      content: `
<p>If you've never tried <strong>Afghan cuisine</strong> before, you're in for one of the most rewarding culinary experiences of your life. Known for its rich, savory, and deeply aromatic flavor profile, Afghan food bridges the culinary traditions of the Middle East, Central Asia, and the Indian subcontinent. And the best part? It's incredibly delicious without being overwhelmingly spicy.</p>

<p>For those visiting <strong><a href="/">Bigi Awasaana</a></strong> in Reseda, CA for the first time, ordering can feel intimidating if you aren't familiar with the names of the dishes. This guide breaks down exactly what to order so you can experience the true taste of Kabul, right here in Los Angeles.</p>

<h2>1. Start with the Ultimate Appetizer: Bolani</h2>
<p>Before you dive into the main courses, you absolutely must try <strong>Bolani</strong>. This is an Afghan staple—a rustic, thin flatbread that is stuffed with a savory filling, usually a mix of potatoes, leeks, and herbs, and then pan-fried until golden and crispy. It comes piping hot and is served with a side of homemade cilantro-mint chutney or garlic yogurt. It's the perfect shareable appetizer that will instantly hook you.</p>

<p><strong>Pro Tip:</strong> Order the Bolani first while you wait for your kabobs. It arrives fast and is the perfect way to start your meal.</p>

<h2>2. The Crown Jewel: Kabuli Pulao (Qabili Palau)</h2>
<p>You cannot visit an Afghan restaurant without trying the national dish: <strong>Kabuli Pulao</strong> (also spelled Qabili Palau). This is a masterclass in balancing sweet and savory flavors. The dish features fragrant, long-grain basmati rice cooked in a rich broth, then crowned with tender chunks of slow-cooked lamb or beef, caramelized carrots, and sweet raisins, often garnished with almonds or pistachios.</p>

<p>The meat is usually buried under the mound of rice so it stays incredibly tender and juicy. The contrast between the savory meat and the sweet carrots and raisins is unlike anything else you'll find in Los Angeles.</p>

<h2>3. For the Meat Lovers: Coal-Fired Kebabs</h2>
<p>Afghan kebabs are legendary, and at Bigi Awasaana, they're cooked the traditional way—over <strong>real charcoal</strong>. The secret lies in the marinade and the open flame. For beginners, we recommend trying a mix:</p>
<ul>
  <li><strong>Chicken Tikka Kebab:</strong> Juicy chunks of chicken thigh marinated in yogurt and spices, grilled to smoky perfection over coal fire.</li>
  <li><strong>Chapli Kebab:</strong> A uniquely Afghan and Pashtun creation—a flattened, spiced minced beef patty mixed with tomatoes, coriander, and green chilies, pan-fried for a crispy exterior.</li>
  <li><strong>Koobideh (Luleh):</strong> Flavorful skewers of ground beef mixed with onions and spices, grilled over an open flame until caramelized.</li>
  <li><strong>Filet Mignon Kabob:</strong> Our premium cut, marinated and grilled to perfection. A Bigi Awasaana customer favorite.</li>
</ul>

<h2>4. The Hidden Gem: Mantu (Afghan Dumplings)</h2>
<p>If you love dumplings, you will fall in love with <strong>Mantu</strong>. These delicate, steamed dumplings are stuffed with spiced ground beef and onions. What makes them truly special is the topping: they are smothered in a garlicky yogurt sauce and a rich tomato-based lentil or meat sauce, finished with a sprinkle of dried mint. It's a flavor explosion in every bite.</p>

<p>Mantu is often called the "Afghan dim sum" by first-time visitors—and once you try it, you'll understand why people keep coming back for more.</p>

<h2>5. Don't Skip the Drinks: Doogh</h2>
<p>Complete your meal with <strong>Doogh</strong>, a traditional Afghan yogurt drink seasoned with mint and salt. It's refreshing, slightly tangy, and the perfect palate cleanser between bites of rich, savory kabobs.</p>

<h2>Ready to Try Afghan Food in Los Angeles?</h2>
<p>Afghan food is all about hospitality, sharing, and incredible flavors. At <strong>Bigi Awasaana</strong>, we take pride in serving authentic, <strong>100% Zabiha Halal</strong> Afghan street food and traditional dishes to the Los Angeles community.</p>

<p>We're located at <strong>18411 Victory Blvd, Reseda, CA 91335</strong> in the San Fernando Valley, and we deliver to <a href="/areas/sherman-oaks">Sherman Oaks</a>, <a href="/areas/encino">Encino</a>, <a href="/areas/granada-hills">Granada Hills</a>, <a href="/areas/north-hollywood">North Hollywood</a>, and more.</p>

<p><em>Check out our <a href="/menu">Full Menu</a> or visit us today in Reseda to start your culinary journey along the Silk Road! Call <a href="tel:+13239211646">(323) 921-1646</a> to order.</em></p>
`,
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log("✓ Updated: What to Order at an Afghan Restaurant");
  } else {
    console.log("⚠ Post not found: what-to-order-afghan-restaurant-guide-los-angeles");
  }
}

// ─────────────────────────────────────────────────────────────────
// TASK 2: Publish new blog post — "Halal Catering in LA"
// ─────────────────────────────────────────────────────────────────

async function publishNewPost() {
  console.log("\n── Publishing new blog post ──");

  const newBlogContent = `
<p>Planning a wedding, corporate event, or private party in Los Angeles and need <strong>Halal catering</strong>? You're not alone. The demand for high-quality, authentic Halal catering across the San Fernando Valley and greater LA has surged in recent years—and finding a caterer who delivers on both flavor and faithfulness to Halal standards can be a challenge.</p>

<p>At <strong><a href="/">Bigi Awasaana</a></strong>, we've been serving the LA community with authentic Afghan cuisine since day one. Now, our <a href="/catering">full-service Halal catering</a> brings the same coal-fired kabobs, fragrant rice platters, and handmade appetizers that made our Reseda restaurant famous—directly to your event.</p>

<h2>Why Choose Halal Catering for Your LA Event?</h2>
<p>Whether your guests follow a Halal diet or you simply want to serve the freshest, highest-quality meat available, Halal catering is the smart choice. Here's why:</p>
<ul>
  <li><strong>Inclusive:</strong> Halal food can be enjoyed by everyone, regardless of dietary background. It's naturally free of pork and alcohol-based ingredients.</li>
  <li><strong>Quality:</strong> Zabiha Halal sourcing emphasizes humane treatment and freshness, resulting in meat that is cleaner, more tender, and more flavorful.</li>
  <li><strong>Growing Demand:</strong> Los Angeles is one of the most diverse cities in the world. Offering Halal options ensures no guest feels left out.</li>
</ul>

<h2>What We Cater: Our Most Popular Event Packages</h2>
<p>Bigi Awasaana's catering menu is built around shareable, crowd-pleasing Afghan dishes that work beautifully for events of any size—from intimate gatherings of 20 to large celebrations of 200+.</p>

<h3>Kabob Platters</h3>
<p>The centerpiece of any Afghan feast. Choose from our <strong>Chicken Tikka Kabob</strong>, <strong>Chapli Kabab</strong>, <strong>Koobideh</strong>, <strong>Lamb Chops</strong>, and our premium <strong>Filet Mignon Kabob</strong>. All grilled fresh over real charcoal and served with saffron rice and fresh naan bread.</p>

<h3>Qabuli Palou (Kabuli Pulao)</h3>
<p>Afghanistan's national dish is a show-stopper at any event. Our fragrant basmati rice is slow-cooked with tender lamb, caramelized carrots, raisins, and almonds. It's the dish your guests will be talking about for weeks.</p>

<h3>Appetizer Spreads</h3>
<p>Start the event right with platters of crispy <strong>Bolani</strong> (Afghan stuffed flatbread), <strong>Mantu</strong> (steamed dumplings with yogurt and meat sauce), and our famous <strong>cilantro-mint chutney</strong>.</p>

<h3>Afghan Burger & Wrap Bars</h3>
<p>Perfect for casual corporate events or outdoor parties. Set up a build-your-own <strong>Afghan Burger bar</strong> or <strong>Shawarma wrap station</strong> where guests can customize their meal with fresh toppings and sauces.</p>

<h2>Events We Cater in the San Fernando Valley & LA</h2>
<p>We've proudly catered events across the San Fernando Valley and greater Los Angeles, including:</p>
<ul>
  <li><strong>Weddings & Engagements</strong> — Afghan, Middle Eastern, and multicultural celebrations</li>
  <li><strong>Corporate Lunches & Team Events</strong> — Office catering for tech companies, hospitals, and universities</li>
  <li><strong>Birthday Parties & Graduation Celebrations</strong></li>
  <li><strong>Community & Mosque Events</strong> — Iftar dinners, Eid celebrations, and charity fundraisers</li>
  <li><strong>School & University Events</strong> — Including CSUN, Pierce College, and local high schools</li>
</ul>

<p>We deliver and set up across <a href="/areas/reseda">Reseda</a>, <a href="/areas/northridge">Northridge</a>, <a href="/areas/encino">Encino</a>, <a href="/areas/woodland-hills">Woodland Hills</a>, <a href="/areas/sherman-oaks">Sherman Oaks</a>, <a href="/areas/granada-hills">Granada Hills</a>, <a href="/areas/canoga-park">Canoga Park</a>, <a href="/areas/north-hollywood">North Hollywood</a>, and throughout greater Los Angeles.</p>

<h2>How to Book Bigi Awasaana Catering</h2>
<p>Getting a catering quote is easy:</p>
<ol>
  <li><strong>Visit our <a href="/catering">Catering Page</a></strong> to browse our packages and menu options.</li>
  <li><strong>Call us at <a href="tel:+13239211646">(323) 921-1646</a></strong> to discuss your event details, guest count, and dietary needs.</li>
  <li><strong>Email us at <a href="mailto:bigiawasaana@gmail.com">bigiawasaana@gmail.com</a></strong> with your event date and we'll send you a custom quote within 24 hours.</li>
</ol>

<p>We recommend booking at least <strong>2 weeks in advance</strong> for smaller events and <strong>4+ weeks</strong> for weddings and large celebrations to ensure availability.</p>

<h2>Why Bigi Awasaana?</h2>
<p>When you choose Bigi Awasaana for your event, you're getting more than food—you're getting an experience:</p>
<ul>
  <li>✅ <strong>100% Zabiha Halal</strong> — Every ingredient, verified and trusted</li>
  <li>✅ <strong>Coal-fired cooking</strong> — Real charcoal grills for authentic flavor</li>
  <li>✅ <strong>Made fresh</strong> — Nothing pre-made, nothing frozen</li>
  <li>✅ <strong>Flexible packages</strong> — From drop-off trays to full-service buffet setup</li>
  <li>✅ <strong>Loved by LA</strong> — 4.9★ rating with 140+ reviews</li>
</ul>

<p><em>Ready to make your next event unforgettable? <a href="/catering">Get a catering quote today</a> or call us at <a href="tel:+13239211646">(323) 921-1646</a>.</em></p>
`;

  const postData = {
    title: "Best Halal Catering in Los Angeles for Weddings, Parties & Corporate Events",
    slug: "best-halal-catering-los-angeles-weddings-events",
    excerpt: "Looking for Halal catering in Los Angeles? Bigi Awasaana offers authentic Afghan catering for weddings, corporate events, and private parties across the San Fernando Valley. Coal-fired kabobs, Qabuli Palou, and more—100% Zabiha Halal.",
    keywords: "Halal catering Los Angeles, Halal catering San Fernando Valley, Afghan catering LA, Halal wedding catering, Halal corporate catering Reseda, Zabiha Halal catering, best Halal caterer Los Angeles, Halal food for events",
    content: newBlogContent,
    coverImage: "/images/blog/afghan_food_spread_guide.jpg",
    isPublished: true,
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('posts').add(postData);
  console.log(`✓ Published new post with ID: ${docRef.id}`);
}

// ─────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────
async function main() {
  try {
    await updateExistingPosts();
    await publishNewPost();
    console.log("\n✅ All blog updates complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
