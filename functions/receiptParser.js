/**
 * receiptParser.js
 * Pure heuristic parsing — no LLM, no external calls.
 * Takes raw OCR text (from Cloud Vision) and returns structured data.
 */

const VENDOR_SIGNATURES = [
  { name: "Restaurant Depot", patterns: [/restaurant\s*depot/i, /jetro/i] },
  { name: "Costco", patterns: [/costco\s*wholesale/i, /costco/i] },
];

const CATEGORY_KEYWORDS = {
  protein: [
    "beef", "chicken", "lamb", "kabob", "koobideh", "ground", "thigh",
    "breast", "steak", "meat", "halal", "chx", "tender"
  ],
  produce: [
    "tomato", "onion", "lettuce", "cucumber", "pepper", "cilantro",
    "lemon", "garlic", "parsley", "vegetable", "fruit", "potato"
  ],
  packaging: [
    "container", "bag", "foil", "wrap", "cup", "lid", "napkin",
    "to-go", "togo", "clamshell", "tray", "glove", "towel", "ppr", "ps", "cmb"
  ],
  "dry goods": [
    "rice", "flour", "oil", "salt", "sugar", "spice", "sauce",
    "bread", "lavash", "pita", "canned", "bean", "dawn", "pump", "crinkle", "fries"
  ],
};

function detectVendor(text) {
  for (const v of VENDOR_SIGNATURES) {
    if (v.patterns.some((p) => p.test(text))) return v.name;
  }
  return "Other";
}

function extractDate(text) {
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const match = text.match(dateRegex);
  if (!match) return null;

  let [, month, day, year] = match;
  if (year.length === 2) year = "20" + year;

  const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  return isNaN(date.getTime()) ? null : date;
}

function extractTotals(lines) {
  let subtotal = null;
  let tax = null;
  let total = null;

  const moneyRegex = /^\$?(\d+\.\d{2})$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    if (/^tax|sales\s*tax|ca\s*tax/.test(lower) && tax === null) {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
         const m = lines[j].match(moneyRegex);
         if (m) { tax = parseFloat(m[1]); break; }
      }
    }
    
    if (/total/.test(lower) && !/sub/.test(lower) && !/tax/.test(lower) && !/unit/.test(lower) && !/weighed/.test(lower) && !/item/.test(lower) && !/case/.test(lower)) {
      let maxTotal = 0;
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
         const m = lines[j].match(moneyRegex);
         if (m) {
            const val = parseFloat(m[1]);
            if (val > maxTotal) maxTotal = val;
         }
      }
      if (maxTotal > 0 && (total === null || maxTotal > total)) {
         total = maxTotal;
      }
    }
    
    if (/sub\s*-?\s*total/.test(lower) && subtotal === null) {
       for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
         const m = lines[j].match(moneyRegex);
         if (m) { subtotal = parseFloat(m[1]); break; }
      }
    }
  }

  return { subtotal, tax, total };
}

function guessCategory(itemName) {
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "other";
}

function parseRestaurantDepotItems(lines) {
  const parsedNames = [];
  const parsedPrices = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (/subtotal|total\b|ca tax|visa/i.test(line)) break;
    
    if (/^\d{11,13}$/.test(line)) {
       let nameIndex = i - 1;
       let name = lines[nameIndex] || "";
       
       while (nameIndex > 0 && (
          name === "JMB" || 
          name === "UNITS 1" || 
          name === "(TA)" || 
          name === "U(TA)" || 
          name.match(/^[\d\s\#]+$/) || 
          name.match(/^[A-Z]$/) ||
          name.match(/^\$?(\d+\.\d{2})$/) ||
          name.match(/CASE/i) ||
          name.match(/40LB/i) ||
          name.match(/SIZE/i) ||
          name.match(/TA/)
       )) {
          nameIndex--;
          name = lines[nameIndex] || "";
       }
       parsedNames.push({ name, upc: line, text: name + " " + line });
    }
    
    const weightMatch = line.match(/@\s*\$?(\d+\.\d{2})\w*\s+\$?(\d+\.\d{2})/);
    if (weightMatch) {
       parsedPrices.push(parseFloat(weightMatch[2]));
       continue;
    }
    
    const singleMatch = line.match(/^\$?(\d+\.\d{2})$/);
    if (singleMatch) {
       parsedPrices.push(parseFloat(singleMatch[1]));
    }
  }

  const items = [];
  const minLen = Math.min(parsedNames.length, parsedPrices.length);
  for (let i = 0; i < minLen; i++) {
      items.push({
          rawText: parsedNames[i].text,
          name: parsedNames[i].name,
          quantity: 1,
          unitPrice: parsedPrices[i],
          lineTotal: parsedPrices[i],
          matchedMenuIngredient: null,
          category: guessCategory(parsedNames[i].name)
      });
  }

  return items;
}

function parseCostcoItems(lines) {
  const items = [];
  const itemLineRegex = /^(\d{4,7})\s+(.+?)\s+(\d+\.\d{2})\s*([A-Z])?$/;
  const qtyMultiplierRegex = /(\d+)\s*@\s*(\d+\.\d{2})/;

  for (const line of lines) {
    const match = line.match(itemLineRegex);
    if (match) {
      const [, code, name, price] = match;
      const qtyMatch = line.match(qtyMultiplierRegex);
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      const unitPrice = qtyMatch ? parseFloat(qtyMatch[2]) : parseFloat(price);

      items.push({
        rawText: line,
        name: `${name.trim()} (#${code})`,
        quantity,
        unitPrice,
        lineTotal: parseFloat(price),
        matchedMenuIngredient: null,
      });
    }
  }
  return items;
}

function parseGenericItems(lines) {
  const items = [];
  const genericRegex = /^(.{3,40}?)\s+(\d+\.\d{2})$/;
  const skipKeywords = /total|tax|subtotal|change|cash|visa|mastercard|debit|balance/i;

  for (const line of lines) {
    if (skipKeywords.test(line)) continue;
    const match = line.match(genericRegex);
    if (match) {
      const [, name, price] = match;
      items.push({
        rawText: line,
        name: name.trim(),
        quantity: 1,
        unitPrice: parseFloat(price),
        lineTotal: parseFloat(price),
        matchedMenuIngredient: null,
      });
    }
  }
  return items;
}

function parseReceiptText(rawText) {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const vendor = detectVendor(rawText);
  const purchaseDate = extractDate(rawText);
  const { subtotal, tax, total } = extractTotals(lines);

  let items = [];
  if (vendor === "Restaurant Depot") {
    items = parseRestaurantDepotItems(lines);
  } else if (vendor === "Costco") {
    items = parseCostcoItems(lines);
  }

  if (items.length === 0) {
    items = parseGenericItems(lines);
  }

  items = items.map((item) => ({
    ...item,
    matchedMenuIngredient: null,
    category: guessCategory(item.name),
  }));

  const itemSum = items.reduce((sum, i) => sum + (i.lineTotal || 0), 0);
  const expectedSum = subtotal !== null ? subtotal : total;
  const sumMismatch = expectedSum !== null && Math.abs(itemSum - expectedSum) > 1.0;

  const needsReview = items.length === 0 || total === null || sumMismatch;

  const categoryCounts = {};
  items.forEach((i) => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });
  const category =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "other";

  return { vendor, purchaseDate, category, items, subtotal, tax, total, needsReview };
}

module.exports = { parseReceiptText };
