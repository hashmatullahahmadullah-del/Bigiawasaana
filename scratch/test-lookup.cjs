const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

const firebaseConfig = {
  apiKey: "AIzaSyCGJxbu5YDjdrguMrnARfmfkkyM228tFSY",
  authDomain: "bigi-awasaana-7b3ce.firebaseapp.com",
  projectId: "bigi-awasaana-7b3ce",
  storageBucket: "bigi-awasaana-7b3ce.appspot.com",
  messagingSenderId: "1032337624137",
  appId: "1:1032337624137:web:86f67f5b3558f62f0f46bc"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'us-central1');
const lookupCustomer = httpsCallable(functions, 'lookupCustomer');

(async () => {
  try {
    console.log('Calling lookupCustomer with test phone 8185551234...');
    const res = await lookupCustomer({ phone: '8185551234' });
    console.log('Result:', res.data);
  } catch (err) {
    console.error('Error:', err.message, err.code);
  }
})();
