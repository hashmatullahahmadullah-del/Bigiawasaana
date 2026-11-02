const fs = require('fs');

const indexPath = 'src/admin/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// Ensure renderDashboard is called when reviews update
content = content.replace(
  `    renderReviews();
  }, (err) => {`,
  `    renderReviews();
    renderDashboard();
  }, (err) => {`
);

// Ensure renderDashboard is called when catering quotes update
content = content.replace(
  `    if (typeof window.renderConfirmedBookings === 'function') window.renderConfirmedBookings();
  }, (err) => {`,
  `    if (typeof window.renderConfirmedBookings === 'function') window.renderConfirmedBookings();
    renderDashboard();
  }, (err) => {`
);

// Ensure renderDashboard is called when catering agreements update
content = content.replace(
  `    if (typeof window.renderCateringWaivers === 'function') window.renderCateringWaivers();
    const badge = document.getElementById('badge-cat-waivers');`,
  `    if (typeof window.renderCateringWaivers === 'function') window.renderCateringWaivers();
    renderDashboard();
    const badge = document.getElementById('badge-cat-waivers');`
);

// Ensure renderDashboard is called when catering inquiries update
content = content.replace(
  `    if (typeof window.renderCateringInquiries === 'function') window.renderCateringInquiries();
    renderCatering();
  }, (err) => {`,
  `    if (typeof window.renderCateringInquiries === 'function') window.renderCateringInquiries();
    renderCatering();
    renderDashboard();
  }, (err) => {`
);

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Successfully wired real-time listeners in src/admin/index.js to update renderDashboard!');
