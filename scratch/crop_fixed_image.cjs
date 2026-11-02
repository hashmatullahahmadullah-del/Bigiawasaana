const sharp = require('sharp');

(async () => {
  const img = sharp('scratch/user_view_918.png');
  const meta = await img.metadata();
  console.log("Captured image meta:", meta);
  
  // Crop right 350px
  await img.clone().extract({ left: meta.width - 350, top: 0, width: 350, height: meta.height })
    .toFile('scratch/fixed_right_crop.png');
  console.log("Saved scratch/fixed_right_crop.png");
})();
