const fs = require('fs');
let code = fs.readFileSync('functions/parseReceipt.js', 'utf8');

const regex = /\/\/ 4\.5\. Duplicate Detection[\s\S]*?\/\/ 5\. Store in Firestore/m;

const smartDuplicate = `// 4.5. Smart Duplicate Detection
      if (parsed.total) {
        const duplicateCheck = await admin.firestore().collection("expenses")
          .where("total", "==", parsed.total)
          .get();
          
        let isDuplicate = false;
        let dupVendor = "";
        
        if (!duplicateCheck.empty) {
           for (const d of duplicateCheck.docs) {
              const data = d.data();
              // If it was created recently (within last 5 minutes), it's a double-upload double-click!
              const timeSinceCreated = data.createdAt ? Date.now() - data.createdAt.toMillis() : 9999999;
              
              const v1 = (parsed.vendor || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const v2 = (data.vendor || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              
              if (v1 && v2 && (v1.includes(v2) || v2.includes(v1) || v1 === v2)) {
                 isDuplicate = true;
                 dupVendor = data.vendor;
                 break;
              } else if (timeSinceCreated < 5 * 60 * 1000) {
                 isDuplicate = true;
                 dupVendor = data.vendor;
                 break;
              }
           }
        }
        
        if (isDuplicate) {
          console.log("Duplicate receipt detected! Vendor:", dupVendor, "Total:", parsed.total);
          return { duplicate: true, vendor: dupVendor, total: parsed.total };
        }
      }

      // 5. Store in Firestore`;

code = code.replace(regex, smartDuplicate);
fs.writeFileSync('functions/parseReceipt.js', code, 'utf8');
console.log('Fixed parseReceipt with smart duplicate logic');
