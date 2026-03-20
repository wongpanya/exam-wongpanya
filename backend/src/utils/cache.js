class MemoryCache {
    constructor(defaultTtl = 60000) { // Default 60 seconds TTL
        this.cache = new Map();
        this.defaultTtl = defaultTtl;
    }

    set(key, value, ttl = this.defaultTtl) {
        if (this.cache.has(key)) {
            clearTimeout(this.cache.get(key).timeoutId);
        }

        const timeoutId = setTimeout(() => {
            this.cache.delete(key);
        }, ttl);

        this.cache.set(key, { value, timeoutId });
    }

    get(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key).value;
        }
        return null;
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        if (this.cache.has(key)) {
            clearTimeout(this.cache.get(key).timeoutId);
            this.cache.delete(key);
            return true;
        }
        return false;
    }

    clear() {
        for (const [key, item] of this.cache.entries()) {
            clearTimeout(item.timeoutId);
        }
        this.cache.clear();
    }
}

// Create a singleton instance with default 5-minute TTL (300000ms)
const globalCache = new MemoryCache(300000);

module.exports = globalCache;
