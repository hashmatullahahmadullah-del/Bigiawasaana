const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");
const { parseReceiptText } = require("./receiptParser");

if (!admin.apps.length) {
  admin.initializeApp();
}

const visionClient = new vision.ImageAnnotatorClient();
const bucket = admin.storage().bucket();

exports.parseReceipt = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onCall(async (data, context) => {
    const { storagePath } = data;

    if (!storagePath) {
      throw new functions.https.HttpsError("invalid-argument", "storagePath is required");
    }

    try {
      const gcsUri = `gs://${bucket.name}/${storagePath}`;
      const [result] = await visionClient.textDetection(gcsUri);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        const docRef = await admin.firestore().collection("expenses").add({
          vendor: "Unknown",
          purchaseDate: null,
          category: "other",
          items: [],
          subtotal: null,
          tax: null,
          total: null,
          rawImageUrl: storagePath,
          rawOcrText: "",
          status: "needs_review",
          parseError: "No text detected in image",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { id: docRef.id, status: "needs_review", reason: "no_text" };
      }

      const rawText = detections[0].description;
      console.log("=== OCR RAW TEXT ===");
      console.log(rawText);
      console.log("====================");
      
      const mappingsSnap = await admin.firestore().collection('receipt_mappings').get();
      const mappings = {};
      mappingsSnap.forEach(doc => mappings[doc.id] = doc.data());

      const parsed = parseReceiptText(rawText, mappings);

      const docRef = await admin.firestore().collection("expenses").add({
        vendor: parsed.vendor,
        purchaseDate: parsed.purchaseDate
          ? admin.firestore.Timestamp.fromDate(parsed.purchaseDate)
          : null,
        category: parsed.category,
        items: parsed.items,
        subtotal: parsed.subtotal,
        tax: parsed.tax,
        total: parsed.total,
        rawImageUrl: storagePath,
        rawOcrText: rawText,
        status: parsed.needsReview ? "needs_review" : "confirmed_candidate",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { id: docRef.id, ...parsed };
    } catch (err) {
      console.error("parseReceipt error:", err);
      throw new functions.https.HttpsError("internal", "Failed to parse receipt: " + err.message);
    }
  });
