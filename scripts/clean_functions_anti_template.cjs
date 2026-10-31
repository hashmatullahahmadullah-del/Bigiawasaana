const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const { search, replace } of replacements) {
    if (typeof search === 'string') {
      if (content.includes(search)) {
        content = content.split(search).join(replace);
        changed++;
      }
    } else if (search instanceof RegExp) {
      if (search.test(content)) {
        content = content.replace(search, replace);
        changed++;
      }
    }
  }
  if (changed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${filePath} (${changed} replacement rules)`);
  }
}

// 1. Templates
const templateFiles = [
  'functions/area-template.html',
  'functions/item-template.html',
  'functions/shop-template.html',
  'functions/blog-template.html',
  'functions/blog-index-template.html',
  'functions/blog.html'
];

for (const tf of templateFiles) {
  replaceInFile(tf, [
    { search: 'Get Directions &rarr;', replace: 'Get directions' },
    { search: 'Get Directions →', replace: 'Get directions' },
    { search: 'Read More &rarr;', replace: 'Read guide' },
    { search: 'Read More →', replace: 'Read guide' },
    { search: 'Proceed to Checkout &rarr;', replace: 'Checkout' },
    { search: 'Proceed to Checkout →', replace: 'Checkout' }
  ]);
}

// 2. JS helpers
replaceInFile('functions/ssr.js', [
  { search: 'Build Catering Package &rarr;', replace: 'Build catering package' },
  { search: 'Build Catering Package →', replace: 'Build catering package' }
]);

replaceInFile('functions/catering-quotes.js', [
  { search: 'Review Proposal &amp; Pay Deposit &rarr;', replace: 'Review proposal &amp; pay deposit' },
  { search: 'Review Proposal &amp; Pay Deposit →', replace: 'Review proposal &amp; pay deposit' }
]);

console.log('--- functions/ anti-template clean done ---');
