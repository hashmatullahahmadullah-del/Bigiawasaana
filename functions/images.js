const { functions, admin } = require('./shared');

// Serve SEO-friendly images from Firebase Storage
exports.serveMenuImage = functions.https.onRequest(async (req, res) => {
  try {
    // req.path will be something like /filename.webp
    // The rewrite passes /m-img/filename.webp, but if stripped, we just get the basename
    const filename = req.path.split('/').pop();
    
    if (!filename) {
      return res.status(400).send('Filename missing');
    }

    // Default bucket for this project
    const bucket = admin.storage().bucket('bigi-awasaana-7b3ce.firebasestorage.app');
    
    // Check if file exists in the menu-images directory
    const file = bucket.file(`menu-images/${filename}`);
    const [exists] = await file.exists();
    
    if (!exists) {
      return res.status(404).send('Image not found');
    }

    // Get content type
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'image/webp';
    
    // Set caching headers for Fastly CDN
    // Cache publicly for 1 year to minimize function invocations
    res.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000');
    res.set('Content-Type', contentType);
    
    // Stream the file directly to the response
    const readStream = file.createReadStream();
    readStream.on('error', (err) => {
      console.error('Error streaming image:', err);
      if (!res.headersSent) {
        res.status(500).send('Error reading image');
      }
    });
    
    readStream.pipe(res);
  } catch (err) {
    console.error('serveMenuImage error:', err);
    res.status(500).send('Internal Server Error');
  }
});
