const fs = require('fs');

const files = ['index.html', 'catering.html', 'locations.html', 'menu.html', 'specials.html'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace phone numbers
    content = content.replace(/421-1646/g, '921-1646');
    content = content.replace(/4211646/g, '9211646');
    
    // Add SEO tags to index.html
    if (file === 'index.html') {
      if (!content.includes('og:image')) {
        const ogLocale = '<meta property="og:locale" content="en_US">';
        const ogImage = '<meta property="og:locale" content="en_US">\n  <meta property="og:image" content="https://bigiawasaana.com/og-image.jpg">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image" content="https://bigiawasaana.com/og-image.jpg">';
        content = content.replace(ogLocale, ogImage);
      }
      
      if (!content.includes('"image": "https://bigiawasaana.com/og-image.jpg"')) {
        const schemaUrl = '"url": "https://bigiawasaana.com",';
        const schemaImage = '"url": "https://bigiawasaana.com",\n    "image": "https://bigiawasaana.com/og-image.jpg",';
        content = content.replace(schemaUrl, schemaImage);
      }
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
