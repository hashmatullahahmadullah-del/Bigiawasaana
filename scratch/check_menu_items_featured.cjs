const fs = require('fs');
const { ITEMS } = require('../scripts/menu-items-data.cjs');

console.log('Total items in menu-items-data.cjs:', ITEMS.length);
ITEMS.forEach(it => {
  console.log(`- [${it.id}] "${it.name}" ($${it.price}) featured: ${it.featured} img: ${it.img}`);
});
