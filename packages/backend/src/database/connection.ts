import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Database connection pool singleton
 * Manages PostgreSQL connections with configurable pool size
 */
class DatabasePool {
  private pool: Pool | null = null;
  private isConnected = false;

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
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
    } catch (error) {
      logger.error('Failed to initialize database connection pool', error as Error);
      throw error;
    }
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    return this.pool.connect();
  }

  /**
   * Execute a query
   */
  async query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      const result = await this.pool.query<T>(text, values);
      return result;
    } catch (error) {
      logger.error('Database query failed', error as Error, {
        query: text,
        values,
      });
      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed and rolled back', error as Error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform a health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) {
        return false;
      }

      const result = await this.pool.query('SELECT 1');
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error('Database health check failed', error as Error);
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
  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database connection pool', error as Error);
      throw error;
    }
  }

  /**
   * Check if pool is connected
   */
  connected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const db = new DatabasePool();

export default db;
