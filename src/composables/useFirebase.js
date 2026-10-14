import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

import { ref as dbRef, update } from "firebase/database";

// Auto Sign In
signInAnonymously(auth).catch(console.error);

/**
 * Perform an atomic multi-path update at root database reference.
 * @param {Record<string, any>} pathsObject - Key-value pairs of database paths and values
 * @returns {Promise<void>}
 */
export async function multiPathUpdate(pathsObject) {
  if (!pathsObject || Object.keys(pathsObject).length === 0) return;
  return update(dbRef(db), pathsObject);
}

export function useFirebase() {
  return { db, auth, multiPathUpdate };
}

