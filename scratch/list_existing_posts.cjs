const fs = require('fs');
const content = fs.readFileSync('scripts/analyze-topics-and-keywords.cjs', 'utf8');
const match = content.match(/const EXISTING_POSTS = (\[[\s\S]*?\]);/);
if (match) {
  const posts = eval(match[1]);
  posts.forEach((p, idx) => console.log((idx+1) + '. [' + p.slug + '] ' + p.title));
}
