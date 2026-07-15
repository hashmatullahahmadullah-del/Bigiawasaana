import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "bigi-awasaana-7b3ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listMenuItems() {
  const snapshot = await getDocs(collection(db, 'menu'));
  const items = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
  console.log(JSON.stringify(items, null, 2));
}

listMenuItems().catch(console.error);
