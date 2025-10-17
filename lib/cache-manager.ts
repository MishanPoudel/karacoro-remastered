/**
 * Advanced Caching System
 * Multi-layer caching with memory, localStorage, and IndexedDB
 */

import { handleStorageError } from './error-handler';

export enum CacheStrategy {
  MEMORY_ONLY = 'MEMORY_ONLY',
  LOCAL_STORAGE = 'LOCAL_STORAGE',
  INDEXED_DB = 'INDEXED_DB',
  MULTI_LAYER = 'MULTI_LAYER',
}

export interface CacheOptions {
  strategy: CacheStrategy;
  ttl?: number; // Time to live in milliseconds
  key: string;
  version?: string; // For cache versioning
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

/**
 * Memory cache with LRU eviction
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder = new Map<string, number>();
  private maxSize: number = 100;
  private currentSize: number = 0;

  set<T>(key: string, value: T, ttl: number = Infinity, version: string = '1.0'): void {
    // Evict oldest if at capacity
    if (this.currentSize >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      version,
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, Date.now());
    
    if (!this.cache.has(key)) {
      this.currentSize++;
    }
  }

  get<T>(key: string, version?: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check version
    if (version && entry.version !== version) {
      this.cache.delete(key);
      this.currentSize--;
      return null;
    }

    // Check TTL
    if (entry.ttl !== Infinity && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.currentSize--;
      return null;
    }

    // Update access order
    this.accessOrder.set(key, Date.now());
    return entry.data;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    if (this.cache.delete(key)) {
      this.accessOrder.delete(key);
      this.currentSize--;
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  getStats() {
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * localStorage cache with compression
 */
class LocalStorageCache {
  private prefix = 'karacoro_cache_';

  set<T>(key: string, value: T, ttl: number = Infinity, version: string = '1.0'): boolean {
    try {
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        version,
      };

      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
      return true;
    } catch (error) {
      handleStorageError('save to cache', error);
      return false;
    }
  }

  get<T>(key: string, version?: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      
      if (!item) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check version
      if (version && entry.version !== version) {
        this.delete(key);
        return null;
      }

      // Check TTL
      if (entry.ttl !== Infinity && Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      handleStorageError('read from cache', error);
      return null;
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      handleStorageError('delete from cache', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      handleStorageError('clear cache', error);
    }
  }

  getSize(): number {
    try {
      let size = 0;
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          size += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16 = 2 bytes per char
        }
      }
      return size;
    } catch {
      return 0;
    }
  }
}

/**
 * IndexedDB cache for larger data
 */
class IndexedDBCache {
  private dbName = 'karacoro_cache';
  private storeName = 'cache_store';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  async set<T>(key: string, value: T, ttl: number = Infinity, version: string = '1.0'): Promise<boolean> {
    try {
      if (!this.db) await this.init();

      const entry = {
        key,
        data: value,
        timestamp: Date.now(),
        ttl,
        version,
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(entry);

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          handleStorageError('save to IndexedDB', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      handleStorageError('save to IndexedDB', error);
      return false;
    }
  }

  async get<T>(key: string, version?: string): Promise<T | null> {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> & { key: string } | undefined;
          
          if (!entry) {
            resolve(null);
            return;
          }

          // Check version
          if (version && entry.version !== version) {
            this.delete(key);
            resolve(null);
            return;
          }

          // Check TTL
          if (entry.ttl !== Infinity && Date.now() - entry.timestamp > entry.ttl) {
            this.delete(key);
            resolve(null);
            return;
          }

          resolve(entry.data);
        };

        request.onerror = () => {
          handleStorageError('read from IndexedDB', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      handleStorageError('read from IndexedDB', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch {
      // Silent fail for delete
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch {
      // Silent fail for clear
    }
  }
}

/**
 * Main Cache Manager
 */
class CacheManager {
  private memoryCache = new MemoryCache();
  private localStorageCache = new LocalStorageCache();
  private indexedDBCache = new IndexedDBCache();

  async set<T>(options: CacheOptions & { value: T }): Promise<void> {
    const { strategy, key, value, ttl = 3600000, version = '1.0' } = options; // Default 1 hour

    switch (strategy) {
      case CacheStrategy.MEMORY_ONLY:
        this.memoryCache.set(key, value, ttl, version);
        break;

      case CacheStrategy.LOCAL_STORAGE:
        this.localStorageCache.set(key, value, ttl, version);
        break;

      case CacheStrategy.INDEXED_DB:
        await this.indexedDBCache.set(key, value, ttl, version);
        break;

      case CacheStrategy.MULTI_LAYER:
        // Store in all layers
        this.memoryCache.set(key, value, ttl, version);
        this.localStorageCache.set(key, value, ttl, version);
        await this.indexedDBCache.set(key, value, ttl, version);
        break;
    }
  }

  async get<T>(options: CacheOptions): Promise<T | null> {
    const { strategy, key, version } = options;

    switch (strategy) {
      case CacheStrategy.MEMORY_ONLY:
        return this.memoryCache.get<T>(key, version);

      case CacheStrategy.LOCAL_STORAGE:
        return this.localStorageCache.get<T>(key, version);

      case CacheStrategy.INDEXED_DB:
        return await this.indexedDBCache.get<T>(key, version);

      case CacheStrategy.MULTI_LAYER:
        // Try memory first (fastest)
        let data = this.memoryCache.get<T>(key, version);
        if (data !== null) return data;

        // Try localStorage (fast)
        data = this.localStorageCache.get<T>(key, version);
        if (data !== null) {
          // Populate memory cache
          this.memoryCache.set(key, data, options.ttl || 3600000, version);
          return data;
        }

        // Try IndexedDB (slowest)
        data = await this.indexedDBCache.get<T>(key, version);
        if (data !== null) {
          // Populate upper caches
          this.memoryCache.set(key, data, options.ttl || 3600000, version);
          this.localStorageCache.set(key, data, options.ttl || 3600000, version);
          return data;
        }

        return null;
    }
  }

  async delete(key: string, strategy: CacheStrategy = CacheStrategy.MULTI_LAYER): Promise<void> {
    switch (strategy) {
      case CacheStrategy.MEMORY_ONLY:
        this.memoryCache.delete(key);
        break;

      case CacheStrategy.LOCAL_STORAGE:
        this.localStorageCache.delete(key);
        break;

      case CacheStrategy.INDEXED_DB:
        await this.indexedDBCache.delete(key);
        break;

      case CacheStrategy.MULTI_LAYER:
        this.memoryCache.delete(key);
        this.localStorageCache.delete(key);
        await this.indexedDBCache.delete(key);
        break;
    }
  }

  async clear(strategy: CacheStrategy = CacheStrategy.MULTI_LAYER): Promise<void> {
    switch (strategy) {
      case CacheStrategy.MEMORY_ONLY:
        this.memoryCache.clear();
        break;

      case CacheStrategy.LOCAL_STORAGE:
        this.localStorageCache.clear();
        break;

      case CacheStrategy.INDEXED_DB:
        await this.indexedDBCache.clear();
        break;

      case CacheStrategy.MULTI_LAYER:
        this.memoryCache.clear();
        this.localStorageCache.clear();
        await this.indexedDBCache.clear();
        break;
    }
  }

  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      localStorage: {
        size: this.localStorageCache.getSize(),
      },
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * Helper function to cache API responses
 */
export const cacheAPIResponse = async <T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600000, // 1 hour
  strategy: CacheStrategy = CacheStrategy.MULTI_LAYER
): Promise<T> => {
  // Try to get from cache first
  const cached = await cacheManager.get<T>({
    strategy,
    key: cacheKey,
    ttl,
  });

  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await cacheManager.set({
    strategy,
    key: cacheKey,
    value: data,
    ttl,
  });

  return data;
};

/**
 * Preload cache with popular data
 */
export const preloadCache = async (): Promise<void> => {
  // Preload popular YouTube videos
  // This could be done on app initialization
  console.log('[Cache] Preloading popular content...');
  
  // TODO: Implement preloading logic based on usage patterns
};

/**
 * Clean expired cache entries
 */
export const cleanExpiredCache = async (): Promise<void> => {
  console.log('[Cache] Cleaning expired entries...');
  
  // This is automatically handled by TTL checks
  // But you could implement a background cleanup job here
};
