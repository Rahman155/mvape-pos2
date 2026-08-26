import { PoolClient } from 'pg';
import { QueryOptions, PaginatedResult } from './types.js';
/**
 * Database query utilities for common operations
 */
/**
 * Build a WHERE clause from filters
 */
export declare function buildWhereClause(filters: Record<string, any>, paramStart?: number): {
    clause: string;
    values: any[];
    nextParam: number;
};
/**
 * Build ORDER BY clause
 */
export declare function buildOrderByClause(orderBy?: string, orderDirection?: 'ASC' | 'DESC'): string;
/**
 * Build LIMIT and OFFSET clause
 */
export declare function buildPaginationClause(limit?: number, offset?: number): {
    clause: string;
    values: any[];
    nextParam: number;
};
/**
 * Execute a paginated query
 */
export declare function executePagedQuery<T>(countQuery: string, dataQuery: string, countValues: any[], dataValues: any[], options: QueryOptions & {
    limit?: number;
    offset?: number;
}): Promise<PaginatedResult<T>>;
/**
 * Insert a record and return it
 */
export declare function insertRecord<T>(table: string, data: Record<string, any>): Promise<T>;
/**
 * Update a record and return it
 */
export declare function updateRecord<T>(table: string, id: string, data: Record<string, any>, idColumn?: string): Promise<T>;
/**
 * Delete a record
 */
export declare function deleteRecord(table: string, id: string, idColumn?: string): Promise<boolean>;
/**
 * Get a record by ID
 */
export declare function getRecordById<T>(table: string, id: string, idColumn?: string): Promise<T | null>;
/**
 * Check if a record exists
 */
export declare function recordExists(table: string, filters: Record<string, any>): Promise<boolean>;
/**
 * Execute bulk insert (batch)
 */
export declare function bulkInsert<T>(table: string, records: Record<string, any>[]): Promise<T[]>;
/**
 * Execute a transaction with multiple operations
 */
export declare function executeTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
/**
 * Build a simple SELECT query
 */
export declare function buildSelectQuery(table: string, filters?: Record<string, any>, options?: QueryOptions): {
    query: string;
    values: any[];
};
//# sourceMappingURL=utils.d.ts.map