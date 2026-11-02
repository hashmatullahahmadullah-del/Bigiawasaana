const { ITEMS } = require('../scripts/menu-items-data.cjs');
console.log(`Loaded ${ITEMS.length} items from menu-items-data.cjs`);
ITEMS.forEach(it => {
  console.log(`${it.id} -> ${it.name} | img: ${it.img}`);
});
