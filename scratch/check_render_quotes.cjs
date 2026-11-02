const fs = require('fs');
const cateringJs = fs.readFileSync('src/admin/catering.js', 'utf8');

const match = cateringJs.match(/function renderQuotesTable[\s\S]*?function renderPackageRequestsTable/i);
console.log(match ? match[0] : 'Not matched');
