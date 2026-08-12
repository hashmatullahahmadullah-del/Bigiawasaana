# Bigi Awasaana Security Configuration Guide

This document outlines the security configuration for the Bigi Awasaana project.

## Firebase App Check

Firebase App Check helps protect your backend resources from abuse by attesting that incoming requests originate from your authentic app.

### Web Configuration
1. Go to the Firebase Console > App Check.
2. Register your web app with reCAPTCHA Enterprise or reCAPTCHA v3.
3. In your web client (`src/auth.js` or similar Firebase initialization file), import and initialize App Check:
   ```javascript
   import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
   
   const appCheck = initializeAppCheck(app, {
     provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_V3_SITE_KEY'),
     isTokenAutoRefreshEnabled: true
   });
   ```

### Cloud Functions Configuration
1. In the Firebase Console, enforce App Check on your callable Cloud Functions.
2. In your Cloud Functions code, verify the App Check token for callable functions:
   ```javascript
   const functions = require("firebase-functions");
   
   exports.yourFunction = functions.https.onCall((data, context) => {
     if (context.app === undefined) {
       throw new functions.https.HttpsError(
         'failed-precondition',
         'The function must be called from an App Check verified app.'
       );
     }
     // Function logic...
   });
   ```

## reCAPTCHA v3 Setup for Public-Write Collections

For collections that allow public writes (like `page_views`, `reviews`, `catering_inquiries`), reCAPTCHA v3 should be used to prevent bot spam.

1. Obtain a reCAPTCHA v3 site key and secret key from the [reCAPTCHA admin console](https://www.google.com/recaptcha/admin).
2. On the client side, include the reCAPTCHA v3 script and generate a token before writing to Firestore.
3. Pass the token along with the data to a Cloud Function (instead of writing directly to Firestore from the client, or validating the token in the function before writing).
4. In the Cloud Function, verify the token using the Google reCAPTCHA API:
   ```javascript
   const axios = require('axios');
   
   async function verifyRecaptcha(token) {
     const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=YOUR_SECRET_KEY&response=${token}`);
     return response.data.success && response.data.score > 0.5;
   }
   ```
5. Ensure Firestore rules restrict direct writes from the client for these collections, or use Cloud Functions to handle the writes securely.

## Custom Claims for Admin Role

Currently, the admin email (`bigiawasaana@gmail.com`) is hardcoded in Firestore and Storage rules. This should be replaced with Custom Claims for better security and scalability.

### Setting up Custom Claims
1. Use the Firebase Admin SDK (e.g., in a secure node script or Cloud Function) to set the `admin` claim for a user:
   ```javascript
   const admin = require('firebase-admin');
   admin.initializeApp();
   
   admin.auth().setCustomUserClaims('USER_UID', { admin: true })
     .then(() => {
       console.log('Custom claims set for user.');
     });
   ```

### Updating Security Rules

**Firestore Rules:**
Instead of checking `request.auth.token.email == 'bigiawasaana@gmail.com'`, check the custom claim:
```javascript
match /{document=**} {
  allow read, write: if request.auth != null && request.auth.token.admin == true;
}
```

**Storage Rules:**
Similarly, update the Storage rules:
```javascript
match /{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.token.admin == true;
}
```

By transitioning to Custom Claims, you can easily manage multiple admins without updating the security rules each time.
