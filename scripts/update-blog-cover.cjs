const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce'
  });
}

const db = getFirestore();

async function main() {
  const [,, slug, sourceImagePath] = process.argv;
  if (!slug || !sourceImagePath) {
    console.error('Usage: node scripts/update-blog-cover.cjs <slug> <source-image-path>');
    process.exit(1);
  }

  const resolvedSource = path.resolve(sourceImagePath);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`Source image not found: ${resolvedSource}`);
    process.exit(1);
  }

  // Ensure public/images/blog directory exists
  const targetDir = path.resolve(__dirname, '../public/images/blog');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFileName = `${slug}.jpg`;
  const targetPath = path.join(targetDir, targetFileName);

  // Copy image file to public/images/blog/<slug>.jpg
  fs.copyFileSync(resolvedSource, targetPath);
  console.log(`Copied image to ${targetPath}`);

  const relativeCoverUrl = `/images/blog/${targetFileName}`;

  // Find post in Firestore
  const snapshot = await db.collection('posts').where('slug', '==', slug).get();
  if (snapshot.empty) {
    console.warn(`Warning: No post found in Firestore with slug "${slug}". Image saved locally.`);
    process.exit(0);
  }

  const docId = snapshot.docs[0].id;
  await db.collection('posts').doc(docId).update({
    coverImage: relativeCoverUrl,
    updatedAt: FieldValue.serverTimestamp()
  });

  console.log(`Successfully updated Firestore post (${docId}) coverImage to: ${relativeCoverUrl}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to update blog cover:', err);
  process.exit(1);
});
