const fs = require('fs');
let code = fs.readFileSync('functions/ssr.js', 'utf8');

const regex = /const snapshot = await db\.collection\('posts'\)[\s\S]*?\.limit\(50\)[\s\S]*?\.get\(\);/;

const replacement = `const snapshot = await db.collection('posts')
      .where('isPublished', '==', true)
      .get();

    const postsList = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'redirected') {
        postsList.push(data);
      }
    });

    postsList.sort((a, b) => {
      const timeA = a.updatedAt ? a.updatedAt.toMillis() : (a.publishedAt ? a.publishedAt.toMillis() : 0);
      const timeB = b.updatedAt ? b.updatedAt.toMillis() : (b.publishedAt ? b.publishedAt.toMillis() : 0);
      return timeB - timeA;
    });`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  code = code.replace('if (snapshot.empty) {', 'if (postsList.length === 0) {');
  code = code.replace(/snapshot\.forEach\(doc => \{\s*const post = doc\.data\(\);/, 'postsList.forEach(post => {');
  fs.writeFileSync('functions/ssr.js', code, 'utf8');
  console.log('Successfully patched functions/ssr.js renderBlogIndex');
} else {
  console.log('Regex did not match in functions/ssr.js');
}
