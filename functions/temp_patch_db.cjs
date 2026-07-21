const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const updates = {
    // Meals
    "Bigi Silk Road Wrap Meal": {price: 12.99, name: "Bigi Silk Road Wrap Meal"},
    "Chicken Shawarma Meal": {price: 15.99, name: "Chicken Shawarma Meal"},
    "Smash Burger Meal": {price: 15.99, name: "Smash Burger Meal"},
    "Beef Shawarma Meal": {price: 17.95, name: "Beef Shawarma Meal"},
    "Chicken Gyro Rice Bowl Meal": {price: 16.95, name: "Chicken Gyro Rice Bowl Meal"},
    "Beef Gyro Rice Bowl Meal": {price: 18.95, name: "Beef Gyro Rice Bowl Meal"},

    // Other items from TV
    "Qabuli Palaw": {price: 19.99},
    "Tikka Kabab Plate": {price: 19.99},
    "Veg Samosa": {price: 1.99},
    "Chicken Samosa": {price: 2.99},
    "Chicken Soup": {price: 3.99},
    "Firni": {price: 3.99},
    "Milk Tea (Chai)": {name: "Chai Milk Tea", price: 2.95},
    "Doogh": {price: 3.95},
    "Cold Drinks": {name: "Soft Drinks", price: 2.45},
    "Bottled Water": {price: 1.99},
    "Cheese Kabab Stick": {price: 10.95}
};

async function patchDb() {
    const menuRef = db.collection('menu');
    const snapshot = await menuRef.get();
    
    let batch = db.batch();
    let updatesCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const name = data.name;
        
        if (updates[name]) {
            console.log("Updating exact match: " + name);
            batch.update(doc.ref, updates[name]);
            updatesCount++;
        } else if (name === "Afghan Burger Meal") {
            console.log("Updating Afghan Burger Meal to Bigi Silk Road Wrap Meal");
            batch.update(doc.ref, updates["Bigi Silk Road Wrap Meal"]);
            updatesCount++;
        } else if (name === "Shami Kabab Plate") {
            // Check if we should rename to Kobideh, actually let's leave it as Shami if not explicitly specified by user. Wait, TV menu says Kobideh Kabob Skewer. Let's rename it!
            console.log("Renaming Shami to Kobideh");
            batch.update(doc.ref, {name: "Kobideh Kabob Skewer", price: 19.99});
            updatesCount++;
        }
    });

    if (updatesCount > 0) {
        await batch.commit();
        console.log(`Committed ${updatesCount} updates!`);
    } else {
        console.log("No updates found.");
    }
}

patchDb().catch(console.error);
