const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

html = html.replace(/<div style="max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; flex: 1;">/g, '<div style="max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; flex: 1; min-height: 0;">');
html = html.replace(/<div style="max-width: 800px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; flex: 1;">/g, '<div style="max-width: 800px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; flex: 1; min-height: 0;">');

fs.writeFileSync('admin.html', html, 'utf8');
