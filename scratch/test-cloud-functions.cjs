const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForTestingOnly", // or check src/firebase.js
  projectId: "bigi-awasaana-7b3ce"
};

// Let's read src/firebase.js to get exact config
const fs = require('fs');
const fbFile = fs.readFileSync('src/firebase.js', 'utf8');
console.log('firebase.js snippet:');
console.log(fbFile.slice(0, 300));
