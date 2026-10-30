const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

process.env.GOOGLE_APPLICATION_CREDENTIALS = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce'
  });
}

const db = getFirestore();

async function updateAllTiming() {
  const snapshot = await db.collection('posts').get();
  console.log(`Processing ${snapshot.size} blog posts for timing updates...\n`);

  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let { title, excerpt, keywords, content, slug } = data;
    let modified = false;

    // Standard Replacements in HTML Content:
    if (content) {
      let origContent = content;

      // 1. Generic "Open every day: 12:00 PM – 10:30 PM" (or similar variations)
      content = content.replace(
        /<strong>\s*Open\s+every\s+day\s*:\s*(12:00\s*PM|3:30\s*PM|12\s*PM)\s*[–—\-]\s*10:30\s*PM\s*<\/strong>/gi,
        '<strong>Hours: Monday – Saturday: 01:00 PM – 10:30 PM (Closed Sunday)</strong>'
      );

      // 2. "open daily from 12:00 PM to 10:30 PM" or "open daily from 12:00 PM — 10:30 PM"
      content = content.replace(
        /open\s+daily\s+from\s*<strong>\s*12:00\s*PM\s+to\s+10:30\s*PM\s*<\/strong>/gi,
        'open Monday to Saturday from <strong>01:00 PM to 10:30 PM (Closed Sunday)</strong>'
      );
      content = content.replace(
        /open\s+daily\s+from\s*12:00\s*PM\s+to\s+10:30\s*PM/gi,
        'open Monday to Saturday from 01:00 PM to 10:30 PM (Closed Sunday)'
      );

      // 3. "Open Daily: 12:00 PM — 10:30 PM" or "Open Daily: 12:00 PM – 10:30 PM"
      content = content.replace(
        /Open\s+Daily\s*:\s*12:00\s*PM\s*[—–\-]\s*10:30\s*PM/gi,
        'Hours: Monday – Saturday: 01:00 PM – 10:30 PM (Closed Sunday)'
      );

      // 4. "daily, 12:00 PM–10:30 PM"
      content = content.replace(
        /daily,\s*<strong>\s*12:00\s*PM\s*[–—\-]\s*10:30\s*PM/gi,
        'Monday to Saturday, <strong>01:00 PM – 10:30 PM (Closed Sunday)'
      );
      content = content.replace(
        /daily,\s*12:00\s*PM\s*[–—\-]\s*10:30\s*PM/gi,
        'Monday to Saturday, 01:00 PM – 10:30 PM (Closed Sunday)'
      );

      // 5. "every day from 12:00 PM to 10:30 PM" or "every single day from 12:00 PM to 10:30 PM"
      content = content.replace(
        /(every\s+single\s+day|every\s+day)\s+from\s*<strong>\s*(12:00\s*PM|12\s*PM)\s+to\s+10:30\s*PM\s*<\/strong>/gi,
        'Monday to Saturday from <strong>01:00 PM to 10:30 PM (Closed Sunday)</strong>'
      );
      content = content.replace(
        /(every\s+single\s+day|every\s+day)\s+from\s*(12:00\s*PM|12\s*PM)\s+to\s+10:30\s*PM/gi,
        'Monday to Saturday from 01:00 PM to 10:30 PM (Closed Sunday)'
      );

      // 6. "serves the west San Fernando Valley daily from 12:00 PM to 10:30 PM"
      content = content.replace(
        /serves\s+the\s+west\s+San\s+Fernando\s+Valley\s+daily\s+from\s+12:00\s*PM\s+to\s+10:30\s*PM/gi,
        'serves the west San Fernando Valley Monday to Saturday from 01:00 PM to 10:30 PM (Closed Sunday)'
      );

      // 7. "We're Open Every Day Until 10:30 PM"
      content = content.replace(
        /We['’]re\s+Open\s+Every\s+Day\s+Until\s+10:30\s*PM/gi,
        "We're Open Monday to Saturday Until 10:30 PM (Closed Sunday)"
      );

      // 8. "We're open every day until 10:30 PM"
      content = content.replace(
        /We['’]re\s+open\s+every\s+day\s+until\s+10:30\s*PM/gi,
        "We're open Monday to Saturday until 10:30 PM (Closed Sunday)"
      );

      // 9. "open until 10:30 PM every night"
      content = content.replace(
        /open\s+until\s+10:30\s*PM\s+every\s+night/gi,
        'open until 10:30 PM Monday through Saturday (Closed Sunday)'
      );

      // 10. "every night, right up until 10:30 PM"
      content = content.replace(
        /every\s+night,\s*right\s+up\s+until\s+10:30\s*PM/gi,
        'Monday through Saturday, right up until 10:30 PM (Closed Sunday)'
      );

      // 11. Dari post replacements:
      content = content.replace(
        /هر روز در آدرس ۱۸۴۱۱ Victory Blvd، ریسیدا، کلیفورنیا ۹۱۳۳۵، از ساعت ۱۲ ظهر الی ۱۰:۳۰ شب فعال است/g,
        'دوشنبه الی شنبه در آدرس ۱۸۴۱۱ Victory Blvd، ریسیدا، کلیفورنیا ۹۱۳۳۵، از ساعت ۰۱:۰۰ بعد از ظهر الی ۱۰:۳۰ شب فعال است (یکشنبه‌ها تعطیل)'
      );
      content = content.replace(
        /هر روز از ساعت ۱۲ ظهر الی ۱۰:۳۰ شب فعال است/g,
        'دوشنبه الی شنبه از ساعت ۰۱:۰۰ بعد از ظهر الی ۱۰:۳۰ شب فعال است (یکشنبه‌ها تعطیل)'
      );

      if (content !== origContent) {
        modified = true;
      }
    }

    // Excerpt replacements:
    if (excerpt) {
      let origExcerpt = excerpt;
      excerpt = excerpt.replace(/Open\s+daily\s+12[–—\-]10:30\s*PM\.?/gi, 'Open Mon–Sat 01:00 PM–10:30 PM (Closed Sunday).');
      excerpt = excerpt.replace(/Open\s+every\s+day\s+12[–—\-]10:30\s*PM\.?/gi, 'Open Mon–Sat 01:00 PM–10:30 PM (Closed Sunday).');
      excerpt = excerpt.replace(/12:00\s*PM\s*[–—\-]\s*10:30\s*PM/gi, '01:00 PM – 10:30 PM (Mon–Sat, Closed Sun)');
      if (excerpt !== origExcerpt) {
        modified = true;
      }
    }

    if (modified) {
      await db.collection('posts').doc(doc.id).update({
        content,
        excerpt,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`[UPDATED] Post: "${title}" (slug: ${slug})`);
      updatedCount++;
    } else {
      console.log(`[UNCHANGED] Post: "${title}"`);
    }
  }

  // Also update settings/pickupConfig businessHours
  console.log('\nUpdating settings/pickupConfig in Firestore...');
  await db.collection('settings').doc('pickupConfig').update({
    'businessHours.open': '13:00',
    'businessHours.close': '22:30',
    'openDays': [1, 2, 3, 4, 5, 6], // Mon-Sat
    'updatedAt': FieldValue.serverTimestamp()
  });
  console.log('Successfully updated settings/pickupConfig (open: 13:00, close: 22:30, openDays: Mon-Sat)!');

  console.log(`\nCompleted! Total blog posts updated: ${updatedCount}`);
  process.exit(0);
}

updateAllTiming().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
