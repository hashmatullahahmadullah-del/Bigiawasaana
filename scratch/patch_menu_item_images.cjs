const fs = require('fs');

const REAL_IMAGES_MAP = {
  '2YsE0bWoYyJyrMvHQZ5v': '/m-img/1787957249457_BigiAwasaana_KobidehKabob.webp',
  'HasuTY0MWin3nn5IkZcb': '/m-img/1790463609278_BigiAwasaana_ChickenTikaKabob.webp',
  'yfIiD4H87iuPMpR9zdoN': '/m-img/1789064755515_BigiAwasaana_BeefTikaKabob.webp',
  'XvAjowz3KjiWQopaHAvb': '/m-img/1791950307107_1000004875.webp',
  'PgKqdCkeN8gwklvL4rlR': '/m-img/1791950199331_1000004877.webp',
  'cv7CVaf8ZPl3RX31F8Vb': '/m-img/1788493414501_BigiAwasaana_QabuliPalau.webp',
  'sB2T62F4PX8EreJq9Q4a': '/m-img/1790468044644_BigiAwasaana_BeefGyroPlate.webp',
  '2lCvDYF1DilvP1caQjoL': '/m-img/1790390079047_BigiAwasaana_ChickenGyroPlate.webp',
  '63S1WsuVjtkMfaLnYzIq': '/m-img/1786154168119_1000063335.webp',
  'NZJHy1ZIBfgYH47oC2Wz': '/m-img/1790390925304_BigiAwasaana_AfganiBargar.webp',
  'JbIeZPCUejQkuz5QAYnz': '/m-img/1788494404914_ChatGPT-Image-Sep-3--2026--08_48_25-PM.webp',
  'gaN3Y2lOV6eHPYhC3Anb': '/m-img/1788494143573_BigiAwasaana_BigisShawarmaWrap.webp',
  'BNoJY3IGYgUxeLkdrMna': '/m-img/1788493142188_BigiAwasaana_BolaniPotato.webp',
  'FEMCaQpZlF1Tm0Q63TBz': '/m-img/1788130453606_BigiAwasaana_BigChickenSamosa.webp',
  'VbCgaDPsaZODs7u68uOK': '/m-img/1786152891068_1000063326.webp',
  'DOPmbJJnWGQdJXE38jTO': '/m-img/1788493169048_BigiAwasaana_ChickenSoup.webp',
  'O2EisQzW3PeTikdmr96N': '/m-img/1788130417913_BigiAwasaana_Firmi.webp',
  'kXWoq1hkNx4azjZcuuf0': '/m-img/1790103676733_BigiAwasaana_YougurtDrinkDogh.webp',
  'dK5c0LLrWSIspnaykCGo': '/m-img/1790103595926_BigiAwasaana_KadhakChai_2880x2304.webp',
  'umtvEZ6d98Rb4K0conY1': '/m-img/1788130024385_101757-middle.webp',
  '9LXen2r7xbZMFFk9MVxG': '/m-img/bottled-water.webp'
};

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  for (const [id, realImg] of Object.entries(REAL_IMAGES_MAP)) {
    // Matches "id": "..." or id: "..." or id: '...'
    const itemRegex = new RegExp(`(["']?id["']?\\s*:\\s*["']${id}["'][\\s\\S]*?["']?img["']?\\s*:\\s*["'])[^"']+?(["'])`);
    if (itemRegex.test(code)) {
      code = code.replace(itemRegex, `$1${realImg}$2`);
      count++;
    }
  }
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Patched ${count} images in ${filePath}`);
}

patchFile('src/main.js');
