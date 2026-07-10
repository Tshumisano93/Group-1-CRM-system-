import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Vite allows importing JSON files directly
import config from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId || ""
};

let app;
let auth: any = null;
let db: Firestore;
let storage: any = null;
let isFirebaseEnabled = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Initialize Auth
    auth = getAuth(app);
    
    // Initialize Firestore with offline persistence enabled
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, config.firestoreDatabaseId || "(default)");
    
    // Initialize Storage
    storage = getStorage(app);
    
    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully with project:", firebaseConfig.projectId);
  } else {
    console.warn("Firebase config is incomplete. Falling back to local cache mode.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

export { app, auth, db, storage, firebaseConfig, isFirebaseEnabled };
