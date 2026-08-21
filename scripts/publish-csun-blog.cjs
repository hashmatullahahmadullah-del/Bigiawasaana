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

const blogContent = `
<p>If you're a student at <strong>California State University, Northridge (CSUN)</strong> and you're tired of the same campus food options, we have great news: some of the best <strong>Halal food in the San Fernando Valley</strong> is just minutes from your campus.</p>

<p><strong><a href="/">Bigi Awasaana</a></strong> is located at 18411 Victory Blvd in Reseda—just a quick <strong>7-minute drive south on Reseda Blvd</strong> from the CSUN campus. Whether you need a quick lunch between classes, a late dinner after a study session, or catering for your campus club event, we've got you covered with <strong>100% Zabiha Halal</strong> Afghan street food that's made fresh every single day.</p>

<h2>Why CSUN Students Love Bigi Awasaana</h2>
<p>We get it—college life means you need food that's affordable, filling, and actually tastes incredible. Here's why Matadors keep coming back:</p>
<ul>
  <li><strong>Authentically Halal:</strong> Every single ingredient is 100% Zabiha Halal. No guessing, no calling ahead to ask—we're Halal through and through.</li>
  <li><strong>Huge portions:</strong> Our kabob platters come loaded with saffron rice, fresh salad, and naan. You won't leave hungry.</li>
  <li><strong>Student-friendly prices:</strong> Real, coal-fired Afghan food at prices that won't destroy your budget.</li>
  <li><strong>Open late:</strong> We're open every day until 10:30 PM—perfect for post-library fuel.</li>
  <li><strong>Delivery available:</strong> Too deep in a study session to leave? Order through DoorDash or Uber Eats and we'll bring it to you.</li>
</ul>

<h2>What to Order: CSUN Student Favorites</h2>
<p>Not sure where to start? Here are the dishes that CSUN students order the most:</p>

<h3>🔥 Chicken Tikka Kabob Platter</h3>
<p>Juicy, marinated chicken thigh pieces grilled over <strong>real charcoal</strong> until smoky and caramelized. Served on a bed of saffron rice with fresh salad and warm naan bread. This is the #1 most-ordered item by students, and for good reason—it's massive, flavorful, and deeply satisfying.</p>

<h3>🍔 The Afghan Burger</h3>
<p>This isn't a regular burger. Our <strong>Afghan Burger</strong> is a flavor-packed Halal beef patty loaded with fresh veggies, special sauces, and sometimes crispy fries, all wrapped in soft lavash bread. It's become a cult favorite on campus. If you're craving something handheld between classes, this is your move.</p>

<h3>🥟 Mantu (Afghan Dumplings)</h3>
<p>Steamed dumplings stuffed with spiced ground beef and onions, smothered in a garlicky yogurt sauce and a rich tomato-lentil topping with dried mint. Think of it as Afghan dim sum—and once you try it, you'll be hooked.</p>

<h3>🫓 Bolani</h3>
<p>The ultimate shareable appetizer. A crispy, pan-fried Afghan flatbread stuffed with potatoes, leeks, and herbs, served with cilantro-mint chutney. Perfect for splitting with your study group.</p>

<h3>🥩 Chapli Kabab Wrap</h3>
<p>Our signature Pashtun-style spiced beef patty, wrapped in fresh Afghan bread with chutneys and veggies. It's portable, packed with flavor, and under $12. The ultimate grab-and-go meal for busy students.</p>

<h2>How to Get Here from CSUN</h2>
<p>Getting to Bigi Awasaana from the CSUN campus couldn't be easier:</p>
<ol>
  <li>Head <strong>south on Reseda Blvd</strong> from campus</li>
  <li>Cross Vanowen St and continue south</li>
  <li>We're on the <strong>right side at 18411 Victory Blvd</strong>, at the intersection of Reseda Blvd and Victory Blvd</li>
  <li>Total drive: <strong>~7 minutes</strong> (2.5 miles)</li>
</ol>

<p><strong>No car? No problem.</strong> We deliver to the CSUN area through <strong>DoorDash</strong> and <strong>Uber Eats</strong>. You can also call <a href="tel:+13239211646">(323) 921-1646</a> to place a pickup order and have it ready when you arrive.</p>

<h2>Halal Catering for CSUN Clubs & Events</h2>
<p>Running a campus club, MSA event, or Greek life gathering? We offer <a href="/catering">Halal catering packages</a> that are perfect for student organizations. From kabob platters for 20 to full buffet spreads for 200+, we'll handle the food so you can focus on your event.</p>

<p>We've catered events for student organizations across the Valley, and we offer <strong>flexible packages</strong> that work within student budgets. <a href="/catering">Get a catering quote here</a> or call us to discuss your needs.</p>

<h2>Other Halal Options Near CSUN</h2>
<p>We love the Northridge Halal food scene—it's one of the best in LA. Here are some other spots CSUN students enjoy:</p>
<ul>
  <li><strong>The Halal Shack</strong> — Right on campus at 18111 Nordhoff St. Great for a quick bite between classes.</li>
  <li><strong>Halal House</strong> — On Reseda Blvd in Northridge. Casual build-your-own plates and burgers.</li>
  <li><strong>Biriyani Kabob House</strong> — Also on Reseda Blvd. Pakistani and Indian cuisine with solid biryani.</li>
</ul>

<p>But when you want <strong>real, coal-fired Afghan kabobs</strong> made from scratch with 100% Zabiha Halal ingredients—the kind of food that tastes like it was made in a Kabul street kitchen—Bigi Awasaana is where you need to be.</p>

<h2>Visit Us Today</h2>
<p><strong>Bigi Awasaana</strong> is located at <strong>18411 Victory Blvd, Reseda, CA 91335</strong>, just 7 minutes south of CSUN. We're open <strong>every day from 12 PM to 10:30 PM</strong>.</p>

<p><em>Check out our <a href="/menu">full menu</a>, <a href="/catering">order catering</a>, or just swing by after class. Your taste buds will thank you. 🔥</em></p>
`;

async function publish() {
  try {
    console.log("Publishing CSUN blog post...");

    const postData = {
      title: "Best Halal Food Near CSUN Northridge: A Student's Guide to Bigi Awasaana",
      slug: "best-halal-food-near-csun-northridge",
      excerpt: "Looking for the best Halal food near CSUN? Bigi Awasaana in Reseda is just 7 minutes from campus, serving authentic coal-fired Afghan kabobs, Afghan Burgers, Mantu dumplings, and more—all 100% Zabiha Halal. Here's what to order.",
      keywords: "Halal food near CSUN, Halal food Northridge, Halal restaurant near CSUN Northridge, Afghan food near me, best Halal food San Fernando Valley, Zabiha Halal Northridge, CSUN food options, Halal food delivery CSUN, Halal catering CSUN, Afghan restaurant Reseda",
      content: blogContent,
      coverImage: "/images/blog/afghan_food_spread_guide.jpg",
      isPublished: true,
      updatedAt: FieldValue.serverTimestamp(),
      publishedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('posts').add(postData);
    console.log(`✅ Published! Post ID: ${docRef.id}`);
    console.log(`   URL: https://bigiawasaana.com/blog/best-halal-food-near-csun-northridge`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

publish();
