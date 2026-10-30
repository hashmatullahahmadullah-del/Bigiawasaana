const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce',
    storageBucket: 'bigi-awasaana-7b3ce.firebasestorage.app'
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

async function uploadAndSync() {
  const imagesDir = path.resolve(__dirname, '../public/images/blog');
  if (!fs.existsSync(imagesDir)) {
    console.error('Directory not found:', imagesDir);
    process.exit(1);
  }

  const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.jpg') || f.endsWith('.webp') || f.endsWith('.png'));
  console.log(`Found ${files.length} images in public/images/blog/ to sync to Firebase Storage.`);

  for (const file of files) {
    const slug = path.basename(file, path.extname(file));
    const localFilePath = path.join(imagesDir, file);
    
    // Check if post exists for this slug
    const snap = await db.collection('posts').where('slug', '==', slug).get();
    if (snap.empty) {
      console.log(`No post matching slug: ${slug}, skipping upload.`);
      continue;
    }

    const doc = snap.docs[0];
    const postData = doc.data();

    // Generate Firebase Storage Token
    const token = crypto.randomUUID();
    const destination = `img/blog/${slug}_${Date.now()}.jpg`;

    console.log(`Uploading ${file} to Firebase Storage -> ${destination}...`);
    await bucket.upload(localFilePath, {
      destination: destination,
      metadata: {
        contentType: file.endsWith('.webp') ? 'image/webp' : (file.endsWith('.png') ? 'image/png' : 'image/jpeg'),
        metadata: {
          firebaseStorageDownloadTokens: token
        }
      }
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
    console.log(`Uploaded! Public URL: ${publicUrl}`);

    // Update post in Firestore
    await db.collection('posts').doc(doc.id).update({
      coverImage: publicUrl,
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log(`Updated Firestore document (${doc.id}) for "${postData.title}"\n`);
  }

  console.log('All matching images have been uploaded to Firebase Storage and linked in Firestore!');
  process.exit(0);
}

uploadAndSync().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
