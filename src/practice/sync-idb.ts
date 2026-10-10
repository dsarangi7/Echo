import { isSyncSnapshot, normalizeReminder, snapshotFromRecord, type SyncSnapshot } from "./reminder";

/** Shared with the service worker. The page still treats localStorage as the source of truth. */
export const SYNC_DB_NAME = "echo-practice-sync";
export const SYNC_STORE = "kv";
export const SYNC_SNAPSHOT_KEY = "snapshot";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) db.createObjectStore(SYNC_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
  });
}

export async function readSnapshot(): Promise<SyncSnapshot | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, "readonly");
      const request = tx.objectStore(SYNC_STORE).get(SYNC_SNAPSHOT_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("indexedDB read failed"));
    });
    if (!isSyncSnapshot(value)) return null;
    return snapshotFromRecord(normalizeReminder(value.reminder), {
      practiceDays: value.practiceDays,
      lastPracticeDay: value.lastPracticeDay,
    });
  } finally {
    db.close();
  }
}

export async function writeSnapshot(snapshot: SyncSnapshot): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, "readwrite");
      const request = tx.objectStore(SYNC_STORE).put(snapshot, SYNC_SNAPSHOT_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("indexedDB write failed"));
    });
  } finally {
    db.close();
  }
}
