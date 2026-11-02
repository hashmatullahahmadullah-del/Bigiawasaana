const fs = require('fs');
const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));

// 1. Add /admin/** rewrite before **
const rewrites = config.hosting.rewrites || [];
const adminIdx = rewrites.findIndex(r => r.source === '/admin');
const adminWildcardExists = rewrites.some(r => r.source === '/admin/**');

if (!adminWildcardExists && adminIdx !== -1) {
  rewrites.splice(adminIdx + 1, 0, {
    source: '/admin/**',
    destination: '/admin.html'
  });
}

// 2. Add admin order redirects
const redirects = config.hosting.redirects || [];
const newRedirects = [
  {
    source: '/admin/orders.html',
    destination: '/admin?view=live-orders#live-orders-view',
    type: 302
  },
  {
    source: '/admin/orders',
    destination: '/admin?view=live-orders#live-orders-view',
    type: 302
  },
  {
    source: '/admin/order-manager',
    destination: '/admin?view=live-orders#live-orders-view',
    type: 302
  },
  {
    source: '/admin/live-orders',
    destination: '/admin?view=live-orders#live-orders-view',
    type: 302
  }
];

// Add if not already present
for (let i = newRedirects.length - 1; i >= 0; i--) {
  const item = newRedirects[i];
  if (!redirects.some(r => r.source === item.source)) {
    redirects.unshift(item);
  }
}

config.hosting.rewrites = rewrites;
config.hosting.redirects = redirects;

fs.writeFileSync('firebase.json', JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log('firebase.json updated successfully.');
