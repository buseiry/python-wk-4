// Firebase Configuration for Reading Attendance Tracker
// Connected to your real Firebase project

// Check if Firebase is available
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Please check your internet connection.');
}

// Your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCMJzYUsmZsf8KBWXQD8yFCdaurd5dCauY",
    authDomain: "reading-streak.firebaseapp.com",
    projectId: "reading-streak",
    storageBucket: "reading-streak.appspot.com",
    messagingSenderId: "508966325542",
    appId: "1:508966325542:web:82da076dc762ecc00fc5e7"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization failed:', error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// Enable offline persistence
db.enablePersistence().catch((err) => {
    if (err.code === 'failed-precondition') {
        console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.log('The current browser does not support all features required for persistence.');
    }
});

// Export services for global access
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseFunctions = functions;

// Optional: listen to auth state changes
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('No user logged in.');
    }
});

console.log(`
🚀 Reading Attendance Tracker - Firebase Connected
==========================================

The app is now connected to your Firebase project.

Current features:
✅ UI/UX - Full interface visible
✅ Authentication - Real email/password login & register
✅ Firestore - Points, sessions, leaderboard saved
✅ Responsive design - Works on all devices
`);
