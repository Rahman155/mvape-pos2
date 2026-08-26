/**
 * IndexedDB Database Manager
 * Handles database initialization, versioning, and lifecycle management
 */

import { DB_CONFIG, STORES, INDICES, STORE_CONFIGS } from './schema';

/**
 * Error thrown during database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * IndexedDB Database Manager
 * Responsible for:
 * - Database initialization and versioning
 * - Object store creation and index management
 * - Connection lifecycle management
 * - Schema validation
 */
export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize database connection
   * Creates all object stores and indices if needed
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to open database: ${request.error}`,
          'DB_OPEN_FAILED'
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          this.createStores(db);
        } catch (error) {
          reject(new DatabaseError(
            `Failed to upgrade database: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'DB_UPGRADE_FAILED'
          ));
        }
      };
    });
  }

  /**
   * Create all object stores and indices
   * Only called during database version upgrade
   */
  private createStores(db: IDBDatabase): void {
    // Store names from STORES constant
    const storeNames = Object.values(STORES);

    // Create each store
    for (const storeName of storeNames) {
      // Skip if store already exists
      if (db.objectStoreNames.contains(storeName)) {
        continue;
      }

      const config = STORE_CONFIGS[storeName];
      if (!config) {
        throw new DatabaseError(
          `No configuration found for store: ${storeName}`,
          'STORE_CONFIG_NOT_FOUND'
        );
      }

      // Create the object store
      const store = db.createObjectStore(
        storeName,
        {
          keyPath: config.keyPath,
          autoIncrement: config.autoIncrement || false
        }
      );

      // Create indices for this store
      const storeIndices = INDICES[storeName];
      if (storeIndices) {
        for (const index of storeIndices) {
          store.createIndex(
            index.name,
            index.keyPath,
            {
              unique: index.unique || false,
              multiEntry: index.multiEntry || false
            }
          );
        }
      }
    }
  }

  /**
   * Validate that all expected stores exist
   */
  async validateSchema(): Promise<boolean> {
    if (!this.db) {
      throw new DatabaseError(
        'Database not initialized',
        'DB_NOT_INITIALIZED'
      );
    }

    const storeNames = Object.values(STORES);
    
    for (const storeName of storeNames) {
      if (!this.db.objectStoreNames.contains(storeName)) {
        throw new DatabaseError(
          `Missing required store: ${storeName}`,
          'STORE_NOT_FOUND'
        );
      }
    }

    return true;
  }

  /**
   * Get the database instance
   */
  getDatabase(): IDBDatabase {
    if (!this.db) {
      throw new DatabaseError(
        'Database not initialized. Call init() first.',
        'DB_NOT_INITIALIZED'
      );
    }
    return this.db;
  }

  /**
   * Check if database is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Delete entire database
   * WARNING: This is destructive and cannot be undone
   */
  async deleteDatabase(): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_CONFIG.name);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to delete database: ${request.error}`,
          'DB_DELETE_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Clear all data from all stores
   * Used for testing and sign-out
   */
  async clearAllStores(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError(
        'Database not initialized',
        'DB_NOT_INITIALIZED'
      );
    }

    const storeNames = Object.values(STORES);
    const tx = this.db.transaction(storeNames, 'readwrite');

    const promises = storeNames.map(
      (storeName) =>
        new Promise<void>((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = store.clear();

          request.onerror = () => {
            reject(new DatabaseError(
              `Failed to clear store ${storeName}: ${request.error}`,
              'STORE_CLEAR_FAILED'
            ));
          };

          request.onsuccess = () => {
            resolve();
          };
        })
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    storeNames: string[];
    stores: Record<string, number>;
    totalRecords: number;
  }> {
    if (!this.db) {
      throw new DatabaseError(
        'Database not initialized',
        'DB_NOT_INITIALIZED'
      );
    }

    const storeNames = Array.from(this.db.objectStoreNames);
    const stores: Record<string, number> = {};
    let totalRecords = 0;

    const tx = this.db.transaction(storeNames, 'readonly');

    const promises = storeNames.map(
      (storeName) =>
        new Promise<number>((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = store.count();

          request.onerror = () => {
            reject(new DatabaseError(
              `Failed to count records in ${storeName}: ${request.error}`,
              'STORE_COUNT_FAILED'
            ));
          };

          request.onsuccess = () => {
            const count = request.result;
            stores[storeName] = count;
            totalRecords += count;
            resolve(count);
          };
        })
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      throw error;
    }

    return {
      storeNames,
      stores,
      totalRecords
    };
  }
}

/**
 * Global database manager instance
 */
let dbManager: IndexedDBManager | null = null;

/**
 * Get or create the global database manager instance
 */
export function getDBManager(): IndexedDBManager {
  if (!dbManager) {
    dbManager = new IndexedDBManager();
  }
  return dbManager;
}

/**
 * Initialize global database manager
 */
export async function initDatabase(): Promise<IDBDatabase> {
  const manager = getDBManager();
  return manager.init();
}

/**
 * Check if database is ready
 */
export function isDatabaseReady(): boolean {
  const manager = getDBManager();
  return manager.isReady();
}
