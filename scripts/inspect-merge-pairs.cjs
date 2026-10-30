const fs = require('fs');
const posts = JSON.parse(fs.readFileSync('backups/posts-20261026.json', 'utf8'));

const pairs = [
  {
    source: 'halal-smash-burger-reseda',
    target: 'halal-smash-burger-reseda-tarzana'
  },
  {
    source: '100-percent-zabiha-halal-meat-san-fernando-valley',
    target: 'zabiha-halal-food-reseda-san-fernando-valley'
  },
  {
    source: 'afghan-party-trays-family-catering-los-angeles',
    target: 'best-halal-catering-los-angeles-weddings-events'
  },
  {
    source: 'what-to-order-afghan-restaurant-guide-los-angeles',
    target: 'complete-guide-to-afghan-food-los-angeles'
  },
  {
    source: '7-afghan-dishes-to-try',
    target: 'complete-guide-to-afghan-food-los-angeles'
  },
  {
    source: 'ultimate-guide-authentic-afghan-street-food-los-angeles',
    target: 'complete-guide-to-afghan-food-los-angeles'
  }
];

pairs.forEach(({ source, target }) => {
  const srcPost = posts.find(p => p.slug === source);
  const tgtPost = posts.find(p => p.slug === target);

  console.log(`\n======================================================`);
  console.log(`PAIR: ${source} -> ${target}`);
  console.log(`Source found: ${!!srcPost}, Target found: ${!!tgtPost}`);
  if (srcPost && tgtPost) {
    console.log(`Source Title: ${srcPost.title}`);
    console.log(`Target Title: ${tgtPost.title}`);
    console.log(`Source Length: ${(srcPost.content || '').length} chars`);
    console.log(`Target Length: ${(tgtPost.content || '').length} chars`);

    // Extract H2s from both
    const srcH2s = [...(srcPost.content || '').matchAll(/<h2>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    const tgtH2s = [...(tgtPost.content || '').matchAll(/<h2>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    console.log(`Source H2s:`, srcH2s);
    console.log(`Target H2s:`, tgtH2s);
  }
});
