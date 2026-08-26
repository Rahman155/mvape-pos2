import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
/**
 * Database connection pool singleton
 * Manages PostgreSQL connections with configurable pool size
 */
class DatabasePool {
    pool = null;
    isConnected = false;
    /**
     * Initialize database connection pool
     */
    async initialize() {
        if (this.isConnected) {
            logger.warn('Database pool already initialized');
            return;
        }
        try {
            this.pool = new Pool({
                connectionString: config.database.url,
                min: config.database.poolMin,
                max: config.database.poolMax,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
                // Enable TCP keep-alive to detect stale connections
                keepAlives: true,
                keepAliveInitialDelayMillis: 10000,
            });
            // Handle pool errors
            this.pool.on('error', (error) => {
                logger.error('Unexpected error on idle client', error);
            });
            // Test the connection
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();
            logger.info('Database connection pool initialized', {
                min: config.database.poolMin,
                max: config.database.poolMax,
                timestamp: result.rows[0].now,
            });
            this.isConnected = true;
        }
        catch (error) {
            logger.error('Failed to initialize database connection pool', error);
            throw error;
        }
    }
    /**
     * Get a client from the pool
     */
    async getClient() {
        if (!this.pool) {
            throw new Error('Database pool not initialized');
        }
        return this.pool.connect();
    }
    /**
     * Execute a query
     */
    async query(text, values) {
        if (!this.pool) {
            throw new Error('Database pool not initialized');
        }
        try {
            const result = await this.pool.query(text, values);
            return result;
        }
        catch (error) {
            logger.error('Database query failed', error, {
                query: text,
                values,
            });
            throw error;
        }
    }
    /**
     * Execute multiple queries in a transaction
     */
    async transaction(callback) {
        if (!this.pool) {
            throw new Error('Database pool not initialized');
        }
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger.error('Transaction failed and rolled back', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Perform a health check
     */
    async healthCheck() {
        try {
            if (!this.pool) {
                return false;
            }
            const result = await this.pool.query('SELECT 1');
            return result.rowCount !== null && result.rowCount > 0;
        }
        catch (error) {
            logger.error('Database health check failed', error);
            return false;
        }
    }
    /**
     * Get pool stats for monitoring
     */
    getPoolStats() {
        if (!this.pool) {
            return null;
        }
        return {
            totalConnections: this.pool.totalCount,
            idleConnections: this.pool.idleCount,
            waitingRequests: this.pool.waitingCount,
            isConnected: this.isConnected,
        };
    }
    /**
     * Gracefully close the connection pool
     */
    async close() {
        if (!this.pool) {
            return;
        }
        try {
            await this.pool.end();
            this.isConnected = false;
            logger.info('Database connection pool closed');
        }
        catch (error) {
            logger.error('Error closing database connection pool', error);
            throw error;
        }
    }
    /**
     * Check if pool is connected
     */
    connected() {
        return this.isConnected;
    }
}
// Export singleton instance
export const db = new DatabasePool();
export default db;
//# sourceMappingURL=connection.js.map