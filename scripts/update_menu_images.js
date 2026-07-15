import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "bigi-awasaana-7b3ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const imageMap = {
  "beef gyro": "beef_gyro_bowl_1784090152106.png",
  "chicken gyro": "beef_gyro_bowl_1784090152106.png",
  "shami": "shami_kabab_1784090164349.png",
  "smash burger": "smash_burger_1784090174900.png",
  "chicken shawarma": "chicken_shawarma_1784090183406.png",
  "beef shawarma": "chicken_shawarma_1784090183406.png",
  "afghan burger": "afghan_burger_1784090196577.png",
  "bolani": "bolani_1784090218790.png",
  "samosa": "samosa_1784090230040.png",
  "chapli": "chapli_kabab_1784090241091.png",
  "qabuli": "qabuli_palaw_1784090251704.png",
  "tikka": "tikka_kabab_1784090262369.png",
  "cheese kabab": "tikka_kabab_1784090262369.png"
};

async function updateMenuImages() {
  const snapshot = await getDocs(collection(db, 'menu'));
  for (const itemDoc of snapshot.docs) {
    const data = itemDoc.data();
    const name = data.name.toLowerCase();
    
    let matchedImage = null;
    for (const [keyword, filename] of Object.entries(imageMap)) {
      if (name.includes(keyword)) {
        matchedImage = `/menu-images/${filename}`;
        break;
      }
    }
    
    if (matchedImage) {
      await updateDoc(doc(db, 'menu', itemDoc.id), {
        img: matchedImage,
        image: matchedImage,
        imageUrl: matchedImage 
      });
      console.log(`Updated ${data.name} with ${matchedImage}`);
    } else {
      console.log(`No image for ${data.name}`);
    }
  }
}

updateMenuImages().then(() => console.log("Done")).catch(console.error);
