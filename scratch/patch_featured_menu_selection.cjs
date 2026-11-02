const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

const regexMap = /menuItems = snapshot\.docs\.map\(doc => \{[\s\S]*?addOns: Array\.isArray\(data\.addOns\) \? data\.addOns : \[\]\r?\n\s*\};\r?\n\s*\}\);/;

const replacementMap = `menuItems = snapshot.docs.map(doc => {
        const data = doc.data();
        const itemName = data.name || 'Untitled';
        const itemSlug = data.slug || itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return {
          id: doc.id,
          name: itemName,
          slug: itemSlug,
          desc: data.desc || data.description || '',
          price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
          category: (data.category || 'platters').toLowerCase(),
          img: getSEOImageUrl(data.img || data.image || data.imageUrl || ''),
          featured: !!data.featured,
          hidden: !!data.hidden,
          mealLinkId: data.mealLinkId || null,
          calories: data.calories || null,
          variants: Array.isArray(data.variants) ? data.variants : [],
          addOns: Array.isArray(data.addOns) ? data.addOns : []
        };
      });
      window.menuItems = menuItems;`;

if (regexMap.test(code)) {
  code = code.replace(regexMap, replacementMap);
  console.log('menuItems snapshot mapping updated with slug');
} else {
  console.error('regexMap failed');
}

// Update renderFeaturedMenu selection
const oldFeaturedLogic = `  let featuredItems = menuItems.filter(item => item.featured && !item.hidden);
  
  // Fallback to first 3 items if no items are explicitly featured
  if (featuredItems.length === 0) {
    featuredItems = menuItems.filter(item => !item.hidden).slice(0, 3);
  }`;

const newFeaturedLogic = `  const SIGNATURE_SLUGS = [
    'bigi-s-chapli-kabob',
    'bigi-s-kobideh-kabob-skewer',
    'bigi-s-chicken-tikka-kabob-plate',
    'bigi-s-silk-road-wrap-aka-afghan-burger',
    'bigi-s-qabuli-palau-lamb-shank',
    'bigi-s-bolani'
  ];

  let featuredItems = menuItems.filter(item => item.featured && !item.hidden);
  
  // If no items are explicitly marked featured in Firestore, use verified signature items
  if (featuredItems.length === 0) {
    featuredItems = menuItems.filter(item => SIGNATURE_SLUGS.includes(item.slug) && !item.hidden);
  }
  // Fallback if needed: first 6 non-hidden items
  if (featuredItems.length === 0) {
    featuredItems = menuItems.filter(item => !item.hidden).slice(0, 6);
  }`;

if (code.includes('let featuredItems = menuItems.filter(item => item.featured && !item.hidden);')) {
  code = code.replace(oldFeaturedLogic, newFeaturedLogic);
  console.log('renderFeaturedMenu selection logic updated');
} else {
  console.log('oldFeaturedLogic regex fallback');
  code = code.replace(
    /let featuredItems = menuItems\.filter\(item => item\.featured && !item\.hidden\);[\s\S]*?featuredItems = menuItems\.filter\(item => !item\.hidden\)\.slice\(0, 3\);\r?\n\s*\}/,
    newFeaturedLogic
  );
}

fs.writeFileSync('src/main.js', code, 'utf8');
console.log('src/main.js updated');
