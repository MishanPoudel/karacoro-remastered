/**
 * Redis abstraction used across the app. If UPSTASH env vars are present
 * this will use Upstash Redis for persistence; otherwise it falls back to
 * a memory-backed TTL cache implementation suitable for development and
 * builds.
 */

type CacheValue = any;
interface SetOptions { ex?: number } // expiration in seconds

// ----- In-memory fallback -----
class MemoryCache {
  private store = new Map<string, { value: CacheValue; expiresAt?: number }>();

  constructor() {
    // Periodic cleanup on the server only
    if (typeof window === 'undefined') {
      setInterval(() => this.cleanup(), 30 * 1000);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt && v.expiresAt <= now) this.store.delete(k);
    }
  }

  async get(key: string): Promise<CacheValue | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: CacheValue, opts?: SetOptions): Promise<void> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

const memoryCache = new MemoryCache();

// ----- Upstash Redis (optional) -----
let upstashClient: any = null;
let usingUpstash = false;

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

try {
  if (isUpstashConfigured()) {
    // require dynamically to avoid build-time errors when package is not installed
    // and to keep the in-memory fallback usable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redis } = require('@upstash/redis');
    upstashClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    usingUpstash = true;
  }
} catch (err) {
  console.warn('Upstash Redis client not initialized, falling back to in-memory cache:', err?.message || err);
  upstashClient = null;
  usingUpstash = false;
}

export { upstashClient as redis, usingUpstash };

// ----- Unified cache interface -----
export const cache = {
  async get(key: string): Promise<any | null> {
    if (usingUpstash && upstashClient) {
      try {
        const raw = await upstashClient.get(key);
        if (raw == null) return null;
        // Stored values are JSON-serialized
        try { return JSON.parse(raw); } catch (_) { return raw; }
      } catch (err) {
        console.warn('Upstash get error, falling back to memory cache:', err?.message || err);
      }
    }
    return memoryCache.get(key);
  },

  async set(key: string, value: any, opts?: SetOptions): Promise<void> {
    if (usingUpstash && upstashClient) {
      try {
        const stringified = typeof value === 'string' ? value : JSON.stringify(value);
        if (opts?.ex) {
          await upstashClient.set(key, stringified, { ex: opts.ex });
        } else {
          await upstashClient.set(key, stringified);
        }
        return;
      } catch (err) {
        console.warn('Upstash set error, falling back to memory cache:', err?.message || err);
      }
    }
    await memoryCache.set(key, value, opts);
  },

  async del(key: string): Promise<void> {
    if (usingUpstash && upstashClient) {
      try {
        await upstashClient.del(key);
        return;
      } catch (err) {
        console.warn('Upstash del error, falling back to memory cache:', err?.message || err);
      }
    }
    await memoryCache.del(key);
  },

  async clear(): Promise<void> {
    if (usingUpstash && upstashClient) {
      try {
        // Upstash doesn't provide a single 'flushall' in the same way; skip for safety
      } catch (err) {
        console.warn('Upstash clear error:', err?.message || err);
      }
    }
    await memoryCache.clear();
  }
};

export default cache;
