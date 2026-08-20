const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const cors = require('cors');
const { Client, Environment } = require('square');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// CORS middleware
const corsHandler = cors({ origin: true });

const TAX_RATE = 0.1025; // LA County / Reseda sales tax rate

function getSquareClient() {
  const config = functions.config().square || {};
  const accessToken = config.access_token || process.env.SQUARE_ACCESS_TOKEN;
  const env = config.env || process.env.SQUARE_ENV || 'sandbox';

  if (!accessToken) {
    throw new Error('Square access token not configured. Run: firebase functions:config:set square.access_token="YOUR_TOKEN"');
  }

  return new Client({
    accessToken,
    environment: env === 'production' ? Environment.Production : Environment.Sandbox,
  });
}

function getLocationId() {
  const config = functions.config().square || {};
  return config.location_id || process.env.SQUARE_LOCATION_ID;
}

module.exports = {
  functions,
  admin,
  db,
  corsHandler,
  TAX_RATE,
  getSquareClient,
  getLocationId
};
