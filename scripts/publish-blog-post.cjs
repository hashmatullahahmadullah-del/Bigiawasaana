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

async function resolveCoverImageUrl(coverImage, slug) {
  if (!coverImage || coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
    return coverImage;
  }

  // Attempt to locate local file
  let localPath = coverImage;
  if (!path.isAbsolute(localPath)) {
    if (localPath.startsWith('/images/blog/')) {
      localPath = path.resolve(__dirname, '..', 'public', localPath.substring(1));
    } else {
      localPath = path.resolve(__dirname, '..', localPath);
    }
  }

  if (!fs.existsSync(localPath)) {
    // Check fallback in public/images/blog/<slug>.jpg
    const fallbackPath = path.resolve(__dirname, '..', 'public', 'images', 'blog', `${slug}.jpg`);
    if (fs.existsSync(fallbackPath)) {
      localPath = fallbackPath;
    } else {
      console.warn(`Local cover image file not found at ${localPath}, leaving as-is.`);
      return coverImage;
    }
  }

  const token = crypto.randomUUID();
  const destination = `img/blog/${slug}_${Date.now()}.jpg`;

  console.log(`Uploading cover image to Firebase Storage: ${destination}...`);
  await bucket.upload(localPath, {
    destination: destination,
    metadata: {
      contentType: localPath.endsWith('.webp') ? 'image/webp' : (localPath.endsWith('.png') ? 'image/png' : 'image/jpeg'),
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
  console.log(`Uploaded cover image! Public CDN URL: ${publicUrl}`);
  return publicUrl;
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node scripts/publish-blog-post.cjs <path-to-post-json>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(jsonPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const postData = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

  if (!postData.title || !postData.slug || !postData.content) {
    console.error('Missing required fields: title, slug, and content are required.');
    process.exit(1);
  }

  // Resolve cover image to Firebase Storage CDN URL
  const publicCoverUrl = await resolveCoverImageUrl(postData.coverImage, postData.slug);

  // Check if slug already exists
  const existing = await db.collection('posts').where('slug', '==', postData.slug).get();
  if (!existing.empty) {
    console.log(`Post with slug "${postData.slug}" already exists (ID: ${existing.docs[0].id}). Updating...`);
    const docId = existing.docs[0].id;
    await db.collection('posts').doc(docId).update({
      title: postData.title,
      slug: postData.slug,
      excerpt: postData.excerpt || '',
      keywords: postData.keywords || '',
      coverImage: publicCoverUrl || '/hero-food-spread.webp',
      isPublished: postData.isPublished !== undefined ? postData.isPublished : true,
      updatedAt: FieldValue.serverTimestamp(),
      content: postData.content
    });
    console.log(`Successfully updated blog post "${postData.title}"!`);
    console.log(`URL: https://bigiawasaana.com/blog/${postData.slug}`);
    process.exit(0);
  }

  const docRef = await db.collection('posts').add({
    title: postData.title,
    slug: postData.slug,
    excerpt: postData.excerpt || '',
    keywords: postData.keywords || '',
    coverImage: publicCoverUrl || '/hero-food-spread.webp',
    isPublished: postData.isPublished !== undefined ? postData.isPublished : true,
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    content: postData.content
  });

  console.log(`Successfully published blog post "${postData.title}"! Document ID: ${docRef.id}`);
  console.log(`Live URL: https://bigiawasaana.com/blog/${postData.slug}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to publish post:', err);
  process.exit(1);
});
