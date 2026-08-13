const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function setupPickupConfig() {
  const config = {
    basePrepTimeMinutes: 20, // Kababs take about 15-20 mins to grill fresh
    perOrderIncrementMinutes: 5, // Add 5 mins to wait time for every active order ahead of them
    maxWaitMinutes: 90, // Never quote a wait time longer than 1.5 hours
    minLeadTimeMinutes: 30, // Scheduled orders must be placed at least 30 mins in advance
    maxScheduleDaysAhead: 7, // Allow people to schedule orders up to a week in advance
    slotIntervalMinutes: 15, // Pickup slots every 15 minutes (e.g. 5:00, 5:15, 5:30)
    prepBufferBeforeCloseMinutes: 30, // Stop taking new orders 30 minutes before closing (10:00 PM cutoff)
    businessHours: { open: "12:00", close: "22:30" }, // 12:00 PM to 10:30 PM
    openDays: [0, 1, 2, 3, 4, 5, 6] // 0=Sunday, 6=Saturday (Open every day)
  };

  try {
    await db.collection('settings').doc('pickupConfig').set(config, { merge: true });
    console.log("Successfully updated pickupConfig in Firestore!");
    process.exit(0);
  } catch (error) {
    console.error("Error setting pickupConfig:", error);
    process.exit(1);
  }
}

setupPickupConfig();
