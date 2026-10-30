const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

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

// Utility: Tokenize and normalize words, filtering out common domain words
function tokenize(text) {
  if (!text) return new Set();
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'our', 'we', 'you', 'your', 'this', 'why', 'what', 'how',
    // Universal domain/location words that every post shares
    'halal', 'food', 'reseda', 'san', 'fernando', 'valley', 'los', 'angeles',
    'bigi', 'awasaana', 'best', 'guide', 'near', 'california', 'eat', 'eats',
    'restaurant', 'restaurants', 'truck', 'kitchen', 'order', 'menu', 'served'
  ]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  );
}

// Compute Jaccard Similarity between two sets
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }
  const unionCount = new Set([...setA, ...setB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

async function runAudit() {
  const args = process.argv.slice(2);
  let proposedTitle = '';
  let proposedKeywords = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      proposedTitle = args[i + 1];
      i++;
    } else if (args[i] === '--keywords' && args[i + 1]) {
      proposedKeywords = args[i + 1];
      i++;
    }
  }

  const snap = await db.collection('posts').get();
  const posts = [];
  snap.forEach(doc => {
    const d = doc.data();
    posts.push({
      id: doc.id,
      slug: d.slug,
      title: d.title || '',
      keywords: d.keywords || '',
      excerpt: d.excerpt || '',
      isPublished: d.isPublished !== false
    });
  });

  console.log(`\n===============================================================`);
  console.log(`🔍 BIGI AWASAANA BLOG TOPIC & KEYWORD CANNIBALIZATION AUDITOR`);
  console.log(`Total Posts in Database: ${posts.length}`);
  console.log(`===============================================================\n`);

  // MODE A: Evaluate proposed new topic
  if (proposedTitle || proposedKeywords) {
    console.log(`Evaluating Proposed Topic:`);
    console.log(`  Title:    "${proposedTitle}"`);
    console.log(`  Keywords: "${proposedKeywords}"\n`);

    const proposedTokens = tokenize(`${proposedTitle} ${proposedKeywords}`);
    let highestSim = 0;
    let closestPost = null;
    const matches = [];

    for (const p of posts) {
      const existingTokens = tokenize(`${p.title} ${p.keywords}`);
      const sim = jaccardSimilarity(proposedTokens, existingTokens);
      if (sim > 0.20) {
        matches.push({ post: p, sim });
      }
      if (sim > highestSim) {
        highestSim = sim;
        closestPost = p;
      }
    }

    if (matches.length === 0) {
      console.log(`✅ VERDICT: 100% SAFE TO WRITE (Unique Topic)`);
      console.log(`   Highest similarity was ${(highestSim * 100).toFixed(1)}% with "${closestPost?.title || 'None'}".`);
      console.log(`   No topic or keyword cannibalization detected with existing posts.`);
      process.exit(0);
    } else {
      console.log(`⚠️  VERDICT: POTENTIAL TOPIC COLLISION / CANNIBALIZATION DETECTED!`);
      console.log(`   The proposed topic overlaps with ${matches.length} existing post(s):`);
      matches.sort((a, b) => b.sim - a.sim);
      for (const m of matches) {
        console.log(`   - [${(m.sim * 100).toFixed(1)}% Topic Match] "${m.post.title}" (/blog/${m.post.slug})`);
        console.log(`     Keywords: ${m.post.keywords}`);
      }
      console.log(`\n💡 INSTRUCTION:`);
      console.log(`   Differentiate the angle (e.g. specific landmark, nutritional macro, culinary history) before writing.`);
      process.exit(1);
    }
  }

  // MODE B: Full database pairwise collision scan
  console.log(`Scanning all published posts for topic-specific cannibalization...\n`);
  const collisions = [];

  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const p1 = posts[i];
      const p2 = posts[j];
      const t1 = tokenize(`${p1.title} ${p1.keywords}`);
      const t2 = tokenize(`${p2.title} ${p2.keywords}`);
      const sim = jaccardSimilarity(t1, t2);

      if (sim >= 0.25) {
        collisions.push({ p1, p2, sim });
      }
    }
  }

  if (collisions.length === 0) {
    console.log(`✅ CLEAN: Zero topic-specific collisions detected across all ${posts.length} posts!`);
    console.log(`   Every single post now targets a unique, non-competing search intent.`);
  } else {
    console.log(`⚠️  Detected ${collisions.length} remaining pair(s) with similarity >= 25%:`);
    collisions.sort((a, b) => b.sim - a.sim);
    for (const c of collisions) {
      console.log(`- Overlap ${(c.sim * 100).toFixed(1)}%:`);
      console.log(`    A: [${c.p1.slug}] "${c.p1.title}"`);
      console.log(`    B: [${c.p2.slug}] "${c.p2.title}"`);
    }
  }
}

runAudit().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
