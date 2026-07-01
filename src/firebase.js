
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCGJxbu5YDjdrguMrnARfmfkkyM228tFSY",
  authDomain: "bigi-awasaana-7b3ce.firebaseapp.com",
  projectId: "bigi-awasaana-7b3ce",
  storageBucket: "bigi-awasaana-7b3ce.firebasestorage.app",
  messagingSenderId: "807482124970",
  appId: "1:807482124970:web:d819b7ea604e58b3507ed3",
  measurementId: "G-KMWPNQK580"
};

const app = initializeApp(firebaseConfig);
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(console.error);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };
