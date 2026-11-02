// Check widths
const items = [
  { name: 'logo', w: 44 },
  { name: 'MENU', w: 32 },
  { name: 'ORDER NOW', w: 105 },
  { name: 'LOCATION', w: 56 },
  { name: 'CATERING', w: 57 },
  { name: 'BLOG', w: 30 },
  { name: 'SHOP', w: 30 },
  { name: 'MY ORDERS', w: 65 },
  { name: 'Sign In', w: 85 },
  { name: 'EN | فا', w: 55 }
];

const totalItemsW = items.reduce((acc, i) => acc + i.w, 0);
console.log("Total items width (without phone):", totalItemsW); // 559px

// With container padding (48px) and 9 gaps of 12px (108px):
const totalNeeded = totalItemsW + 48 + 108;
console.log("Total width needed with 12px gap:", totalNeeded); // 715px

// Even at 961px viewport, nav width is 961 - 32 = 929px!
console.log("Surplus space at 961px:", 929 - totalNeeded); // 214px breathing room!
