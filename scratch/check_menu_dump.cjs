const fs = require('fs');

if (fs.existsSync('scratch/live_menu_dump.json')) {
  const data = JSON.parse(fs.readFileSync('scratch/live_menu_dump.json', 'utf8'));
  console.log('Found live_menu_dump.json, count:', data.length);
  data.forEach(it => {
    console.log(`- [${it.id}] "${it.name}" ($${it.price}) featured: ${it.featured} hidden: ${it.hidden}`);
  });
} else {
  console.log('scratch/live_menu_dump.json does not exist');
}
