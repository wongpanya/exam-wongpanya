/**
 * In-Memory LRU/TTL Cache
 * Zero dependencies, memory-capped, optimized for DigitalOcean 512MB tier.
 */
class MemoryCache {
    constructor(defaultTtlSeconds = 60, maxItems = 500) {
        this.cache = new Map();
        this.defaultTtlMs = defaultTtlSeconds * 1000;
        this.maxItems = maxItems;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    set(key, value, ttlSeconds) {
        // Enforce max item limit to safeguard 512MB RAM
        if (this.cache.size >= this.maxItems) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        const ttlMs = (ttlSeconds !== undefined ? ttlSeconds : (this.defaultTtlMs / 1000)) * 1000;
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    del(key) {
        this.cache.delete(key);
    }

    delPattern(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    flush() {
        this.cache.clear();
    }
}

// Singletons for exams and categories
const examCache = new MemoryCache(90, 300); // 90 seconds TTL for exam lookups
const categoryCache = new MemoryCache(120, 100); // 2 minutes TTL for categories

module.exports = {
    MemoryCache,
    examCache,
    categoryCache,
};
