/**
 * Migration file interface
 */
interface Migration {
    version: number;
    name: string;
    filename: string;
    applied: boolean;
    applied_at?: Date;
}
/**
 * Migration runner for applying database migrations
 */
declare class MigrationRunner {
    private migrationsDir;
    /**
     * Initialize migrations tracking table
     */
    initializeMigrationsTable(): Promise<void>;
    /**
     * Get all available migrations from file system
     */
    getAvailableMigrations(): Promise<Migration[]>;
    /**
     * Get applied migrations from database
     */
    getAppliedMigrations(): Promise<Migration[]>;
    /**
     * Get pending migrations (not yet applied)
     */
    getPendingMigrations(): Promise<Migration[]>;
    /**
     * Run a single migration
     */
    runMigration(migration: Migration): Promise<void>;
    /**
     * Rollback a single migration (down)
     */
    rollbackMigration(migration: Migration): Promise<void>;
    /**
     * Run all pending migrations
     */
    runPendingMigrations(): Promise<void>;
    /**
     * Get migration status
     */
    getMigrationStatus(): Promise<{
        available: Migration[];
        applied: Migration[];
    }>;
}
export declare const migrationRunner: MigrationRunner;
export default migrationRunner;
//# sourceMappingURL=migrationRunner.d.ts.map