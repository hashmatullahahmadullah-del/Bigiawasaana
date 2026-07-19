import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "bigi-awasaana-7b3ce",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snapshot = await getDocs(collection(db, 'menu'));
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(data.name);
    console.log("  variants:", data.variants);
    console.log("  addOns:", data.addOns);
  });
}
main();
