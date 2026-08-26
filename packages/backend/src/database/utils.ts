import { PoolClient, QueryResult } from 'pg';
import { db } from './connection.js';
import { logger } from '../utils/logger.js';
import { QueryOptions, PaginatedResult } from './types.js';

/**
 * Database query utilities for common operations
 */

/**
 * Build a WHERE clause from filters
 */
export function buildWhereClause(
  filters: Record<string, any>,
  paramStart = 1
): { clause: string; values: any[]; nextParam: number } {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = paramStart;

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      conditions.push(`${key} IS NULL`);
    } else if (Array.isArray(value)) {
      const placeholders = value.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`${key} IN (${placeholders})`);
      values.push(...value);
    } else {
      conditions.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  return {
    clause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    values,
    nextParam: paramIndex,
  };
}

/**
 * Build ORDER BY clause
 */
export function buildOrderByClause(
  orderBy?: string,
  orderDirection?: 'ASC' | 'DESC'
): string {
  if (!orderBy) {
    return '';
  }

  const direction = orderDirection === 'DESC' ? 'DESC' : 'ASC';
  return `ORDER BY ${orderBy} ${direction}`;
}

/**
 * Build LIMIT and OFFSET clause
 */
export function buildPaginationClause(
  limit?: number,
  offset?: number
): { clause: string; values: any[]; nextParam: number } {
  const values: any[] = [];
  let paramIndex = 1;
  const clauses: string[] = [];

  if (limit && limit > 0) {
    clauses.push(`LIMIT $${paramIndex++}`);
    values.push(limit);
  }

  if (offset && offset > 0) {
    clauses.push(`OFFSET $${paramIndex++}`);
    values.push(offset);
  }

  return {
    clause: clauses.join(' '),
    values,
    nextParam: paramIndex,
  };
}

/**
 * Execute a paginated query
 */
export async function executePagedQuery<T>(
  countQuery: string,
  dataQuery: string,
  countValues: any[],
  dataValues: any[],
  options: QueryOptions & { limit?: number; offset?: number }
): Promise<PaginatedResult<T>> {
  try {
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    // Execute count query
    const countResult = await db.query<{ count: string }>(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count, 10);

    // Execute data query
    const dataResult = await db.query<T>(dataQuery, dataValues);

    return {
      data: dataResult.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Paginated query failed', error as Error);
    throw error;
  }
}

/**
 * Insert a record and return it
 */
export async function insertRecord<T>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');

    const query = `
      INSERT INTO ${table} (${keys.join(',')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await db.query<T>(query, values);
    return result.rows[0];
  } catch (error) {
    logger.error(`Failed to insert into ${table}`, error as Error);
    throw error;
  }
}

/**
 * Update a record and return it
 */
export async function updateRecord<T>(
  table: string,
  id: string,
  data: Record<string, any>,
  idColumn = 'id'
): Promise<T> {
  try {
    const keys = Object.keys(data);
    const updates = keys.map((key, i) => `${key} = $${i + 1}`).join(',');
    const values = [...Object.values(data), id];

    const query = `
      UPDATE ${table}
      SET ${updates}, updated_at = NOW()
      WHERE ${idColumn} = $${keys.length + 1}
      RETURNING *
    `;

    const result = await db.query<T>(query, values);

    if (result.rowCount === 0) {
      throw new Error(`Record not found: ${table} with ${idColumn} = ${id}`);
    }

    return result.rows[0];
  } catch (error) {
    logger.error(`Failed to update ${table}`, error as Error);
    throw error;
  }
}

/**
 * Delete a record
 */
export async function deleteRecord(
  table: string,
  id: string,
  idColumn = 'id'
): Promise<boolean> {
  try {
    const query = `DELETE FROM ${table} WHERE ${idColumn} = $1`;
    const result = await db.query(query, [id]);

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error(`Failed to delete from ${table}`, error as Error);
    throw error;
  }
}

/**
 * Get a record by ID
 */
export async function getRecordById<T>(
  table: string,
  id: string,
  idColumn = 'id'
): Promise<T | null> {
  try {
    const query = `SELECT * FROM ${table} WHERE ${idColumn} = $1`;
    const result = await db.query<T>(query, [id]);

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error(`Failed to get record from ${table}`, error as Error);
    throw error;
  }
}

/**
 * Check if a record exists
 */
export async function recordExists(
  table: string,
  filters: Record<string, any>
): Promise<boolean> {
  try {
    const { clause, values } = buildWhereClause(filters);
    const query = `SELECT 1 FROM ${table} ${clause} LIMIT 1`;

    const result = await db.query(query, values);
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    logger.error(`Failed to check record existence in ${table}`, error as Error);
    throw error;
  }
}

/**
 * Execute bulk insert (batch)
 */
export async function bulkInsert<T>(
  table: string,
  records: Record<string, any>[]
): Promise<T[]> {
  if (records.length === 0) {
    return [];
  }

  try {
    const keys = Object.keys(records[0]);
    const values: any[] = [];
    const placeholderGroups: string[] = [];

    records.forEach((record, recordIdx) => {
      const placeholders = keys
        .map((_, keyIdx) => `$${recordIdx * keys.length + keyIdx + 1}`)
        .join(',');
      placeholderGroups.push(`(${placeholders})`);

      keys.forEach((key) => {
        values.push(record[key] ?? null);
      });
    });

    const query = `
      INSERT INTO ${table} (${keys.join(',')})
      VALUES ${placeholderGroups.join(',')}
      RETURNING *
    `;

    const result = await db.query<T>(query, values);
    return result.rows;
  } catch (error) {
    logger.error(`Failed to bulk insert into ${table}`, error as Error);
    throw error;
  }
}

/**
 * Execute a transaction with multiple operations
 */
export async function executeTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}

/**
 * Build a simple SELECT query
 */
export function buildSelectQuery(
  table: string,
  filters?: Record<string, any>,
  options?: QueryOptions
): { query: string; values: any[] } {
  let query = `SELECT * FROM ${table}`;
  let values: any[] = [];
  let paramIndex = 1;

  if (filters && Object.keys(filters).length > 0) {
    const { clause, values: filterValues, nextParam } = buildWhereClause(filters, paramIndex);
    query += ` ${clause}`;
    values.push(...filterValues);
    paramIndex = nextParam;
  }

  if (options?.orderBy) {
    query += ` ${buildOrderByClause(options.orderBy, options.orderDirection)}`;
  }

  if (options?.limit) {
    query += ` LIMIT $${paramIndex++}`;
    values.push(options.limit);
  }

  if (options?.offset) {
    query += ` OFFSET $${paramIndex}`;
    values.push(options.offset);
  }

  return { query, values };
}
