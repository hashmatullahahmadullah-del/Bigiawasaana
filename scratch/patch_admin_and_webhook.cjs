const fs = require('fs');

// 1. Patch functions/orders.js
let ordersCode = fs.readFileSync('functions/orders.js', 'utf8');

// Update imports
ordersCode = ordersCode.replace(
  "const { functions, admin, db, getSquareClient, getLocationId, corsHandler } = require('./shared');",
  "const { functions, admin, db, getSquareClient, getLocationId, corsHandler, isAdminContext } = require('./shared');"
);

// Update handleSquareWebhook signature verification
const webhookSigTarget = `exports.handleSquareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const event = req.body;`;

const webhookSigReplacement = `exports.handleSquareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // ── Verify Square Webhook HMAC-SHA256 Signature ──
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || (functions.config().square && functions.config().square.webhook_signature_key);
  const signature = req.headers['x-square-hmacsha256-signature'] || req.headers['x-square-signature'];

  if (signatureKey) {
    if (!signature) {
      console.warn('[Square Webhook] Rejected: Missing signature header.');
      return res.status(401).send('Missing webhook signature');
    }
    try {
      const notificationUrl = \`\${req.protocol}://\${req.get('host')}\${req.originalUrl}\`;
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', signatureKey);
      hmac.update(notificationUrl + rawBody);
      const expectedSignature = hmac.digest('base64');

      const bufA = Buffer.from(signature);
      const bufB = Buffer.from(expectedSignature);
      const isValid = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

      if (!isValid) {
        console.error('[Square Webhook] Rejected: Invalid HMAC signature.');
        return res.status(401).send('Invalid webhook signature');
      }
    } catch (sigErr) {
      console.error('[Square Webhook] Error verifying signature:', sigErr);
      return res.status(401).send('Error verifying webhook signature');
    }
  }

  try {
    const event = req.body;`;

if (ordersCode.includes("exports.handleSquareWebhook = functions.https.onRequest(async (req, res) => {")) {
  ordersCode = ordersCode.replace(webhookSigTarget, webhookSigReplacement);
}

// Update admin checks in orders.js
ordersCode = ordersCode.replace(
  "if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {\n    throw new functions.https.HttpsError('permission-denied', 'Only admins can update Square orders.');\n  }",
  "if (!isAdminContext(context)) {\n    throw new functions.https.HttpsError('permission-denied', 'Only admins can update Square orders.');\n  }"
);
ordersCode = ordersCode.replace(
  "if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {\n    throw new functions.https.HttpsError('permission-denied', 'Only administrators can issue refunds.');\n  }",
  "if (!isAdminContext(context)) {\n    throw new functions.https.HttpsError('permission-denied', 'Only administrators can issue refunds.');\n  }"
);
ordersCode = ordersCode.replace(
  "const isAdmin = context.auth?.token?.email === 'bigiawasaana@gmail.com';",
  "const isAdmin = isAdminContext(context);"
);
ordersCode = ordersCode.replace(
  "const isAdmin = context.auth?.token?.email === 'bigiawasaana@gmail.com';",
  "const isAdmin = isAdminContext(context);"
);

fs.writeFileSync('functions/orders.js', ordersCode, 'utf8');
console.log('functions/orders.js updated successfully');

// 2. Patch functions/parseReceipt.js
let parseReceiptCode = fs.readFileSync('functions/parseReceipt.js', 'utf8');
parseReceiptCode = parseReceiptCode.replace(
  "const { functions, admin, db } = require('./shared');",
  "const { functions, admin, db, isAdminContext } = require('./shared');"
);
parseReceiptCode = parseReceiptCode.replace(
  "if (!context.auth || !context.auth.token || context.auth.token.email !== 'bigiawasaana@gmail.com') {",
  "if (!isAdminContext(context)) {"
);
fs.writeFileSync('functions/parseReceipt.js', parseReceiptCode, 'utf8');
console.log('functions/parseReceipt.js updated successfully');

// 3. Patch functions/syncGoogleHours.js
let syncGoogleCode = fs.readFileSync('functions/syncGoogleHours.js', 'utf8');
if (!syncGoogleCode.includes('isAdminContext')) {
  syncGoogleCode = syncGoogleCode.replace(
    "const admin = require('firebase-admin');",
    "const admin = require('firebase-admin');\nconst { isAdminContext } = require('./shared');"
  );
  syncGoogleCode = syncGoogleCode.replace(
    "if (!request.auth || !request.auth.token || request.auth.token.email !== 'bigiawasaana@gmail.com') {",
    "if (!isAdminContext(request)) {"
  );
  fs.writeFileSync('functions/syncGoogleHours.js', syncGoogleCode, 'utf8');
  console.log('functions/syncGoogleHours.js updated successfully');
}

// 4. Patch functions/blogGen.js
let blogGenCode = fs.readFileSync('functions/blogGen.js', 'utf8');
if (!blogGenCode.includes('isAdminContext')) {
  blogGenCode = blogGenCode.replace(
    "const { GoogleGenAI } = require(\"@google/genai\");",
    "const { GoogleGenAI } = require(\"@google/genai\");\nconst { isAdminContext } = require(\"./shared\");"
  );
  blogGenCode = blogGenCode.replace(
    "if (!request.auth || !request.auth.token || request.auth.token.email !== 'bigiawasaana@gmail.com') {",
    "if (!isAdminContext(request)) {"
  );
  fs.writeFileSync('functions/blogGen.js', blogGenCode, 'utf8');
  console.log('functions/blogGen.js updated successfully');
}
