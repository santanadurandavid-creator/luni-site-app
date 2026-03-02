import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAT9wsPUW7RFSF3-O8XBTrOJVBY8CTpILY",
  authDomain: "studio-5437783532-5f953.firebaseapp.com",
  databaseURL: "https://studio-5437783532-5f953-default-rtdb.firebaseio.com",
  projectId: "studio-5437783532-5f953",
  storageBucket: "studio-5437783532-5f953.firebasestorage.app",
  messagingSenderId: "680559094401",
  appId: "1:680559094401:web:d63acae40665c343447b80"
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

function getFirebaseServices() {
    if (!authInstance) authInstance = getAuth(app);
    if (!dbInstance) dbInstance = getFirestore(app);
    if (!storageInstance) storageInstance = getStorage(app);
    return { auth: authInstance, db: dbInstance, storage: storageInstance };
}

// Export the function to be used throughout the app
export { getFirebaseServices };
