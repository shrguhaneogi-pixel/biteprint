"use client";

import { useCallback } from "react";
import type { ScanRecord } from "@/types";

const DB_NAME = "biteprint";
const DB_VERSION = 1;
const STORE_NAME = "scans";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * useScanHistory — IndexedDB CRUD without external dependencies.
 * Falls back gracefully if IndexedDB is unavailable (e.g., SSR).
 */
export function useScanHistory() {
  const save = useCallback(async (record: ScanRecord): Promise<void> => {
    if (typeof indexedDB === "undefined") return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }, []);

  const getAll = useCallback(async (limit = 50): Promise<ScanRecord[]> => {
    if (typeof indexedDB === "undefined") return [];
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.objectStore(STORE_NAME).index("timestamp");
      const records: ScanRecord[] = [];
      const req = index.openCursor(null, "prev");
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor && records.length < limit) {
          records.push(cursor.value as ScanRecord);
          cursor.continue();
        } else {
          resolve(records);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }, []);

  const clearAll = useCallback(async (): Promise<void> => {
    if (typeof indexedDB === "undefined") return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }, []);

  return { save, getAll, clearAll };
}
