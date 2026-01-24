import { SearchResult } from '../types';

/**
 * Search cache entry stored in IndexedDB
 */
interface CacheEntry {
  key: string; // orgId:query:type:starredOnly
  results: SearchResult[];
  total: number;
  timestamp: number; // Unix timestamp in milliseconds
  warnings?: string[];
  usedFallback?: boolean;
}

const DB_NAME = 'OrgTreeSearchCache';
const STORE_NAME = 'searches';
const DB_VERSION = 1;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

/**
 * Initialize IndexedDB for search caching
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        // Index by timestamp for efficient cleanup
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Generate cache key from search parameters
 */
function getCacheKey(orgId: string, query: string, type: string, starredOnly: boolean): string {
  return `${orgId}:${query.toLowerCase().trim()}:${type}:${starredOnly}`;
}

/**
 * Get cached search results if available and not expired
 */
export async function getCachedSearch(
  orgId: string,
  query: string,
  type: string,
  starredOnly: boolean
): Promise<Omit<CacheEntry, 'key' | 'timestamp'> | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const key = getCacheKey(orgId, query, type, starredOnly);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check if entry is expired
        const now = Date.now();
        if (now - entry.timestamp > CACHE_TTL_MS) {
          // Entry expired, delete it
          const deleteTransaction = db.transaction([STORE_NAME], 'readwrite');
          const deleteStore = deleteTransaction.objectStore(STORE_NAME);
          deleteStore.delete(key);
          resolve(null);
          return;
        }

        // Return cached data
        resolve({
          results: entry.results,
          total: entry.total,
          warnings: entry.warnings,
          usedFallback: entry.usedFallback,
        });
      };
    });
  } catch (error) {
    console.error('[searchCache] Failed to get cached search:', error);
    return null;
  }
}

/**
 * Cache search results
 */
export async function cacheSearch(
  orgId: string,
  query: string,
  type: string,
  starredOnly: boolean,
  results: SearchResult[],
  total: number,
  warnings?: string[],
  usedFallback?: boolean
): Promise<void> {
  try {
    const db = await openDatabase();
    const key = getCacheKey(orgId, query, type, starredOnly);
    const timestamp = Date.now();

    const entry: CacheEntry = {
      key,
      results,
      total,
      timestamp,
      warnings,
      usedFallback,
    };

    // Add entry to cache
    const addTransaction = db.transaction([STORE_NAME], 'readwrite');
    const addStore = addTransaction.objectStore(STORE_NAME);
    addStore.put(entry);

    // Wait for transaction to complete
    await new Promise((resolve, reject) => {
      addTransaction.oncomplete = () => resolve(undefined);
      addTransaction.onerror = () => reject(addTransaction.error);
    });

    // Cleanup old entries if cache is too large
    await cleanupOldEntries(db);
  } catch (error) {
    console.error('[searchCache] Failed to cache search:', error);
  }
}

/**
 * Remove oldest entries if cache exceeds max size
 */
async function cleanupOldEntries(db: IDBDatabase): Promise<void> {
  try {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    // Get all entries sorted by timestamp (oldest first)
    const request = index.openCursor();
    const entries: CacheEntry[] = [];

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Delete oldest entries if we exceed max size
    if (entries.length > MAX_CACHE_SIZE) {
      const entriesToDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      const deleteTransaction = db.transaction([STORE_NAME], 'readwrite');
      const deleteStore = deleteTransaction.objectStore(STORE_NAME);

      for (const entry of entriesToDelete) {
        deleteStore.delete(entry.key);
      }

      await new Promise<void>((resolve, reject) => {
        deleteTransaction.oncomplete = () => resolve();
        deleteTransaction.onerror = () => reject(deleteTransaction.error);
      });
    }
  } catch (error) {
    console.error('[searchCache] Failed to cleanup old entries:', error);
  }
}

/**
 * Clear all cached searches
 */
export async function clearSearchCache(): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('[searchCache] Failed to clear cache:', error);
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
