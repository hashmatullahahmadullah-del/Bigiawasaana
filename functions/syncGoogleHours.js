const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

// Google Places API day numbers (0=Sunday in JS) — the legacy API uses 0-6 already
// but in a different order. The API returns periods with day 0=Sunday through 6=Saturday.
// This matches our schema exactly, so no mapping needed!

/**
 * Fetches business hours from the Google Places API (legacy) for the configured Place ID.
 * Returns { openDays, businessHours } mapped to the pickupConfig schema.
 */
async function fetchGoogleHours() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    throw new HttpsError(
      'failed-precondition',
      'Missing GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID in environment variables.'
    );
  }

  // Use the legacy Places API — Place Details endpoint
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,business_status,opening_hours&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Google Places API error:', response.status, errorBody);
    throw new HttpsError(
      'internal',
      `Google Places API returned ${response.status}: ${errorBody}`
    );
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    throw new HttpsError(
      'internal',
      `Google Places API status: ${data.status}. ${data.error_message || ''}`
    );
  }

  const result = data.result;

  // Check if the business is temporarily or permanently closed
  if (result.business_status === 'CLOSED_TEMPORARILY' || result.business_status === 'CLOSED_PERMANENTLY') {
    return {
      openDays: [],
      businessHours: null,
      weekdayDescriptions: [],
      businessStatus: result.business_status,
      temporarilyClosed: result.business_status === 'CLOSED_TEMPORARILY',
      permanentlyClosed: result.business_status === 'CLOSED_PERMANENTLY',
    };
  }

  const hours = result.opening_hours;

  if (!hours || !hours.periods || hours.periods.length === 0) {
    throw new HttpsError(
      'not-found',
      'No business hours found for this Place ID. Make sure your Google Maps listing has hours set.'
    );
  }

  // Extract open days and times from periods
  // Legacy API periods format: { open: { day: 0-6, time: "HHMM" }, close: { day: 0-6, time: "HHMM" } }
  // day 0 = Sunday, matching our schema exactly
  const openDaysSet = new Set();
  let earliestOpen = '23:59';
  let latestClose = '00:00';

  for (const period of hours.periods) {
    if (period.open) {
      openDaysSet.add(period.open.day);

      // Convert "HHMM" to "HH:MM"
      const openTime = period.open.time
        ? `${period.open.time.substring(0, 2)}:${period.open.time.substring(2)}`
        : null;
      const closeTime = period.close && period.close.time
        ? `${period.close.time.substring(0, 2)}:${period.close.time.substring(2)}`
        : '23:59';

      if (openTime && openTime < earliestOpen) earliestOpen = openTime;
      if (closeTime > latestClose) latestClose = closeTime;
    }
  }

  // Sort open days numerically
  const openDays = Array.from(openDaysSet).sort((a, b) => a - b);

  return {
    openDays,
    businessHours: {
      open: earliestOpen,
      close: latestClose,
    },
    // Include Google's human-readable descriptions for the status message
    weekdayDescriptions: hours.weekday_text || [],
    businessStatus: result.business_status,
  };
}

/**
 * Callable Cloud Function — triggered by the admin dashboard "Sync from Google Maps" button.
 * Fetches hours from Google Places API and updates Firestore pickupConfig.
 */
exports.syncGoogleHours = onCall(
  { region: 'us-central1' },
  async (request) => {
    const result = await fetchGoogleHours();

    const db = admin.firestore();
    const updateData = {
      temporarilyClosed: result.temporarilyClosed || false,
      permanentlyClosed: result.permanentlyClosed || false,
      lastGoogleSync: admin.firestore.FieldValue.serverTimestamp(),
      lastGoogleSyncDetails: {
        weekdayDescriptions: result.weekdayDescriptions,
        businessStatus: result.businessStatus,
      },
    };

    // Only update hours/days if the business is open (has valid hours)
    if (result.businessHours) {
      updateData.openDays = result.openDays;
      updateData.businessHours = result.businessHours;
    }

    await db.collection('settings').doc('pickupConfig').set(updateData, { merge: true });

    if (result.temporarilyClosed) {
      console.log('Synced Google status: TEMPORARILY CLOSED');
    } else if (result.permanentlyClosed) {
      console.log('Synced Google status: PERMANENTLY CLOSED');
    } else {
      console.log(
        `Synced Google hours: open=${result.businessHours.open}, close=${result.businessHours.close}, days=${result.openDays.join(',')}`
      );
    }

    return {
      success: true,
      businessHours: result.businessHours,
      openDays: result.openDays,
      weekdayDescriptions: result.weekdayDescriptions,
      temporarilyClosed: result.temporarilyClosed || false,
      permanentlyClosed: result.permanentlyClosed || false,
      businessStatus: result.businessStatus,
    };
  }
);

/**
 * Scheduled Cloud Function — auto-syncs Google hours daily at 3:00 AM LA time.
 * Uncomment the export in index.js to enable.
 */
exports.syncGoogleHoursCron = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'America/Los_Angeles',
    region: 'us-central1',
  },
  async () => {
    try {
      const result = await fetchGoogleHours();

      const db = admin.firestore();
      const updateData = {
        temporarilyClosed: result.temporarilyClosed || false,
        permanentlyClosed: result.permanentlyClosed || false,
        lastGoogleSync: admin.firestore.FieldValue.serverTimestamp(),
        lastGoogleSyncDetails: {
          weekdayDescriptions: result.weekdayDescriptions,
          businessStatus: result.businessStatus,
        },
      };

      if (result.businessHours) {
        updateData.openDays = result.openDays;
        updateData.businessHours = result.businessHours;
      }

      await db.collection('settings').doc('pickupConfig').set(updateData, { merge: true });

      if (result.temporarilyClosed) {
        console.log('[CRON] Synced Google status: TEMPORARILY CLOSED');
      } else {
        console.log(
          `[CRON] Synced Google hours: open=${result.businessHours.open}, close=${result.businessHours.close}, days=${result.openDays.join(',')}`
        );
      }
    } catch (error) {
      console.error('[CRON] Failed to sync Google hours:', error.message);
    }
  }
);
