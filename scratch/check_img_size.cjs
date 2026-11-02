const fs = require('fs');
// Let's see how big the file is
const stats = fs.statSync('scratch/live_scroll_zabiha_1280.png');
console.log('File size:', stats.size);
