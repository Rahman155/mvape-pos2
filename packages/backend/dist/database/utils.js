import { db } from './connection.js';
import { logger } from '../utils/logger.js';
/**
 * Database query utilities for common operations
 */
/**
 * Build a WHERE clause from filters
 */
export function buildWhereClause(filters, paramStart = 1) {
    const conditions = [];
    const values = [];
    let paramIndex = paramStart;
    for (const [key, value] of Object.entries(filters)) {
        if (value === null || value === undefined) {
            conditions.push(`${key} IS NULL`);
        }
        else if (Array.isArray(value)) {
            const placeholders = value.map(() => `$${paramIndex++}`).join(',');
            conditions.push(`${key} IN (${placeholders})`);
            values.push(...value);
        }
        else {
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
export function buildOrderByClause(orderBy, orderDirection) {
    if (!orderBy) {
        return '';
    }
    const direction = orderDirection === 'DESC' ? 'DESC' : 'ASC';
    return `ORDER BY ${orderBy} ${direction}`;
}
/**
 * Build LIMIT and OFFSET clause
 */
export function buildPaginationClause(limit, offset) {
    const values = [];
    let paramIndex = 1;
    const clauses = [];
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
export async function executePagedQuery(countQuery, dataQuery, countValues, dataValues, options) {
    try {
        const limit = options.limit || 10;
        const offset = options.offset || 0;
        const page = Math.floor(offset / limit) + 1;
        // Execute count query
        const countResult = await db.query(countQuery, countValues);
        const total = parseInt(countResult.rows[0].count, 10);
        // Execute data query
        const dataResult = await db.query(dataQuery, dataValues);
        return {
            data: dataResult.rows,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }
    catch (error) {
        logger.error('Paginated query failed', error);
        throw error;
    }
}
/**
 * Insert a record and return it
 */
export async function insertRecord(table, data) {
    try {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
        const query = `
      INSERT INTO ${table} (${keys.join(',')})
      VALUES (${placeholders})
      RETURNING *
    `;
        const result = await db.query(query, values);
        return result.rows[0];
    }
    catch (error) {
        logger.error(`Failed to insert into ${table}`, error);
        throw error;
    }
}
/**
 * Update a record and return it
 */
export async function updateRecord(table, id, data, idColumn = 'id') {
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
        const result = await db.query(query, values);
        if (result.rowCount === 0) {
            throw new Error(`Record not found: ${table} with ${idColumn} = ${id}`);
        }
        return result.rows[0];
    }
    catch (error) {
        logger.error(`Failed to update ${table}`, error);
        throw error;
    }
}
/**
 * Delete a record
 */
export async function deleteRecord(table, id, idColumn = 'id') {
    try {
        const query = `DELETE FROM ${table} WHERE ${idColumn} = $1`;
        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }
    catch (error) {
        logger.error(`Failed to delete from ${table}`, error);
        throw error;
    }
}
/**
 * Get a record by ID
 */
export async function getRecordById(table, id, idColumn = 'id') {
    try {
        const query = `SELECT * FROM ${table} WHERE ${idColumn} = $1`;
        const result = await db.query(query, [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }
    catch (error) {
        logger.error(`Failed to get record from ${table}`, error);
        throw error;
    }
}
/**
 * Check if a record exists
 */
export async function recordExists(table, filters) {
    try {
        const { clause, values } = buildWhereClause(filters);
        const query = `SELECT 1 FROM ${table} ${clause} LIMIT 1`;
        const result = await db.query(query, values);
        return result.rowCount !== null && result.rowCount > 0;
    }
    catch (error) {
        logger.error(`Failed to check record existence in ${table}`, error);
        throw error;
    }
}
/**
 * Execute bulk insert (batch)
 */
export async function bulkInsert(table, records) {
    if (records.length === 0) {
        return [];
    }
    try {
        const keys = Object.keys(records[0]);
        const values = [];
        const placeholderGroups = [];
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
        const result = await db.query(query, values);
        return result.rows;
    }
    catch (error) {
        logger.error(`Failed to bulk insert into ${table}`, error);
        throw error;
    }
}
/**
 * Execute a transaction with multiple operations
 */
export async function executeTransaction(callback) {
    return db.transaction(callback);
}
/**
 * Build a simple SELECT query
 */
export function buildSelectQuery(table, filters, options) {
    let query = `SELECT * FROM ${table}`;
    let values = [];
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
//# sourceMappingURL=utils.js.map