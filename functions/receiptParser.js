/**
 * receiptParser.js
 * Pure heuristic parsing — no LLM, no external calls.
 * Takes raw OCR text (from Cloud Vision) and returns structured data.
 */

const VENDOR_SIGNATURES = [
  { name: "Restaurant Depot", patterns: [/restaurant\s*depot/i, /jetro/i] },
  { name: "Costco", patterns: [/costco\s*wholesale/i, /costco/i] },
  { name: "Q Market", patterns: [/q\s*market/i, /qmarket/i] },
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
  const genericRegex = /^(.{2,40}?)\s+\$?(\d+\.\d{2})(?:\s+[A-Za-z])?$/;
  const skipKeywords = /total|tax|subtotal|change|cash|visa|mastercard|debit|balance|sale|acct|app name|aid:|tc:|entry|approval|item count/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipKeywords.test(line)) continue;
    if (/^(\d+)\s*@\s*\$?(\d+\.\d{2})/.test(line)) continue;
    
    // Check if name and price are on the same line
    let match = line.match(genericRegex);
    if (match) {
      const [, name, priceStr] = match;
      const price = parseFloat(priceStr);
      let quantity = 1;
      let unitPrice = price;

      // Check the next line for quantity modifiers like "6 @ $0.49"
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const qtyMatch = nextLine.match(/^(\d+)\s*@\s*\$?(\d+\.\d{2})/);
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1], 10);
          unitPrice = parseFloat(qtyMatch[2]);
        }
      }

      items.push({
        rawText: name,
        name: name.trim(),
        quantity,
        unitPrice,
        lineTotal: price,
        matchedMenuIngredient: null,
      });
      continue;
    }

    // Check if this line is a name, and the NEXT line is a price
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextLinePriceMatch = nextLine.match(/^\$?(\d+\.\d{2})(?:\s+[A-Za-z])?$/);
      if (nextLinePriceMatch && !skipKeywords.test(nextLine) && !/^(\d+)\s*@\s*\$?(\d+\.\d{2})/.test(nextLine)) {
         const priceStr = nextLinePriceMatch[1];
         // Ensure the current line isn't just a number or weird symbol before making it a name
         if (line.trim().length > 1 && !/^\d+$/.test(line.trim()) && !/^[@\$]/.test(line.trim())) {
             const price = parseFloat(priceStr);
             let quantity = 1;
             let unitPrice = price;
             
             // Check the line after the price for quantity modifiers
             if (i + 2 < lines.length) {
               const qtyMatch = lines[i + 2].match(/^(\d+)\s*@\s*\$?(\d+\.\d{2})/);
               if (qtyMatch) {
                 quantity = parseInt(qtyMatch[1], 10);
                 unitPrice = parseFloat(qtyMatch[2]);
               }
             }

             items.push({
                rawText: line,
                name: line.trim(),
                quantity,
                unitPrice,
                lineTotal: price,
                matchedMenuIngredient: null,
             });
             i++; // skip the next line since we consumed it as price
         }
         continue;
      }
    }
  }
  return items;
}

function parseReceiptText(rawText, mappings = {}) {
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

  if (items.length === 0 && total !== null) {
    items.push({
      rawText: "Total Purchase",
      name: "Total Purchase",
      quantity: 1,
      unitPrice: total,
      lineTotal: total,
      matchedMenuIngredient: null,
    });
  }

  items = items.map((item) => {
    let matchedMenuIngredient = null;
    let category = null;
    const nameKey = item.name.toLowerCase().trim();
    
    if (mappings[nameKey]) {
       matchedMenuIngredient = mappings[nameKey].matchedMenuIngredient || null;
       category = mappings[nameKey].category || null;
    }
    
    if (!category) category = guessCategory(item.name);
    
    return {
      ...item,
      matchedMenuIngredient,
      category,
    };
  });

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
