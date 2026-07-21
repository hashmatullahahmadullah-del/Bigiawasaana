import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = { projectId: "bigi-awasaana-7b3ce" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    "Chicken Soup": {price: 3.99}, // wait, chicken soup size variants might dictate price? The user's db had variants for size. We'll leave variants alone but change base price to 3.99.
    "Firni": {price: 3.99},
    "Milk Tea (Chai)": {name: "Chai Milk Tea", price: 2.95},
    "Doogh": {price: 3.95},
    "Cold Drinks": {name: "Soft Drinks", price: 2.45},
    "Bottled Water": {price: 1.99},
    "Cheese Kabab Stick": {price: 10.95}
};

async function patchDb() {
    const snapshot = await getDocs(collection(db, 'menu'));
    
    let updatesCount = 0;

    for (const d of snapshot.docs) {
        const data = d.data();
        const name = data.name;
        const ref = doc(db, 'menu', d.id);
        
        try {
            if (updates[name]) {
                console.log("Updating exact match: " + name);
                await updateDoc(ref, updates[name]);
                updatesCount++;
            } else if (name === "Afghan Burger Meal") {
                console.log("Updating Afghan Burger Meal to Bigi Silk Road Wrap Meal");
                await updateDoc(ref, updates["Bigi Silk Road Wrap Meal"]);
                updatesCount++;
            } else if (name === "Shami Kabab Plate") {
                console.log("Renaming Shami to Kobideh");
                await updateDoc(ref, {name: "Kobideh Kabob Skewer", price: 19.99});
                updatesCount++;
            }
        } catch (e) {
            console.error("Error updating " + name, e);
        }
    }

    console.log(`Finished! Attempted ${updatesCount} updates!`);
    process.exit(0);
}

patchDb().catch(console.error);
