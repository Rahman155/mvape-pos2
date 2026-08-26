import { RedisClient } from 'redis';
/**
 * Redis connection and client management
 * Handles connection pooling, reconnection logic, and health checks
 */
declare class RedisConnection {
    private client;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    /**
     * Initialize Redis connection
     */
    initialize(): Promise<void>;
    /**
     * Get the Redis client instance
     */
    getClient(): RedisClient;
    /**
     * Set a key-value pair
     */
    set(key: string, value: string, expiresIn?: number): Promise<void>;
    /**
     * Get a value by key
     */
    get(key: string): Promise<string | null>;
    /**
     * Delete a key
     */
    delete(key: string): Promise<number>;
    /**
     * Delete multiple keys
     */
    deleteMany(keys: string[]): Promise<number>;
    /**
     * Check if a key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get all keys matching a pattern
     */
    keys(pattern: string): Promise<string[]>;
    /**
     * Set hash field
     */
    hSet(key: string, field: string, value: string): Promise<number>;
    /**
     * Get hash field
     */
    hGet(key: string, field: string): Promise<string | null>;
    /**
     * Delete hash field
     */
    hDel(key: string, field: string): Promise<number>;
    /**
     * Get all hash fields and values
     */
    hGetAll(key: string): Promise<Record<string, string>>;
    /**
     * Increment a counter
     */
    incr(key: string): Promise<number>;
    /**
     * Decrement a counter
     */
    decr(key: string): Promise<number>;
    /**
     * Get remaining TTL in seconds (-1 if no expiry, -2 if doesn't exist)
     */
    ttl(key: string): Promise<number>;
    /**
     * Perform a health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get connection status
     */
    connected(): boolean;
    /**
     * Gracefully close the connection
     */
    close(): Promise<void>;
}
export declare const redis: RedisConnection;
export default redis;
//# sourceMappingURL=connection.d.ts.map