const functions = require("firebase-functions/v1");

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

exports.renderRetailItemPage = require('./ssr').renderRetailItemPage; 
exports.processRetailPayment = require('./payments').processRetailPayment;
exports.getShippingRates = require('./payments').getShippingRates;
exports.purchaseShippingLabel = require('./payments').purchaseShippingLabel;
exports.renderShopCatalog = require("./ssr").renderShopCatalog;
exports.submitRetailReview = require('./reviews').submitRetailReview;

exports.lookupCustomer = require('./customers').lookupCustomer;
exports.getOrderHistory = require('./customers').getOrderHistory;
exports.setCustomerPin = require('./customers').setCustomerPin;
exports.toggleFavorite = require('./customers').toggleFavorite;
exports.removeSavedCard = require('./customers').removeSavedCard;
exports.getAuthCustomerProfile = require('./customers').getAuthCustomerProfile;
exports.syncAuthCustomer = require('./customers').syncAuthCustomer;
exports.redeemLoyaltyReward = require('./customers').redeemLoyaltyReward;

// Nodemailer Order Receipts & Notifications
exports.onOrderCreatedEmail = require('./emails').onOrderCreatedEmail;
exports.onOrderStatusUpdatedEmail = require('./emails').onOrderStatusUpdatedEmail;
exports.onRetailOrderCreatedEmail = require('./emails').onRetailOrderCreatedEmail;

exports.registerApplePayDomain = require('./payments').registerApplePayDomain;
exports.refundSquarePayment = require('./orders').refundSquarePayment;

exports.getOrderTracking = require('./orders').getOrderTracking;
exports.getReorderItems = require('./orders').getReorderItems;
