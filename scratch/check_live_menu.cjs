const https = require('https');

https.get('https://www.bigiawasaana.com/menu', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Live status:', res.statusCode);
    console.log('Live HTML length:', data.length);
    const cardMatches = data.match(/class="menu-card"/g) || [];
    console.log('Total class="menu-card" on live menu:', cardMatches.length);
    const titles = [...data.matchAll(/class="menu-card-title"[^>]*>(.*?)<\/h3>/g)].map(m => m[1].trim());
    console.log('Total menu-card-title count on live menu:', titles.length);
    const titleCounts = {};
    titles.forEach(t => titleCounts[t] = (titleCounts[t] || 0) + 1);
    console.log('Duplicate titles on live menu:');
    console.log(titleCounts);
  });
}).on('error', console.error);
