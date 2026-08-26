import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { db } from './connection.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Migration runner for applying database migrations
 */
class MigrationRunner {
    migrationsDir = path.join(__dirname, 'migrations');
    /**
     * Initialize migrations tracking table
     */
    async initializeMigrationsTable() {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `;
        try {
            await db.query(createTableSql);
            logger.info('Migrations tracking table initialized');
        }
        catch (error) {
            logger.error('Failed to initialize migrations table', error);
            throw error;
        }
    }
    /**
     * Get all available migrations from file system
     */
    async getAvailableMigrations() {
        try {
            const files = fs.readdirSync(this.migrationsDir);
            const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
            return sqlFiles.map((filename) => {
                // Extract version and name from filename (e.g., "001_create_users_table.sql")
                const match = filename.match(/^(\d+)_(.+)\.sql$/);
                if (!match) {
                    throw new Error(`Invalid migration filename: ${filename}`);
                }
                const version = parseInt(match[1], 10);
                const name = match[2];
                return {
                    version,
                    name,
                    filename,
                    applied: false, // Will be updated after checking database
                };
            });
        }
        catch (error) {
            logger.error('Failed to read migrations directory', error);
            throw error;
        }
    }
    /**
     * Get applied migrations from database
     */
    async getAppliedMigrations() {
        try {
            const result = await db.query('SELECT * FROM schema_migrations ORDER BY version');
            return result.rows.map((row) => ({
                version: row.version,
                name: row.name,
                filename: `${String(row.version).padStart(3, '0')}_${row.name}.sql`,
                applied: true,
                applied_at: row.applied_at,
            }));
        }
        catch (error) {
            logger.error('Failed to get applied migrations', error);
            throw error;
        }
    }
    /**
     * Get pending migrations (not yet applied)
     */
    async getPendingMigrations() {
        try {
            const available = await this.getAvailableMigrations();
            const applied = await this.getAppliedMigrations();
            const appliedVersions = new Set(applied.map((m) => m.version));
            return available.filter((m) => !appliedVersions.has(m.version));
        }
        catch (error) {
            logger.error('Failed to get pending migrations', error);
            throw error;
        }
    }
    /**
     * Run a single migration
     */
    async runMigration(migration) {
        try {
            const filePath = path.join(this.migrationsDir, migration.filename);
            const sql = fs.readFileSync(filePath, 'utf-8');
            await db.transaction(async (client) => {
                // Execute migration SQL
                await client.query(sql);
                // Record migration as applied
                await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [migration.version, migration.name]);
            });
            logger.info(`Migration applied: ${migration.version} - ${migration.name}`);
        }
        catch (error) {
            logger.error(`Failed to apply migration: ${migration.filename}`, error);
            throw error;
        }
    }
    /**
     * Rollback a single migration (down)
     */
    async rollbackMigration(migration) {
        try {
            // For now, we only support reading SQL files in up direction
            // Full rollback support would require maintaining down migrations
            await db.transaction(async (client) => {
                // Remove migration from tracking table
                await client.query('DELETE FROM schema_migrations WHERE version = $1', [
                    migration.version,
                ]);
            });
            logger.warn(`Migration rolled back: ${migration.version} - ${migration.name} (down script not available)`);
        }
        catch (error) {
            logger.error(`Failed to rollback migration: ${migration.filename}`, error);
            throw error;
        }
    }
    /**
     * Run all pending migrations
     */
    async runPendingMigrations() {
        try {
            await this.initializeMigrationsTable();
            const pending = await this.getPendingMigrations();
            if (pending.length === 0) {
                logger.info('No pending migrations to run');
                return;
            }
            logger.info(`Found ${pending.length} pending migrations to run`);
            for (const migration of pending) {
                await this.runMigration(migration);
            }
            logger.info(`All ${pending.length} pending migrations completed successfully`);
        }
        catch (error) {
            logger.error('Failed to run pending migrations', error);
            throw error;
        }
    }
    /**
     * Get migration status
     */
    async getMigrationStatus() {
        try {
            const available = await this.getAvailableMigrations();
            const applied = await this.getAppliedMigrations();
            // Mark applied migrations
            const appliedVersions = new Set(applied.map((m) => m.version));
            available.forEach((m) => {
                if (appliedVersions.has(m.version)) {
                    const appliedMig = applied.find((a) => a.version === m.version);
                    m.applied = true;
                    m.applied_at = appliedMig?.applied_at;
                }
            });
            return { available, applied };
        }
        catch (error) {
            logger.error('Failed to get migration status', error);
            throw error;
        }
    }
}
// Export singleton instance
export const migrationRunner = new MigrationRunner();
export default migrationRunner;
//# sourceMappingURL=migrationRunner.js.map