const sharp = require('sharp');

(async () => {
  const img = sharp('C:/Users/User/.gemini/antigravity/brain/6320e95d-64c8-4ec3-9718-6034f9efc967/.user_uploaded/media_1793346986648_7d5ae17d.png');
  const meta = await img.metadata();
  console.log("Image meta:", meta);
  
  // Crop the right 200px
  await img.clone().extract({ left: meta.width - 250, top: 0, width: 250, height: meta.height })
    .toFile('scratch/user_right_crop.png');
  console.log("Saved scratch/user_right_crop.png");
})();
