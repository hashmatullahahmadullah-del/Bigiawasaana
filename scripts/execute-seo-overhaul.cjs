const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce'
  });
}

const db = getFirestore();

// 20 Active Posts Metadata: 50-60 char title, 140-160 char meta description
const postMetaMap = {
  'complete-guide-to-afghan-food-los-angeles': {
    title: 'Afghan Food Guide: What to Eat in LA | Bigi Awasaana',
    excerpt: 'The definitive guide to authentic Afghan food in Los Angeles. Discover traditional kabobs, Qabuli Palou, crispy bolani, and halal street food in Reseda.'
  },
  'what-is-bolani-afghan-street-food': {
    title: 'What Is Bolani? Afghan Flatbread Guide | Bigi Awasaana',
    excerpt: 'Discover authentic Afghan bolani: crispy pan-fried flatbread stuffed with spiced potatoes and leeks, served with fresh cilantro chutney at Bigi Awasaana.'
  },
  'is-afghan-food-spicy-what-to-expect': {
    title: 'Is Afghan Food Spicy? Flavor Guide | Bigi Awasaana',
    excerpt: 'Wondering if Afghan food is spicy? Learn about authentic spices like coriander, cardamom, and sumac, plus how heat levels work at Bigi Awasaana in LA.'
  },
  'authentic-qabuli-palao-los-angeles': {
    title: 'Qabuli Palao in Los Angeles: Rice Guide | Bigi Awasaana',
    excerpt: 'Taste authentic Qabuli Palao in Los Angeles. Slow-braised halal lamb shank over spiced basmati rice with sweet carrots and raisins, cooked fresh daily.'
  },
  'chapli-kabab-vs-shami-kabab-guide': {
    title: 'Chapli vs. Shami Kabab: Which to Order | Bigi Awasaana',
    excerpt: 'Chapli kabab vs. shami kabab: discover the key differences in spices, beef cuts, and cooking styles between these two iconic Afghan charcoal favorites.'
  },
  'art-of-afghan-charcoal-kabobs-reseda': {
    title: 'Afghan Charcoal Kabobs in Reseda, LA | Bigi Awasaana',
    excerpt: 'Why real charcoal makes all the difference: taste authentic flame-seared beef tikka, chicken kabobs, and kobideh skewers grilled over live coals in Reseda.'
  },
  'what-is-an-afghan-burger-los-angeles': {
    title: 'What Is an Afghan Burger? LA Food Wrap | Bigi Awasaana',
    excerpt: "What is an Afghan burger? Inside LA's favorite street wrap with seasoned halal beef, crispy fries, fresh herbs, and spicy green chutney in Reseda, CA."
  },
  'best-halal-shawarma-wrap-reseda-valley': {
    title: 'Chicken vs. Beef Shawarma in the Valley | Bigi Awasaana',
    excerpt: 'Chicken vs. beef shawarma in the San Fernando Valley: discover how Bigi Awasaana carves, marinates, and griddle-toasts 100% Zabiha Halal wraps in Reseda.'
  },
  'halal-smash-burger-reseda-tarzana': {
    title: 'Halal Smash Burgers in Reseda & Tarzana | Bigi Awasaana',
    excerpt: 'Craving the crispiest halal smash burger in Reseda and Tarzana? Smashed at 450° on a hot griddle for lacy edges, melted cheese, and house smash sauce.'
  },
  'high-protein-halal-rice-bowls-reseda': {
    title: 'High-Protein Halal Rice Bowls in Reseda | Bigi Awasaana',
    excerpt: 'Fuel your post-workout recovery with high-protein halal chicken gyro and tikka rice bowls in Reseda, CA. Clean Zabiha protein over fragrant basmati rice.'
  },
  'zabiha-vs-halal-difference-explained': {
    title: 'Zabiha vs. Halal: Key Differences | Bigi Awasaana',
    excerpt: 'What is the difference between Zabiha and Halal? Learn why hand-slaughtered meat standards matter for quality, ethics, and purity when dining out in LA.'
  },
  'zabiha-halal-food-reseda-san-fernando-valley': {
    title: 'Zabiha Halal Food in Reseda & the Valley | Bigi Awasaana',
    excerpt: 'Where to find 100% hand-slaughtered Zabiha Halal food in Reseda, CA. Explore charcoal kabobs, smash burgers, and street wraps across the San Fernando Valley.'
  },
  'best-halal-catering-los-angeles-weddings-events': {
    title: 'Halal Catering in Los Angeles & Valley | Bigi Awasaana',
    excerpt: 'Premier 100% Zabiha Halal catering in Los Angeles for weddings, parties, and corporate events. Sizzling charcoal kabobs, Qabuli rice, and party trays.'
  },
  'best-halal-family-meals-under-50-san-fernando-valley': {
    title: 'Halal Family Meals Under $50 in the Valley | Bigi Awasaana',
    excerpt: 'Feed your entire family for under $50 in the San Fernando Valley. Generous portions of charcoal kabob skewers, basmati rice, crispy bolani, and salads.'
  },
  'best-halal-food-near-csun-northridge': {
    title: 'Halal Food Near CSUN Northridge, LA | Bigi Awasaana',
    excerpt: 'Looking for cheap halal student eats near CSUN Northridge? Bigi Awasaana is just 7 minutes south on Reseda Blvd with hot smash burgers and street wraps.'
  },
  'best-halal-food-near-pierce-college': {
    title: 'Halal Food Near Pierce College, Woodland | Bigi Awasaana',
    excerpt: 'Best halal food near Pierce College: quick bites under $15 along Victory Blvd. Enjoy hot smash burgers, street wraps, and rice bowls just 8 minutes away.'
  },
  'best-food-near-reseda-park-victory-blvd': {
    title: 'Best Food Near Reseda Park on Victory | Bigi Awasaana',
    excerpt: 'Looking for the best food near Reseda Park? Grab hot bolani, halal smash burgers, and street wraps right across Victory Blvd at Bigi Awasaana in Reseda.'
  },
  'halal-food-near-sherman-oaks-encino': {
    title: 'Halal Dinner Near Sherman Oaks & Encino | Bigi Awasaana',
    excerpt: 'Skip the Ventura Blvd traffic gridlock: enjoy 100% Zabiha Halal charcoal kabobs and Qabuli Palau with easy free parking just minutes north in Reseda, CA.'
  },
  'best-late-night-halal-food-san-fernando-valley': {
    title: 'Late Night Halal Food in the Valley | Bigi Awasaana',
    excerpt: 'Craving late night halal food in the San Fernando Valley? Bigi Awasaana serves hot charcoal kabobs, smash burgers, and wraps until 10:30 PM Mon–Sat.'
  },
  'afghan-food-dari-los-angeles': {
    title: 'غذای اصیل افغانی در لسانجلس | رستوران بیگی آواسانا',
    excerpt: 'بهترین غذای حلال و اصیل افغانی در لسانجلس و سن فرناندو ولی. کباب چوبی زغالی، بولانی داغ، قابلی پلو و همبرگر کابلی در رستوران بیگی آواسانا در ریسیدا.'
  }
};

// Internal Linking Matrix: 3 Related Guides for the bottom block of each post
const relatedGuidesMap = {
  'complete-guide-to-afghan-food-los-angeles': [
    { title: 'What Is Bolani? Afghan Flatbread Guide', slug: 'what-is-bolani-afghan-street-food' },
    { title: 'Qabuli Palao: Afghanistan National Dish', slug: 'authentic-qabuli-palao-los-angeles' },
    { title: 'Afghan Charcoal Kabobs: Real Coals', slug: 'art-of-afghan-charcoal-kabobs-reseda' }
  ],
  'what-is-bolani-afghan-street-food': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Is Afghan Food Spicy? Flavor Guide', slug: 'is-afghan-food-spicy-what-to-expect' },
    { title: 'What Is an Afghan Burger? Street Wrap', slug: 'what-is-an-afghan-burger-los-angeles' }
  ],
  'is-afghan-food-spicy-what-to-expect': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'What Is Bolani? Afghan Flatbread Guide', slug: 'what-is-bolani-afghan-street-food' },
    { title: 'Qabuli Palao: Afghanistan National Dish', slug: 'authentic-qabuli-palao-los-angeles' }
  ],
  'authentic-qabuli-palao-los-angeles': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Chapli vs. Shami Kabab Guide', slug: 'chapli-kabab-vs-shami-kabab-guide' },
    { title: 'Afghan Charcoal Kabobs in Reseda', slug: 'art-of-afghan-charcoal-kabobs-reseda' }
  ],
  'chapli-kabab-vs-shami-kabab-guide': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Afghan Charcoal Kabobs in Reseda', slug: 'art-of-afghan-charcoal-kabobs-reseda' },
    { title: 'What Is an Afghan Burger? Street Wrap', slug: 'what-is-an-afghan-burger-los-angeles' }
  ],
  'art-of-afghan-charcoal-kabobs-reseda': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Chapli vs. Shami Kabab Guide', slug: 'chapli-kabab-vs-shami-kabab-guide' },
    { title: 'Zabiha vs. Halal: Key Differences', slug: 'zabiha-vs-halal-difference-explained' }
  ],
  'what-is-an-afghan-burger-los-angeles': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Halal Smash Burgers in Reseda & Tarzana', slug: 'halal-smash-burger-reseda-tarzana' },
    { title: 'Chicken vs. Beef Shawarma in the Valley', slug: 'best-halal-shawarma-wrap-reseda-valley' }
  ],
  'best-halal-shawarma-wrap-reseda-valley': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'What Is an Afghan Burger? Street Wrap', slug: 'what-is-an-afghan-burger-los-angeles' },
    { title: 'High-Protein Halal Rice Bowls in Reseda', slug: 'high-protein-halal-rice-bowls-reseda' }
  ],
  'halal-smash-burger-reseda-tarzana': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'What Is an Afghan Burger? Street Wrap', slug: 'what-is-an-afghan-burger-los-angeles' },
    { title: 'Best Food Near Reseda Park on Victory', slug: 'best-food-near-reseda-park-victory-blvd' }
  ],
  'high-protein-halal-rice-bowls-reseda': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Chicken vs. Beef Shawarma in the Valley', slug: 'best-halal-shawarma-wrap-reseda-valley' },
    { title: 'Halal Food Near CSUN Northridge', slug: 'best-halal-food-near-csun-northridge' }
  ],
  'zabiha-vs-halal-difference-explained': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Zabiha Halal Food in Reseda & Valley', slug: 'zabiha-halal-food-reseda-san-fernando-valley' },
    { title: 'Afghan Charcoal Kabobs in Reseda', slug: 'art-of-afghan-charcoal-kabobs-reseda' }
  ],
  'zabiha-halal-food-reseda-san-fernando-valley': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Zabiha vs. Halal: Key Differences', slug: 'zabiha-vs-halal-difference-explained' },
    { title: 'Halal Dinner Near Sherman Oaks & Encino', slug: 'halal-food-near-sherman-oaks-encino' }
  ],
  'best-halal-catering-los-angeles-weddings-events': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Halal Family Meals Under $50 in Valley', slug: 'best-halal-family-meals-under-50-san-fernando-valley' },
    { title: 'Qabuli Palao: Afghanistan National Dish', slug: 'authentic-qabuli-palao-los-angeles' }
  ],
  'best-halal-family-meals-under-50-san-fernando-valley': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Halal Catering in Los Angeles & Valley', slug: 'best-halal-catering-los-angeles-weddings-events' },
    { title: 'Best Food Near Reseda Park on Victory', slug: 'best-food-near-reseda-park-victory-blvd' }
  ],
  'best-halal-food-near-csun-northridge': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Halal Food Near Pierce College', slug: 'best-halal-food-near-pierce-college' },
    { title: 'Late Night Halal Food in the Valley', slug: 'best-late-night-halal-food-san-fernando-valley' }
  ],
  'best-halal-food-near-pierce-college': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Halal Food Near CSUN Northridge', slug: 'best-halal-food-near-csun-northridge' },
    { title: 'Best Food Near Reseda Park on Victory', slug: 'best-food-near-reseda-park-victory-blvd' }
  ],
  'best-food-near-reseda-park-victory-blvd': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Halal Food Near Pierce College', slug: 'best-halal-food-near-pierce-college' },
    { title: 'Halal Smash Burgers in Reseda & Tarzana', slug: 'halal-smash-burger-reseda-tarzana' }
  ],
  'halal-food-near-sherman-oaks-encino': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Late Night Halal Food in the Valley', slug: 'best-late-night-halal-food-san-fernando-valley' },
    { title: 'Zabiha Halal Food in Reseda & Valley', slug: 'zabiha-halal-food-reseda-san-fernando-valley' }
  ],
  'best-late-night-halal-food-san-fernando-valley': [
    { title: 'Afghan Food Guide: What to Eat in LA', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'Halal Dinner Near Sherman Oaks & Encino', slug: 'halal-food-near-sherman-oaks-encino' },
    { title: 'What Is an Afghan Burger? Street Wrap', slug: 'what-is-an-afghan-burger-los-angeles' }
  ],
  'afghan-food-dari-los-angeles': [
    { title: 'راهنمای کامل غذای افغانی در لسانجلس', slug: 'complete-guide-to-afghan-food-los-angeles' },
    { title: 'کباب چوبی زغالی و اصیل در ریسیدا', slug: 'art-of-afghan-charcoal-kabobs-reseda' },
    { title: 'غذای حلال ذبیحه در سن فرناندو ولی', slug: 'zabiha-halal-food-reseda-san-fernando-valley' }
  ]
};

function buildRelatedGuidesHtml(guides) {
  if (!guides || !guides.length) return '';
  return `
<div class="blog-related-guides-block" style="margin-top: 50px; padding-top: 36px; border-top: 2px solid rgba(255,106,0,0.25);">
  <h3 style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; color: #FFFFFF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">Explore Related Culinary Guides</h3>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px;">
    ${guides.map(g => `
    <a href="/blog/${g.slug}" style="display: block; padding: 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; text-decoration: none; transition: all 0.2s;" onmouseover="this.style.borderColor='#FF6A00'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
      <span style="display: block; font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">${g.title}</span>
      <span style="font-size: 0.95rem; color: #FF6A00; font-weight: 600;">Read Guide &rarr;</span>
    </a>
    `).join('')}
  </div>
</div>
  `.trim();
}

async function run() {
  console.log('--- Step 1: Loading all posts from Firestore ---');
  const snap = await db.collection('posts').get();
  const allDocs = [];
  snap.forEach(doc => {
    allDocs.push({ id: doc.id, ...doc.data() });
  });

  const sourceSlugs = [
    { src: 'halal-smash-burger-reseda', tgt: 'halal-smash-burger-reseda-tarzana' },
    { src: '100-percent-zabiha-halal-meat-san-fernando-valley', tgt: 'zabiha-halal-food-reseda-san-fernando-valley' },
    { src: 'afghan-party-trays-family-catering-los-angeles', tgt: 'best-halal-catering-los-angeles-weddings-events' },
    { src: 'what-to-order-afghan-restaurant-guide-los-angeles', tgt: 'complete-guide-to-afghan-food-los-angeles' },
    { src: '7-afghan-dishes-to-try', tgt: 'complete-guide-to-afghan-food-los-angeles' },
    { src: 'ultimate-guide-authentic-afghan-street-food-los-angeles', tgt: 'complete-guide-to-afghan-food-los-angeles' }
  ];

  console.log('--- Step 2: Marking 6 source posts as status="redirected" ---');
  for (const { src, tgt } of sourceSlugs) {
    const doc = allDocs.find(d => d.slug === src);
    if (doc) {
      await db.collection('posts').doc(doc.id).update({
        status: 'redirected',
        isPublished: false,
        redirectUrl: `/blog/${tgt}`,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`Updated source post ${src} -> redirected to ${tgt}`);
    }
  }

  console.log('--- Step 3: Enriching target posts with unique source sections ---');
  // Enrich halal-smash-burger-reseda-tarzana with 450° sear section
  const smashDoc = allDocs.find(d => d.slug === 'halal-smash-burger-reseda-tarzana');
  if (smashDoc && !smashDoc.content.includes('450-Degree Sear')) {
    const enrichedSection = `
<h2>The Food Science of the 450-Degree Griddle Sear</h2>
<p>What gives our smash burgers their signature crispy edges is the rapid high-heat Maillard reaction. We press freshly ground 100% Zabiha Halal beef paper-thin against a seasoned 450° cast-iron griddle. The intense contact caramelizes the surface amino acids and natural fats in seconds, creating an ultra-crisp lacy rim while sealing natural meat juices tightly inside.</p>
    `;
    const updatedContent = smashDoc.content.replace('<h2>Menu-Verified Burger Options', enrichedSection + '\n<h2>Menu-Verified Burger Options');
    await db.collection('posts').doc(smashDoc.id).update({
      content: updatedContent,
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log('Enriched halal-smash-burger-reseda-tarzana with food science section.');
  }

  // Enrich zabiha-halal-food-reseda-san-fernando-valley with hand-slaughter verification
  const zabihaDoc = allDocs.find(d => d.slug === 'zabiha-halal-food-reseda-san-fernando-valley');
  if (zabihaDoc && !zabihaDoc.content.includes('Behind the Butcher Block')) {
    const enrichedSection = `
<h2>Behind the Butcher Block: Hand-Slaughtered Verification</h2>
<p>Unlike commercial operations relying on automated mechanical blade slaughter, Bigi Awasaana works exclusively with suppliers providing strict 100% hand-slaughtered Zabiha Halal beef, lamb, and chicken. Each cut undergoes complete ritual blood drainage, ensuring clean meat integrity, enhanced tenderness, and complete adherence to traditional standards.</p>
    `;
    const updatedContent = zabihaDoc.content.replace("<h2>What's on the Menu?", enrichedSection + "\n<h2>What's on the Menu?");
    await db.collection('posts').doc(zabihaDoc.id).update({
      content: updatedContent,
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log('Enriched zabiha-halal-food-reseda-san-fernando-valley with butcher block section.');
  }

  // Enrich best-halal-catering-los-angeles-weddings-events with guest portioning guide
  const cateringDoc = allDocs.find(d => d.slug === 'best-halal-catering-los-angeles-weddings-events');
  if (cateringDoc && !cateringDoc.content.includes('Portioning Guide for 15 to 100+ Guests')) {
    const enrichedSection = `
<h2>Party Tray Portioning Guide for 15 to 100+ Guests</h2>
<p>Planning an intimate family gathering or a massive corporate reception? Here is our recommended catering breakdown to ensure every guest leaves satisfied:</p>
<div class="blog-table-wrapper">
  <table class="blog-comparison-table">
    <thead>
      <tr>
        <th>Guest Count</th>
        <th>Kabob Skewers</th>
        <th>Basmati Rice Trays</th>
        <th>Bolani Flatbread Platters</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>15 – 20 Guests</strong></td>
        <td>20 – 25 Mixed Skewers</td>
        <td>1 Large Qabuli Palau Tray</td>
        <td>2 Sliced Bolani Platters</td>
      </tr>
      <tr>
        <td><strong>30 – 40 Guests</strong></td>
        <td>40 – 50 Mixed Skewers</td>
        <td>2 Large Qabuli Palau Trays</td>
        <td>4 Sliced Bolani Platters</td>
      </tr>
      <tr>
        <td><strong>50 – 75 Guests</strong></td>
        <td>75 – 90 Mixed Skewers</td>
        <td>4 Large Qabuli Palau Trays</td>
        <td>6 Sliced Bolani Platters</td>
      </tr>
      <tr>
        <td><strong>100+ Guests</strong></td>
        <td>120+ Custom Skewer Buffet</td>
        <td>6+ Large Rice Trays</td>
        <td>8+ Sliced Bolani Platters</td>
      </tr>
    </tbody>
  </table>
</div>
    `;
    const updatedContent = cateringDoc.content.replace('<h2>Events We Cater', enrichedSection + '\n<h2>Events We Cater');
    await db.collection('posts').doc(cateringDoc.id).update({
      content: updatedContent,
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log('Enriched best-halal-catering-los-angeles-weddings-events with portioning guide.');
  }

  console.log('--- Step 4: Updating all 20 Active Posts with Titles, Excerpts, Images & Related Guides ---');
  for (const doc of allDocs) {
    const meta = postMetaMap[doc.slug];
    if (!meta) continue;

    let content = doc.content || '';

    // Remove any previous related guides block so we can re-insert cleanly
    content = content.replace(/<div class=["']blog-related-guides-block[\s\S]*?<\/div>\s*<\/div>/gi, '');

    // Ensure link to pillar page if not already present (and not the pillar itself)
    if (doc.slug !== 'complete-guide-to-afghan-food-los-angeles' && doc.slug !== 'afghan-food-dari-los-angeles') {
      if (!content.includes('/blog/complete-guide-to-afghan-food-los-angeles')) {
        content = content.replace(
          /<\/p>/i,
          ` For a full overview of dishes and traditions, explore our <a href="/blog/complete-guide-to-afghan-food-los-angeles">complete guide to Afghan food in Los Angeles</a>.</p>`
        );
      }
    }

    // Ensure all <img> tags have loading="lazy", width and height
    content = content.replace(/<img([^>]+)>/gi, (match, attrs) => {
      let updated = match;
      if (!updated.includes('loading=')) {
        updated = updated.replace('<img', '<img loading="lazy"');
      }
      if (!updated.includes('width=') && !updated.includes('height=')) {
        updated = updated.replace('<img', '<img width="800" height="450"');
      }
      return updated;
    });

    // Add Related Guides block
    const related = relatedGuidesMap[doc.slug];
    if (related && related.length) {
      const relatedHtml = buildRelatedGuidesHtml(related);
      // Place right before closing </article> or </div>
      if (content.includes('</article>')) {
        content = content.replace('</article>', `${relatedHtml}\n</article>`);
      } else {
        content = content + `\n${relatedHtml}`;
      }
    }

    const updatePayload = {
      title: meta.title,
      excerpt: meta.excerpt,
      status: 'published',
      isPublished: true,
      content: content,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (doc.slug === 'afghan-food-dari-los-angeles') {
      updatePayload.language = 'fa-AF';
    }

    await db.collection('posts').doc(doc.id).update(updatePayload);
    console.log(`Updated on-page meta and links for: ${doc.slug}`);
  }

  console.log('\n--- All Firestore updates successfully completed! ---');
}

run().then(() => process.exit(0)).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
