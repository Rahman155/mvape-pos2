import { PoolClient, QueryResult } from 'pg';
/**
 * Database connection pool singleton
 * Manages PostgreSQL connections with configurable pool size
 */
declare class DatabasePool {
    private pool;
    private isConnected;
    /**
     * Initialize database connection pool
     */
    initialize(): Promise<void>;
    /**
     * Get a client from the pool
     */
    getClient(): Promise<PoolClient>;
    /**
     * Execute a query
     */
    query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>>;
    /**
     * Execute multiple queries in a transaction
     */
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    /**
     * Perform a health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get pool stats for monitoring
     */
    getPoolStats(): {
        totalConnections: number;
        idleConnections: number;
        waitingRequests: number;
        isConnected: boolean;
    } | null;
    /**
     * Gracefully close the connection pool
     */
    close(): Promise<void>;
    /**
     * Check if pool is connected
     */
    connected(): boolean;
}
export declare const db: DatabasePool;
export default db;
//# sourceMappingURL=connection.d.ts.map