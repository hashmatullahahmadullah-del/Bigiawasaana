const { db } = require('./functions/shared');

async function setPickupSettings() {
  const config = {
    basePrepTimeMinutes: 15,
    perOrderIncrementMinutes: 3,
    maxWaitMinutes: 60,
    busyModeOffsetMinutes: 15,
    minLeadTimeMinutes: 20,
    maxScheduleDaysAhead: 3,
    slotIntervalMinutes: 15,
    prepBufferBeforeCloseMinutes: 30,
    businessHours: {
      open: '11:00',
      close: '21:30'
    },
    openDays: [0, 1, 2, 3, 4, 5, 6] // assuming open everyday
  };

  await db.collection('settings').doc('pickupConfig').set(config, { merge: true });
  console.log('Successfully set pickup settings!');
}

setPickupSettings().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
