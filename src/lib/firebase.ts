
'use client';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: "AIzaSyAT9wsPUW7RFSF3-O8XBTrOJVBY8CTpILY",
  authDomain: "studio-5437783532-5f953.firebaseapp.com",
  databaseURL: "https://studio-5437783532-5f953-default-rtdb.firebaseio.com",
  projectId: "studio-5437783532-5f953",
  storageBucket: "studio-5437783532-5f953.firebasestorage.app",
  messagingSenderId: "680559094401",
  appId: "1:680559094401:web:a734241f6a8fe65b447b80"
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

import { getMessaging, Messaging } from 'firebase/messaging';
import { getDatabase, Database } from 'firebase/database';

let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;
let rtdbInstance: Database;
let messagingInstance: Messaging | null = null;

function getFirebaseServices() {
  if (!authInstance) authInstance = getAuth(app);
  if (!dbInstance) {
    dbInstance = getFirestore(app);
    // Habilitar persistencia offline para Firestore
    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(dbInstance).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Persistencia falló: múltiples pestañas abiertas');
        } else if (err.code === 'unimplemented') {
          console.warn('El navegador no soporta persistencia offline');
        }
      });
    }
  }
  if (!storageInstance) storageInstance = getStorage(app);
  if (!rtdbInstance) rtdbInstance = getDatabase(app);

  // Messaging is only supported in the browser
  if (typeof window !== 'undefined' && !messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.error("Firebase Messaging initialization failed", e);
    }
  }

  return {
    auth: authInstance,
    db: dbInstance,
    storage: storageInstance,
    messaging: messagingInstance,
    rtdb: rtdbInstance
  };
}

// Export the function to be used throughout the app
export { getFirebaseServices };
