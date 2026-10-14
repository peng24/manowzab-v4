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

// 🚀 Write Buffer Configuration for high-frequency chat streams
const BUFFER_MAX_SIZE = 20;
const BUFFER_FLUSH_INTERVAL_MS = 1500;

let _writeBuffer = [];
let _flushTimer = null;

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
 * Flushes all pending write buffer entries to IndexedDB in a single transaction.
 * @returns {Promise<void>}
 */
export async function flushChatArchiveBuffer() {
  if (_flushTimer) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }

  if (_writeBuffer.length === 0) return;

  const entriesToFlush = _writeBuffer.splice(0);

  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    entriesToFlush.forEach(({ entry, videoId }) => {
      if (entry && entry.id) {
        store.put({ ...entry, videoId });
      }
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn("[ChatIdb] flushChatArchiveBuffer failed:", e);
  }
}

// 🛡️ Automatic flush on page visibility change or tab close to prevent data loss
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushChatArchiveBuffer().catch(() => {});
    }
  });

  window.addEventListener("pagehide", () => {
    flushChatArchiveBuffer().catch(() => {});
  });
}

/**
 * Archive chat entries to Write Buffer and batch insert to IndexedDB.
 * Batches inserts every 1.5s or when buffer reaches 20 entries.
 *
 * @param {string} videoId - Current video session ID
 * @param {Array<Object>} entries - fullChatLog entries to persist
 * @returns {Promise<void>}
 */
export async function archiveChatEntries(videoId, entries) {
  if (!videoId || !entries || entries.length === 0) return;

  for (const entry of entries) {
    if (entry && entry.id) {
      _writeBuffer.push({ videoId, entry });
    }
  }

  if (_writeBuffer.length >= BUFFER_MAX_SIZE) {
    await flushChatArchiveBuffer();
  } else if (!_flushTimer) {
    _flushTimer = setTimeout(() => {
      flushChatArchiveBuffer().catch(() => {});
    }, BUFFER_FLUSH_INTERVAL_MS);
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
  // Ensure any pending buffered entries are flushed before reading
  await flushChatArchiveBuffer();
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
  // Clear any pending entries for this videoId from the in-memory write buffer
  _writeBuffer = _writeBuffer.filter((item) => item.videoId !== videoId);
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
