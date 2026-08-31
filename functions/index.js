exports.parseReceipt = require("./parseReceipt").parseReceipt;
exports.processSquarePayment = require('./payments').processSquarePayment;
exports.syncSquareOrders = require('./orders').syncSquareOrders;
exports.syncSquareOrdersCron = require('./orders').syncSquareOrdersCron;
exports.handleSquareWebhook = require('./orders').handleSquareWebhook;
exports.updateSquareOrderStatus = require('./orders').updateSquareOrderStatus;
exports.updateLiveStats = require('./orders').updateLiveStats;
exports.releaseScheduledOrders = require('./orders').releaseScheduledOrders;
exports.verifyKdsPin = require('./auth').verifyKdsPin;
exports.renderBlogPage = require('./ssr').renderBlogPage;
exports.renderItemPage = require('./ssr').renderItemPage;
exports.renderAreaPage = require('./ssr').renderAreaPage;
exports.renderSitemap = require('./ssr').renderSitemap;
exports.onNewCateringInquiry = require('./catering').onNewCateringInquiry;
exports.generateSeoBlog = require('./blogGen').generateSeoBlog;
exports.renderBlogIndex = require('./ssr').renderBlogIndex;
exports.serveMenuImage = require('./images').serveMenuImage;
exports.syncGoogleHours = require('./syncGoogleHours').syncGoogleHours;
// Uncomment below to enable daily auto-sync of Google Maps hours at 3 AM LA time:
// exports.syncGoogleHoursCron = require('./syncGoogleHours').syncGoogleHoursCron;
exports.checkInventoryDeadlinesCron = require('./inventory').checkInventoryDeadlinesCron;

const functions = require("firebase-functions/v1");
exports.cleanDuplicateDrafts = functions.https.onRequest(async (req, res) => {
  const admin = require('firebase-admin');
  const db = admin.firestore();
  const snap = await db.collection('expenses').orderBy('createdAt', 'desc').get();
  
  let seen = new Set();
  let deleted = 0;
  for(let d of snap.docs) {
    let data = d.data();
    let key = data.total + '_' + (data.vendor || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if(seen.has(key) && data.status === 'draft') {
      await d.ref.delete();
      deleted++;
    } else {
      seen.add(key);
    }
  }
  res.send({deleted});
});
