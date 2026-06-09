importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCGJxbu5YDjdrguMrnARfmfkkyM228tFSY",
  authDomain: "bigi-awasaana-7b3ce.firebaseapp.com",
  projectId: "bigi-awasaana-7b3ce",
  storageBucket: "bigi-awasaana-7b3ce.firebasestorage.app",
  messagingSenderId: "807482124970",
  appId: "1:807482124970:web:d819b7ea604e58b3507ed3",
  measurementId: "G-KMWPNQK580"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
