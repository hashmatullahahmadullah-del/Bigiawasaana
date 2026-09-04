const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenAI } = require("@google/genai");

if (!admin.apps.length) {
  admin.initializeApp();
}

const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.parseReceipt = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB", secrets: [geminiApiKey] })
  .https.onCall(async (data, context) => {
    const { storagePath } = data;

    if (!storagePath) {
      throw new functions.https.HttpsError("invalid-argument", "storagePath is required");
    }

    try {
      const bucket = admin.storage().bucket();
      // 1. Download image from Google Cloud Storage to a local buffer
      const file = bucket.file(storagePath);
      const [metadata] = await file.getMetadata();
      const mimeType = metadata.contentType || "image/webp";
      const [buffer] = await file.download();

      // 2. Initialize Gemini API
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

      // 3. Define the desired JSON schema for the output
      const schema = {
        type: "object",
        properties: {
          vendor: { type: "string" },
          purchaseDate: { type: "string", description: "ISO 8601 date string, e.g. '2023-10-25'" },
          category: { type: "string", enum: ["protein", "produce", "packaging", "dry goods", "other"] },
          subtotal: { type: "number" },
          tax: { type: "number" },
          total: { type: "number" },
          needsReview: { type: "boolean" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                rawText: { type: "string", description: "Raw name from the receipt" },
                name: { type: "string", description: "Cleaned up name of the item" },
                quantity: { type: "number" },
                unitPrice: { type: "number" },
                lineTotal: { type: "number" },
                category: { type: "string", enum: ["protein", "produce", "packaging", "dry goods", "other"] }
              },
              required: ["rawText", "name", "quantity", "unitPrice", "lineTotal", "category"]
            }
          }
        },
        required: ["vendor", "items"]
      };

      // 4. Call Gemini to parse the image
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: 'user',
            parts: [
              { text: "Extract the receipt details from this image. Categorize the items into protein, produce, packaging, dry goods, or other. If the receipt looks blurry or hard to read, set needsReview to true." },
              {
                inlineData: {
                  data: buffer.toString("base64"),
                  mimeType: mimeType,
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.1,
        }
      });

      const parsed = JSON.parse(response.text);


      // 4.5. Smart Duplicate Detection
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
              const isVendorMatch = v1 && v2 && (v1.includes(v2) || v2.includes(v1) || v1 === v2);
              
              if (timeSinceCreated < 5 * 60 * 1000) {
                 isDuplicate = true;
                 dupVendor = data.vendor;
                 break;
              } else if (isVendorMatch) {
                 let date1 = parsed.purchaseDate;
                 let date2 = null;
                 if (data.purchaseDate && typeof data.purchaseDate.toDate === 'function') {
                    // Adjust for local time representation or just grab the date part
                    const d2 = data.purchaseDate.toDate();
                    date2 = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0') + '-' + String(d2.getDate()).padStart(2, '0');
                 }
                 
                 if (date1 && date2 && date1 === date2) {
                    isDuplicate = true;
                    dupVendor = data.vendor;
                    break;
                 }
              }
           }
        }
        
        if (isDuplicate) {
          console.log("Duplicate receipt detected! Vendor:", dupVendor, "Total:", parsed.total);
          return { duplicate: true, vendor: dupVendor, total: parsed.total };
        }
      }

      // 5. Store in Firestore
      let purchaseTimestamp = null;

      if (parsed.purchaseDate) {
        const d = new Date(parsed.purchaseDate);
        if (!isNaN(d.getTime())) purchaseTimestamp = admin.firestore.Timestamp.fromDate(d);
      }

      const docRef = await admin.firestore().collection("expenses").add({
        vendor: parsed.vendor || "Unknown",
        purchaseDate: purchaseTimestamp,
        category: parsed.category || "other",
        items: parsed.items || [],
        subtotal: parsed.subtotal || null,
        tax: parsed.tax || null,
        total: parsed.total || null,
        rawImageUrl: storagePath,
        rawOcrText: "Parsed via Gemini Vision API",
        status: "draft",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { id: docRef.id, ...parsed };
    } catch (err) {
      console.error("parseReceipt error:", err);
      throw new functions.https.HttpsError("internal", "Failed to parse receipt: " + err.message);
    }
  });
