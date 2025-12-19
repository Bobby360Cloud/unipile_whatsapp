import Redis from 'ioredis';

let redis = null;

export default async function connectRedis(config = {}) {
    console.log('Connecting to Redis...', redis?.status );
    if (redis?.status === 'ready' || redis?.status === 'connecting') return redis;

    redis = new Redis({
        host: config.host || '127.0.0.1',
        port: config.port || 6379,
        password: config.password || undefined,
        db: config.db || 0,
        retryStrategy: (times) => Math.min(times * 50, 2000), // reconnect
    });

    redis.on('connect', () => console.log('✅ Redis connected'));
    redis.on('error', (err) => console.error('❌ Redis error:', err.message));

    return redis;
}

/**
 * Write (set) data to cache
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=0] 
 */
export async function cacheSet(key, value, ttlSeconds = 0) {
    if (!redis) throw new Error('Redis not connected');
    const data = JSON.stringify(value);
    if (ttlSeconds > 0) {
        await redis.set(key, data, 'EX', ttlSeconds);
    } else {
        await redis.set(key, data);
    }
}

/**
 * Read (get) data from cache
 * @param {string} key
 * @returns {any | null}
 */
export async function cacheGet(key) {
    if (!redis) throw new Error('Redis not connected');
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}

export async function cacheDelete(key) {
    if (!redis) throw new Error('Redis not connected');
    await redis.del(key);
}

/**
 * Graceful disconnect
 */
export async function disconnectRedis() {
    if (redis) await redis.quit();
}

export async function updateCacheObject(key, updates) {
    if (!redis) throw new Error('Redis not connected');

    let raw = await redis.get(key);
    let data = raw ? JSON.parse(raw) : {};   // ✅ fixed (raw could be null)

    data = { ...data, ...updates };
    await redis.set(key, JSON.stringify(data));

    return data;
}
