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
import configData from "../firebase-applet-config.json";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  oAuthClientId?: string;
  firestoreDatabaseId?: string;
}

const config = configData as FirebaseConfig;

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

export async function getAuthIdToken(): Promise<string | null> {
  if (!isFirebaseEnabled || !auth) return null;
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn("Failed to get ID token from currentUser:", e);
    }
  }
  await new Promise<void>((resolve) => {
    const unsub = auth.onAuthStateChanged(() => {
      unsub();
      resolve();
    });
    setTimeout(resolve, 1500);
  });
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn("Failed to get ID token after auth state resolve:", e);
    }
  }
  return null;
}

export { app, auth, db, storage, firebaseConfig, isFirebaseEnabled };
