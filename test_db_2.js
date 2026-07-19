import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = { projectId: "bigi-awasaana-7b3ce" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snapshot = await getDocs(collection(db, 'menu'));
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.name.includes('Smash Burger') || data.name.includes('Shawarma')) {
      console.log(`[${data.category}] ${data.name} | addons: ${data.addOns?.length} | variants: ${data.variants?.length}`);
    }
  });
}
main();
