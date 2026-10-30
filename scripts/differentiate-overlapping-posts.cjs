const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore } = require('firebase-admin/firestore');
const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: 'bigi-awasaana-7b3ce' });
}
const db = getFirestore();

const updates = [
  {
    id: 'MsSjn6ozXNDn3dqpI2ro',
    title: 'The Art of the Lacy Edge: The Food Science Behind Our 450° Halal Smash Burger',
    excerpt: 'Ever wondered how we get those ultra-crispy, lacy caramelized edges on our Halal smash burgers? Discover the high-heat cast iron sear technique and Maillard reaction science at Bigi Awasaana.',
    keywords: 'smash burger lacy edges, smash burger sear technique, maillard reaction burger, halal smash burger science, crispy edge burger reseda'
  },
  {
    id: 'kUKXb41MzLsv2PoUU9Q5',
    title: 'Behind the Butcher Block: How Bigi Awasaana Verifies 100% Hand-Slaughtered Zabiha Halal Meat',
    excerpt: 'Transparency is everything in Halal dining. Step inside Bigi Awasaana’s kitchen to see our strict supplier verification, butcher standards, and 100% hand-slaughtered Zabiha protocols in Reseda.',
    keywords: 'halal meat sourcing los angeles, hand slaughtered meat supplier verification, certified zabiha suppliers sfv, ethical halal meat transparency reseda, butcher standards halal'
  },
  {
    id: 'elUoHbHH65zykPnFkl5r',
    title: 'Halal Wedding & Corporate Catering in Los Angeles: Afghan Charcoal Buffets & Event Menus',
    excerpt: 'Planning a wedding, formal reception, or corporate event in Los Angeles? Bigi Awasaana delivers full-service halal catering, coal-fired kabobs, and custom event buffets across the Valley.',
    keywords: 'halal wedding catering los angeles, halal corporate catering valley, afghan wedding banquet reseda, corporate event food catering sfv, halal banquet buffet la'
  },
  {
    id: 'gexP4Lhb2x9BaBPXHn4G',
    title: 'Feeding a Family for Under $50: Affordable Halal Dinner Combos in the San Fernando Valley',
    excerpt: 'Tired of spending $50 on fast food that leaves everyone hungry? Here is how to feed a family of 4 with coal-fired halal kabobs, saffron rice, and fresh bolani under $50 in Reseda.',
    keywords: 'halal family meal under 50, affordable halal dinner reseda, cheap family eats victory blvd, halal budget dinner valley, family dinner combos reseda'
  },
  {
    id: 'KEy4EvArdpBxxDtjONvK',
    title: 'Eid & Family Gathering Platters: Authentic Afghan Party Trays for 15 to 100+ Guests',
    excerpt: 'Host memorable Eid celebrations, birthday feasts, and family gatherings with large-format Afghan party trays, Lamb Qabuli Palaw pans, and charcoal skewer platters from Bigi Awasaana.',
    keywords: 'afghan party trays los angeles, eid catering platters reseda, halal family platters valley, qabuli palao tray order, large group halal food la'
  },
  {
    id: '7-afghan-dishes-to-try-if-youve-never-had-afghan-food',
    title: 'The Afghan Food Bucket List: 7 Iconic Dishes Every LA Food Lover Must Taste Once',
    excerpt: 'New to Afghan culinary traditions? From jewel-toned Qabuli Palaw to crispy pan-seared Bolani and fragrant charcoal kabobs, here is your essential 7-dish foodie tasting bucket list.',
    keywords: 'must try afghan dishes los angeles, famous afghan food list, afghan dishes bucket list, top 7 afghan foods to try, best afghan dishes la'
  },
  {
    id: 'Kp5gvQewWXh1w4ROFDSl',
    title: "How to Order at an Afghan Restaurant: First-Timer's Guide to Courses, Sauces & Dish Pairings",
    excerpt: 'Stepping into an Afghan restaurant for the first time? Learn the secret to balancing appetizers, spiced rice courses, coal-fired kabobs, and yogurt-chutney sauce pairings like a seasoned pro.',
    keywords: 'how to order at an afghan restaurant, afghan food ordering guide, afghan food pairings, what to order first time afghan food, how to eat mantu dumplings'
  },
  {
    id: 'r3JdU6R6sTK3AF98KIRx',
    title: 'Kabul Street Food in LA: Handheld Bolani, Silk Road Wraps & Midnight Charcoal Grills',
    excerpt: 'Experience authentic Kabul street food culture in Los Angeles. Discover how handheld potato leek Bolani, Silk Road burger wraps, and late-night charcoal grills define Afghan fast-casual dining.',
    keywords: 'afghan street food culture los angeles, street food kabul la, handheld afghan street snacks, quick afghan takeout reseda, afghan burger food truck'
  }
];

async function applyDifferentiations() {
  console.log('Applying SEO differentiations across overlapping post clusters...');
  for (const item of updates) {
    const docRef = db.collection('posts').doc(item.id);
    const snap = await docRef.get();
    if (snap.exists) {
      await docRef.update({
        title: item.title,
        excerpt: item.excerpt,
        keywords: item.keywords
      });
      console.log(`[UPDATED] ${item.id} -> "${item.title}"`);
    } else {
      console.warn(`[NOT FOUND] ${item.id}`);
    }
  }
  console.log('All differentiations successfully applied.');
}

applyDifferentiations().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
