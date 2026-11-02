const fs = require('fs');
const mainJs = fs.readFileSync('src/main.js', 'utf8');

const defaultItemsMatch = mainJs.match(/const DEFAULT_MENU_ITEMS = \[([\s\S]*?)\];/);
if (defaultItemsMatch) {
  const itemsStr = defaultItemsMatch[0];
  const names = [...itemsStr.matchAll(/name:\s*['"](.*?)['"]/g)].map(m => m[1]);
  console.log('DEFAULT_MENU_ITEMS count:', names.length);
  const nameCounts = {};
  names.forEach(n => nameCounts[n] = (nameCounts[n] || 0) + 1);
  console.log('Duplicates in DEFAULT_MENU_ITEMS:', Object.entries(nameCounts).filter(([n, c]) => c > 1));
} else {
  console.log('DEFAULT_MENU_ITEMS not found with regex');
}
