const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('unhandledrejection')) {
    console.log(`Found unhandledrejection in ${f}`);
  }
  if (content.includes('global-error')) {
    console.log(`Found global-error in ${f}`);
  }
});
