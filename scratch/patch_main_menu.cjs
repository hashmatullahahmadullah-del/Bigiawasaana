const fs = require('fs');
const { ITEMS } = require('../scripts/menu-items-data.cjs');

const featuredSlugs = [
  'bigi-s-chapli-kabob',
  'bigi-s-kobideh-kabob-skewer',
  'bigi-s-chicken-tikka-kabob-plate',
  'bigi-s-silk-road-wrap-aka-afghan-burger',
  'bigi-s-qabuli-palau-lamb-shank',
  'bigi-s-bolani'
];

const cleanItems = ITEMS.map(it => ({
  id: it.id,
  name: it.name,
  desc: it.shortDesc,
  price: it.price,
  category: (it.categoryName || 'platters').toLowerCase(),
  img: it.img,
  slug: it.slug,
  featured: featuredSlugs.includes(it.slug)
}));

let code = fs.readFileSync('src/main.js', 'utf8');

// Replace DEFAULT_MENU_ITEMS
const defaultItemsStr = 'const DEFAULT_MENU_ITEMS = ' + JSON.stringify(cleanItems, null, 2) + ';';

const regexDefaults = /\/\/ Menu data loaded from Firestore \(with fallback default plates\)\r?\nconst DEFAULT_MENU_ITEMS = \[[\s\S]*?\];/;

if (regexDefaults.test(code)) {
  code = code.replace(regexDefaults, '// Menu data loaded from Firestore (with fallback canonical items)\n' + defaultItemsStr);
  console.log('DEFAULT_MENU_ITEMS replaced successfully in src/main.js');
} else {
  console.error('regexDefaults did not match');
}

// Fix loadMenuFromFirestore to fetch Firestore on homepage too
const oldLoadMenu = `async function loadMenuFromFirestore() {
  const grid = document.getElementById('menu-grid');
  if (!grid) {
    if (document.getElementById('featured-menu-grid')) {
      renderFeaturedMenu();
    }
    return;
  }
  await fetchMenuData();
}`;

const newLoadMenu = `async function loadMenuFromFirestore() {
  const grid = document.getElementById('menu-grid');
  const featuredGrid = document.getElementById('featured-menu-grid');
  if (!grid && !featuredGrid) {
    return;
  }
  await fetchMenuData();
}`;

if (code.includes('async function loadMenuFromFirestore() {')) {
  code = code.replace(
    /async function loadMenuFromFirestore\(\) \{[\s\S]*?await fetchMenuData\(\);\r?\n\}/,
    newLoadMenu
  );
  console.log('loadMenuFromFirestore replaced successfully in src/main.js');
}

fs.writeFileSync('src/main.js', code, 'utf8');
console.log('src/main.js saved');
