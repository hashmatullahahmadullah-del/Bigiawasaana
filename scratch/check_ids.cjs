const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');

const navTargets = [
  'dashboard-view',     'live-orders-view',
  'menu-manage-view',   'tv-layout-view',
  'retail-manage-view', 'shipping-manage-view',
  'inventory-view',     'customers-view',
  'orders-view',        'reviews-view',
  'loyalty-view',       'catering-view',
  'marketing-view',     'pickup-view',
  'economics-view',     'analytics-view',
  'expense-view',       'blog-management',
  'settings-view'
];

navTargets.forEach(t => {
  const hasId = html.includes(`id="${t}"`);
  console.log(`Target ${t}: ${hasId ? 'FOUND' : 'NOT FOUND'}`);
});
