import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Development-only, isolated integration tests. Production builds ignore this flag.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  connectDatabaseEmulator(db, '127.0.0.1', 9009);
  connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true });
}

import { ref as dbRef, update } from "firebase/database";

// Authentication is established by the auth store after an explicit login.

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

