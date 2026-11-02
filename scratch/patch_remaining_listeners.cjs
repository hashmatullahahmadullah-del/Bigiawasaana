const fs = require('fs');

// expenses.js
let exp = fs.readFileSync('src/admin/expenses.js', 'utf8');
exp = exp.replace(
  `  window.analyticsUnsub = onSnapshot(aq, (snapshot) => {`,
  `  window.analyticsUnsub = onSnapshot(aq, (snapshot) => {`
);
// Find the end of window.analyticsUnsub
const aqStart = exp.indexOf('window.analyticsUnsub = onSnapshot(aq, (snapshot) => {');
if (aqStart !== -1) {
  // Let's find the closing of this onSnapshot call
  // It ends before "window.initEconomicsListeners"
  const marker = '// 5. Initialize listeners for Expenses collection';
  const sub = exp.substring(aqStart, exp.indexOf(marker));
  const lastParen = sub.lastIndexOf('});');
  if (lastParen !== -1) {
    const updatedSub = sub.substring(0, lastParen) + `}, (err) => {\n    console.warn('Page views analytics notice:', err);\n  });`;
    exp = exp.replace(sub, updatedSub);
    console.log('expenses.js aq patched');
  }
}

// Find expensesQuery in expenses.js
const expQStart = exp.indexOf('window.expensesUnsub = onSnapshot(expensesQuery, (snapshot) => {');
if (expQStart !== -1) {
  const marker2 = 'window.openReceiptSlideOver = (receipt) => {';
  const sub2 = exp.substring(expQStart, exp.indexOf(marker2));
  const lastParen2 = sub2.lastIndexOf('});');
  if (lastParen2 !== -1) {
    const updatedSub2 = sub2.substring(0, lastParen2) + `}, (err) => {\n        console.warn('Expenses listener notice:', err);\n      });`;
    exp = exp.replace(sub2, updatedSub2);
    console.log('expenses.js expensesQuery patched');
  }
}
fs.writeFileSync('src/admin/expenses.js', exp, 'utf8');

// menu.js
let menu = fs.readFileSync('src/admin/menu.js', 'utf8');
const menuStart = menu.indexOf('export function loadTvDisplaySettings() {\n  onSnapshot(doc(db, \'settings\', \'tv_display\'), (docSnap) => {');
if (menuStart !== -1) {
  const markerMenu = 'export function highlightActiveTheme(theme) {';
  const subMenu = menu.substring(menuStart, menu.indexOf(markerMenu));
  const lastParenMenu = subMenu.lastIndexOf('});');
  if (lastParenMenu !== -1) {
    const updatedSubMenu = subMenu.substring(0, lastParenMenu) + `}, (err) => {\n    console.warn('TV display settings notice:', err);\n  });`;
    menu = menu.replace(subMenu, updatedSubMenu);
    fs.writeFileSync('src/admin/menu.js', menu, 'utf8');
    console.log('menu.js patched');
  }
}

// settings.js
let set = fs.readFileSync('src/admin/settings.js', 'utf8');
const setStart = set.indexOf('export function loadPickupSettings() {\n  onSnapshot(doc(db, \'settings\', \'pickupConfig\'), (docSnap) => {');
if (setStart !== -1) {
  const markerSet = 'export const btnSavePickup = document.getElementById(\'btn-save-pickup\');';
  const subSet = set.substring(setStart, set.indexOf(markerSet));
  const lastParenSet = subSet.lastIndexOf('});');
  if (lastParenSet !== -1) {
    const updatedSubSet = subSet.substring(0, lastParenSet) + `}, (err) => {\n    console.warn('Pickup settings notice:', err);\n  });`;
    set = set.replace(subSet, updatedSubSet);
    fs.writeFileSync('src/admin/settings.js', set, 'utf8');
    console.log('settings.js patched');
  }
}

// deals.js
let deals = fs.readFileSync('src/admin/deals.js', 'utf8');
const dealsStart = deals.indexOf('const unsub = onSnapshot(collection(db, \'deals\'), (snapshot) => {');
if (dealsStart !== -1) {
  const markerDeals = 'return unsub;\n};';
  const subDeals = deals.substring(dealsStart, deals.indexOf(markerDeals));
  const lastParenDeals = subDeals.lastIndexOf('});');
  if (lastParenDeals !== -1) {
    const updatedSubDeals = subDeals.substring(0, lastParenDeals) + `}, (err) => {\n    console.warn('Deals notice:', err);\n  });`;
    deals = deals.replace(subDeals, updatedSubDeals);
    fs.writeFileSync('src/admin/deals.js', deals, 'utf8');
    console.log('deals.js patched');
  }
}

// retail.js
let retail = fs.readFileSync('src/admin/retail.js', 'utf8');
const retailTarget = `  // Real-time listener for retail items
  const q = query(collection(db, 'retail_items'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    retailItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRetailItems();
  });`;
const retailRepl = `  // Real-time listener for retail items
  const q = query(collection(db, 'retail_items'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    retailItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRetailItems();
  }, (err) => {
    console.warn('Retail items notice:', err);
  });`;
retail = retail.replace(retailTarget, retailRepl);
fs.writeFileSync('src/admin/retail.js', retail, 'utf8');
console.log('retail.js patched');

// blog.js
let blog = fs.readFileSync('src/admin/blog.js', 'utf8');
const blogStart = blog.indexOf('function loadBlogPosts() {\n    if (!blogList) return;\n    const q = query(collection(db, \'posts\'), orderBy(\'updatedAt\', \'desc\'));\n    onSnapshot(q, (snapshot) => {');
if (blogStart !== -1) {
  const markerBlog = 'const blogTabBtn = document.querySelector(\'[data-target="blog-view"]\');';
  const subBlog = blog.substring(blogStart, blog.indexOf(markerBlog));
  const lastParenBlog = subBlog.lastIndexOf('});');
  if (lastParenBlog !== -1) {
    const updatedSubBlog = subBlog.substring(0, lastParenBlog) + `}, (err) => {\n      console.warn('Blog posts notice:', err);\n    });`;
    blog = blog.replace(subBlog, updatedSubBlog);
    fs.writeFileSync('src/admin/blog.js', blog, 'utf8');
    console.log('blog.js patched');
  }
}
