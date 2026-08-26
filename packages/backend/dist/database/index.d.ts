/**
 * Database module - exports all database-related functionality
 */
export { db } from './connection.js';
export type { PoolClient, QueryResult } from 'pg';
export { migrationRunner } from './migrationRunner.js';
export * from './types.js';
export * as dbUtils from './utils.js';
//# sourceMappingURL=index.d.ts.map