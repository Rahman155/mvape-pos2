import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
/**
 * Redis connection and client management
 * Handles connection pooling, reconnection logic, and health checks
 */
class RedisConnection {
    client = null;
    isConnected = false;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000; // Start with 1 second
    /**
     * Initialize Redis connection
     */
    async initialize() {
        if (this.isConnected && this.client) {
            logger.warn('Redis connection already initialized');
            return;
        }
        try {
            const clientOptions = {
                url: config.redis.url,
                password: config.redis.password,
                // Connection pooling and retry options
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > this.maxReconnectAttempts) {
                            logger.error('Max Redis reconnection attempts reached');
                            return new Error('Max reconnection attempts exceeded');
                        }
                        const delay = Math.min(this.reconnectDelay * Math.pow(2, retries), 30000);
                        logger.warn(`Redis reconnecting (attempt ${retries + 1})...`, { delay });
                        return delay;
                    },
                    keepAlive: 30000,
                    noDelay: true,
                },
                // Set command timeout to 5 seconds
                commandsQueueBehavior: 'block',
            };
            this.client = createClient(clientOptions);
            // Handle connection events
            this.client.on('connect', () => {
                logger.info('Redis connection established');
            });
            this.client.on('reconnecting', () => {
                logger.warn('Redis reconnecting...');
            });
            this.client.on('ready', () => {
                logger.info('Redis client ready');
                this.isConnected = true;
                this.reconnectAttempts = 0;
            });
            this.client.on('error', (error) => {
                logger.error('Redis client error', error);
                this.isConnected = false;
            });
            this.client.on('end', () => {
                logger.warn('Redis connection closed');
                this.isConnected = false;
            });
            // Connect to Redis
            await this.client.connect();
            this.isConnected = true;
            logger.info('Redis client initialized', {
                url: config.redis.url,
            });
        }
        catch (error) {
            logger.error('Failed to initialize Redis connection', error);
            this.isConnected = false;
            throw error;
        }
    }
    /**
     * Get the Redis client instance
     */
    getClient() {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        return this.client;
    }
    /**
     * Set a key-value pair
     */
    async set(key, value, expiresIn) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            if (expiresIn) {
                // Set with expiration in seconds
                await this.client.setEx(key, expiresIn, value);
            }
            else {
                // Set without expiration
                await this.client.set(key, value);
            }
        }
        catch (error) {
            logger.error('Redis SET operation failed', error, { key });
            throw error;
        }
    }
    /**
     * Get a value by key
     */
    async get(key) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.get(key);
        }
        catch (error) {
            logger.error('Redis GET operation failed', error, { key });
            throw error;
        }
    }
    /**
     * Delete a key
     */
    async delete(key) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.del(key);
        }
        catch (error) {
            logger.error('Redis DEL operation failed', error, { key });
            throw error;
        }
    }
    /**
     * Delete multiple keys
     */
    async deleteMany(keys) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        if (keys.length === 0) {
            return 0;
        }
        try {
            return await this.client.del(keys);
        }
        catch (error) {
            logger.error('Redis DEL operation failed', error, { keys });
            throw error;
        }
    }
    /**
     * Check if a key exists
     */
    async exists(key) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            logger.error('Redis EXISTS operation failed', error, { key });
            throw error;
        }
    }
    /**
     * Get all keys matching a pattern
     */
    async keys(pattern) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.keys(pattern);
        }
        catch (error) {
            logger.error('Redis KEYS operation failed', error, { pattern });
            throw error;
        }
    }
    /**
     * Set hash field
     */
    async hSet(key, field, value) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.hSet(key, field, value);
        }
        catch (error) {
            logger.error('Redis HSET operation failed', error, { key, field });
            throw error;
        }
    }
    /**
     * Get hash field
     */
    async hGet(key, field) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.hGet(key, field);
        }
        catch (error) {
            logger.error('Redis HGET operation failed', error, { key, field });
            throw error;
        }
    }
    /**
     * Delete hash field
     */
    async hDel(key, field) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.hDel(key, field);
        }
        catch (error) {
            logger.error('Redis HDEL operation failed', error, { key, field });
            throw error;
        }
    }
    /**
     * Get all hash fields and values
     */
    async hGetAll(key) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.hGetAll(key);
        }
        catch (error) {
            logger.error('Redis HGETALL operation failed', error, { key });
            throw error;
        }
    }
    /**
     * Increment a counter
     */
    async incr(key) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.incr(key);
        }
        catch (error) {
            logger.error('Redis INCR operation failed', error, { key });
            throw error;
        }
    }
    /**
     * Decrement a counter
     */
    async decr(key) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.decr(key);
        }
        catch (error) {
            logger.error('Redis DECR operation failed', error, { key });
            throw error;
        }
    }
    /**
     * Get remaining TTL in seconds (-1 if no expiry, -2 if doesn't exist)
     */
    async ttl(key) {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        try {
            return await this.client.ttl(key);
        }
        catch (error) {
            logger.error('Redis TTL operation failed', error, { key });
            throw error;
        }
    }
    /**
     * Perform a health check
     */
    async healthCheck() {
        try {
            if (!this.client || !this.isConnected) {
                return false;
            }
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch (error) {
            logger.error('Redis health check failed', error);
            return false;
        }
    }
    /**
     * Get connection status
     */
    connected() {
        return this.isConnected && this.client !== null;
    }
    /**
     * Gracefully close the connection
     */
    async close() {
        if (!this.client) {
            return;
        }
        try {
            await this.client.disconnect();
            this.isConnected = false;
            logger.info('Redis connection closed');
        }
        catch (error) {
            logger.error('Error closing Redis connection', error);
            throw error;
        }
    }
}
// Export singleton instance
export const redis = new RedisConnection();
export default redis;
//# sourceMappingURL=connection.js.map