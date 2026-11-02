const fs = require('fs');
const sharp = require('sharp');

(async () => {
  const meta = await sharp('C:/Users/User/.gemini/antigravity/brain/6320e95d-64c8-4ec3-9718-6034f9efc967/.user_uploaded/media_1793346986648_7d5ae17d.png').metadata();
  console.log('Image dimensions:', meta.width, 'x', meta.height);
})();
