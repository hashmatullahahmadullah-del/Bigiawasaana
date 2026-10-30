const admin = require('firebase-admin');
const fs = require('fs');
const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce'
  });
}
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
    businessHours: { open: "13:00", close: "22:30" }, // 1:00 PM to 10:30 PM
    openDays: [1, 2, 3, 4, 5, 6] // 1=Monday to 6=Saturday (Sunday: Closed)
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
