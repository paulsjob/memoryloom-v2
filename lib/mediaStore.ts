
/**
 * MediaStore: IndexedDB wrapper for persisting video blobs locally.
 * This solves the "sync overwrite" problem by keeping assets in the client's browser database.
 */

const DB_NAME = 'MemoryLoomCache';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

export const mediaStore = {
  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveVideo(key: string, blob: Blob): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getVideoUrl(key: string): Promise<string | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const blob = request.result as Blob;
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async clear(): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
  }
};
