const { ITEMS } = require('../scripts/menu-items-data.cjs');
console.log('Total ITEMS in scripts/menu-items-data.cjs:', ITEMS.length);
const ids = ITEMS.map(i => i.id);
const names = ITEMS.map(i => i.name);
console.log('Duplicate IDs in ITEMS:', ids.filter((id, i) => ids.indexOf(id) !== i));
console.log('Duplicate Names in ITEMS:', names.filter((n, i) => names.indexOf(n) !== i));
ITEMS.forEach(i => console.log(`- ${i.name} ($${i.price}) [id: ${i.id}, slug: ${i.slug}, cat: ${i.categoryName}]`));
