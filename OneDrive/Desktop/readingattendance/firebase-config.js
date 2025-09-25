// Firebase Configuration
// Replace these values with your Firebase project configuration
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase once
if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// Auto-connect to emulators in local dev
const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (isLocalhost) {
    try {
        auth.useEmulator('http://127.0.0.1:9095');
        db.useEmulator('127.0.0.1', 8085);
        functions.useEmulator('127.0.0.1', 5002);
        console.log('[Firebase] Connected to local emulators');
    } catch (e) {
        console.warn('[Firebase] Emulator connection warning:', e);
    }
}

// Export for use in other files
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.functions = functions;
// Firebase configuration (used by frontend/app.js to initialize)
window.firebaseConfig = {
	apiKey: "AIzaSyCMJzYUsmZsf8KBWXQD8yFCdaurd5dCauY",
	authDomain: "reading-streak.firebaseapp.com",
	projectId: "reading-streak",
	storageBucket: "reading-streak.firebasestorage.app",
	messagingSenderId: "508966325542",
	appId: "1:508966325542:web:82da076dc762ecc00fc5e7",
	measurementId: "G-TF60SVCQ5W"
};

// Do not initialize here; initialization happens in frontend/app.js to avoid double init.

// Firebase configuration (used by frontend/app.js to initialize)
window.firebaseConfig = {
	apiKey: "AIzaSyCMJzYUsmZsf8KBWXQD8yFCdaurd5dCauY",
	authDomain: "reading-streak.firebaseapp.com",
	projectId: "reading-streak",
	storageBucket: "reading-streak.firebasestorage.app",
	messagingSenderId: "508966325542",
	appId: "1:508966325542:web:82da076dc762ecc00fc5e7",
	measurementId: "G-TF60SVCQ5W"
};

// Do not initialize here; initialization happens in frontend/app.js to avoid double init.
