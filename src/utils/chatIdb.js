/**
 * chatIdb.js — IndexedDB archive utility for fullChatLog
 *
 * บทบาท: รับ chat entries ที่กำลังจะถูก trim ออกจาก RAM (fullChatLog)
 * และ persist ไว้ใน IndexedDB แทน เพื่อให้ Export CSV ยังได้ข้อมูลครบ 100%
 *
 * DB Schema:
 *   DB: "manowzab_chat_archive" (v1)
 *   Store: "full_log"  — keyPath: "id"
 *     index "byVideoId"  — for per-session queries
 *     index "byTimestamp" — for sorted retrieval
 */

const DB_NAME = "manowzab_chat_archive";
const STORE_NAME = "full_log";
const DB_VERSION = 1;

let _db = null;

/**
 * Open (or reuse) the IndexedDB connection.
 * @returns {Promise<IDBDatabase>}
 */
function getDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("byVideoId", "videoId", { unique: false });
        store.createIndex("byTimestamp", "timestamp", { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;

      // Re-open on version change (other tab upgraded the DB)
      _db.onversionchange = () => {
        _db.close();
        _db = null;
      };

      resolve(_db);
    };

    req.onerror = (e) => reject(e.target.error);
    req.onblocked = () => console.warn("[ChatIdb] DB open blocked");
  });
}

/**
 * Archive a batch of chat entries to IndexedDB (non-blocking, fire-and-forget safe).
 * Uses `put` so duplicate IDs are safely overwritten.
 *
 * @param {string} videoId - Current video session ID
 * @param {Array<Object>} entries - fullChatLog entries to persist
 * @returns {Promise<void>}
 */
export async function archiveChatEntries(videoId, entries) {
  if (!videoId || !entries || entries.length === 0) return;
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    entries.forEach((entry) => {
      if (entry.id) {
        store.put({ ...entry, videoId });
      }
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(e.target.error);
    });
  } catch (e) {
    // IDB failures must never crash the app — log and continue
    console.warn("[ChatIdb] archiveChatEntries failed:", e);
  }
}

/**
 * Retrieve all archived chat entries for a given video session.
 * Returns [] on error (safe fallback).
 *
 * @param {string} videoId
 * @returns {Promise<Array<Object>>}
 */
export async function getAllChatEntries(videoId) {
  if (!videoId) return [];
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("byVideoId");
    return await new Promise((resolve, reject) => {
      const req = index.getAll(IDBKeyRange.only(videoId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn("[ChatIdb] getAllChatEntries failed:", e);
    return [];
  }
}

/**
 * Delete all archived entries for a specific video session.
 * Called when clearChat() is invoked (e.g., session switch).
 *
 * @param {string} videoId
 * @returns {Promise<void>}
 */
export async function clearChatEntries(videoId) {
  if (!videoId) return;
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("byVideoId");
    await new Promise((resolve, reject) => {
      const req = index.openKeyCursor(IDBKeyRange.only(videoId));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn("[ChatIdb] clearChatEntries failed:", e);
  }
}
