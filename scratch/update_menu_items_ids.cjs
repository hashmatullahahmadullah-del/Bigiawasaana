const fs = require('fs');

const idMapping = {
  "Bigi's Kobideh Kabob Skewer": "2YsE0bWoYyJyrMvHQZ5v",
  "Bigi's Chicken Tikka Kabob Plate": "HasuTY0MWin3nn5IkZcb",
  "Bigi's Tikka Kabab Plate": "yfIiD4H87iuPMpR9zdoN",
  "Bigi's Chapli Kabob": "XvAjowz3KjiWQopaHAvb",
  "Bigi's Cheese Kabob Stick": "PgKqdCkeN8gwklvL4rlR",
  "Bigi's Qabuli Palau Lamb Shank": "cv7CVaf8ZPl3RX31F8Vb",
  "Bigi's Beef Gyro Rice Bowl": "sB2T62F4PX8EreJq9Q4a",
  "Bigi's Chicken Gyro Rice Bowl": "2lCvDYF1DilvP1caQjoL",
  "Bigi's Smash Burger": "63S1WsuVjtkMfaLnYzIq",
  "Bigi's Silk Road Wrap AKA Afghan Burger": "NZJHy1ZIBfgYH47oC2Wz",
  "Bigi's Beef Shawarma Wrap": "JbIeZPCUejQkuz5QAYnz",
  "Bigi's Chicken Shawarma Wrap": "gaN3Y2lOV6eHPYhC3Anb",
  "Bigi's Bolani": "BNoJY3IGYgUxeLkdrMna",
  "Bigi's Chicken Samosa": "FEMCaQpZlF1Tm0Q63TBz",
  "Bigi's Veg Samosa": "VbCgaDPsaZODs7u68uOK",
  "Bigi's Chicken Soup": "DOPmbJJnWGQdJXE38jTO",
  "Bigi's Firni": "O2EisQzW3PeTikdmr96N",
  "Bigi's Doogh": "kXWoq1hkNx4azjZcuuf0",
  "Milk Tea - Chai": "dK5c0LLrWSIspnaykCGo",
  "Soft Drinks": "umtvEZ6d98Rb4K0conY1",
  "Bottled Water": "9LXen2r7xbZMFFk9MVxG"
};

let content = fs.readFileSync('scripts/menu-items-data.cjs', 'utf8');

for (const [name, realId] of Object.entries(idMapping)) {
  // Matches:
  // id: "something",
  // name: "Exact Name",
  const pattern = new RegExp(`id:\\s*"[^"]*",(\\s*name:\\s*"${name.replace(/'/g, "\\'")}")`, 'g');
  if (pattern.test(content)) {
    content = content.replace(pattern, `id: "${realId}",$1`);
    console.log(`Updated ID for: ${name} -> ${realId}`);
  } else {
    console.warn(`NOT FOUND: ${name}`);
  }
}

fs.writeFileSync('scripts/menu-items-data.cjs', content, 'utf8');
