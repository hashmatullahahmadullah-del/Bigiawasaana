const fs = require('fs');
const html = fs.readFileSync('dist/index.html', 'utf8');
const start = html.indexOf('id="featured-menu-grid"');
if (start !== -1) {
  console.log("FOUND featured-menu-grid!");
  const slice = html.substring(start, start + 1500);
  console.log(slice);
} else {
  console.log("NOT FOUND");
}
