/**
 * IndexedDB CRUD Operations
 * Provides generic create, read, update, delete operations for all stores
 */

import { getDBManager, DatabaseError } from './database';
import { STORES } from './schema';

/**
 * Generic CRUD operations for IndexedDB
 * Supports all data types and automatic query building
 */
export class CRUDOperations {
  /**
   * Create (insert) a new record
   * @throws {DatabaseError} if insert fails
   */
  static async create<T extends Record<string, any>>(
    storeName: string,
    data: T
  ): Promise<T> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.add(data);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to create record in ${storeName}: ${request.error}`,
          'CREATE_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(data);
      };
    });
  }

  /**
   * Create multiple records in batch
   */
  static async createBatch<T extends Record<string, any>>(
    storeName: string,
    records: T[]
  ): Promise<T[]> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let completed = 0;

      const processNext = () => {
        if (completed === records.length) {
          resolve(results);
          return;
        }

        const record = records[completed];
        const request = store.add(record);

        request.onerror = () => {
          reject(new DatabaseError(
            `Failed to create batch record ${completed} in ${storeName}: ${request.error}`,
            'CREATE_BATCH_FAILED'
          ));
        };

        request.onsuccess = () => {
          results.push(record);
          completed++;
          processNext();
        };
      };

      if (records.length === 0) {
        resolve([]);
      } else {
        processNext();
      }
    });
  }

  /**
   * Read (retrieve) a record by primary key
   */
  static async read<T extends Record<string, any>>(
    storeName: string,
    key: string | number
  ): Promise<T | null> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to read record from ${storeName}: ${request.error}`,
          'READ_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * Read all records from a store
   */
  static async readAll<T extends Record<string, any>>(
    storeName: string,
    limit?: number
  ): Promise<T[]> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll(null, limit);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to read all records from ${storeName}: ${request.error}`,
          'READ_ALL_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Query records by index
   */
  static async queryByIndex<T extends Record<string, any>>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);

    return new Promise((resolve, reject) => {
      const request = index.getAll(value);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to query ${storeName} by ${indexName}: ${request.error}`,
          'QUERY_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Query records with range
   */
  static async queryByRange<T extends Record<string, any>>(
    storeName: string,
    indexName: string,
    range: IDBKeyRange
  ): Promise<T[]> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);

    return new Promise((resolve, reject) => {
      const request = index.getAll(range);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to query ${storeName} by range on ${indexName}: ${request.error}`,
          'RANGE_QUERY_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Update an existing record
   */
  static async update<T extends Record<string, any>>(
    storeName: string,
    data: T
  ): Promise<T> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.put(data);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to update record in ${storeName}: ${request.error}`,
          'UPDATE_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(data);
      };
    });
  }

  /**
   * Update multiple records in batch
   */
  static async updateBatch<T extends Record<string, any>>(
    storeName: string,
    records: T[]
  ): Promise<T[]> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let completed = 0;

      const processNext = () => {
        if (completed === records.length) {
          resolve(results);
          return;
        }

        const record = records[completed];
        const request = store.put(record);

        request.onerror = () => {
          reject(new DatabaseError(
            `Failed to update batch record ${completed} in ${storeName}: ${request.error}`,
            'UPDATE_BATCH_FAILED'
          ));
        };

        request.onsuccess = () => {
          results.push(record);
          completed++;
          processNext();
        };
      };

      if (records.length === 0) {
        resolve([]);
      } else {
        processNext();
      }
    });
  }

  /**
   * Delete a record by primary key
   */
  static async delete(
    storeName: string,
    key: string | number
  ): Promise<void> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to delete record from ${storeName}: ${request.error}`,
          'DELETE_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Delete multiple records by primary key
   */
  static async deleteBatch(
    storeName: string,
    keys: (string | number)[]
  ): Promise<void> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      let completed = 0;

      const processNext = () => {
        if (completed === keys.length) {
          resolve();
          return;
        }

        const key = keys[completed];
        const request = store.delete(key);

        request.onerror = () => {
          reject(new DatabaseError(
            `Failed to delete batch record ${completed} from ${storeName}: ${request.error}`,
            'DELETE_BATCH_FAILED'
          ));
        };

        request.onsuccess = () => {
          completed++;
          processNext();
        };
      };

      if (keys.length === 0) {
        resolve();
      } else {
        processNext();
      }
    });
  }

  /**
   * Clear all records from a store
   */
  static async clear(storeName: string): Promise<void> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to clear ${storeName}: ${request.error}`,
          'CLEAR_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Count records in a store
   */
  static async count(storeName: string): Promise<number> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.count();

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to count records in ${storeName}: ${request.error}`,
          'COUNT_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Count records by index
   */
  static async countByIndex(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<number> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);

    return new Promise((resolve, reject) => {
      const request = index.count(value);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to count records in ${storeName} by ${indexName}: ${request.error}`,
          'COUNT_BY_INDEX_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Check if a record exists
   */
  static async exists(
    storeName: string,
    key: string | number
  ): Promise<boolean> {
    const result = await this.read(storeName, key);
    return result !== null;
  }

  /**
   * Upsert (update or create) a record
   */
  static async upsert<T extends Record<string, any>>(
    storeName: string,
    data: T,
    keyProperty?: string
  ): Promise<T> {
    const db = getDBManager().getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.put(data);

      request.onerror = () => {
        reject(new DatabaseError(
          `Failed to upsert record in ${storeName}: ${request.error}`,
          'UPSERT_FAILED'
        ));
      };

      request.onsuccess = () => {
        resolve(data);
      };
    });
  }
}

/**
 * Convenience functions for common stores
 */

export const TransactionStore = {
  create: (data: any) => CRUDOperations.create(STORES.TRANSACTIONS, data),
  read: (id: string) => CRUDOperations.read(STORES.TRANSACTIONS, id),
  readAll: (limit?: number) => CRUDOperations.readAll(STORES.TRANSACTIONS, limit),
  update: (data: any) => CRUDOperations.update(STORES.TRANSACTIONS, data),
  delete: (id: string) => CRUDOperations.delete(STORES.TRANSACTIONS, id),
  queryByStore: (storeId: string) =>
    CRUDOperations.queryByIndex(STORES.TRANSACTIONS, 'storeId', storeId),
  queryByStatus: (status: string) =>
    CRUDOperations.queryByIndex(STORES.TRANSACTIONS, 'status', status),
  clear: () => CRUDOperations.clear(STORES.TRANSACTIONS),
  count: () => CRUDOperations.count(STORES.TRANSACTIONS)
};

export const ProductStore = {
  create: (data: any) => CRUDOperations.create(STORES.PRODUCTS, data),
  read: (id: string) => CRUDOperations.read(STORES.PRODUCTS, id),
  readAll: (limit?: number) => CRUDOperations.readAll(STORES.PRODUCTS, limit),
  update: (data: any) => CRUDOperations.update(STORES.PRODUCTS, data),
  delete: (id: string) => CRUDOperations.delete(STORES.PRODUCTS, id),
  queryBySku: (sku: string) =>
    CRUDOperations.queryByIndex(STORES.PRODUCTS, 'sku', sku),
  clear: () => CRUDOperations.clear(STORES.PRODUCTS),
  count: () => CRUDOperations.count(STORES.PRODUCTS)
};

export const InventoryStore = {
  create: (data: any) => CRUDOperations.create(STORES.INVENTORY, data),
  read: (id: string) => CRUDOperations.read(STORES.INVENTORY, id),
  readAll: (limit?: number) => CRUDOperations.readAll(STORES.INVENTORY, limit),
  update: (data: any) => CRUDOperations.update(STORES.INVENTORY, data),
  delete: (id: string) => CRUDOperations.delete(STORES.INVENTORY, id),
  queryByStore: (storeId: string) =>
    CRUDOperations.queryByIndex(STORES.INVENTORY, 'storeId', storeId),
  queryByProduct: (productId: string) =>
    CRUDOperations.queryByIndex(STORES.INVENTORY, 'productId', productId),
  clear: () => CRUDOperations.clear(STORES.INVENTORY),
  count: () => CRUDOperations.count(STORES.INVENTORY)
};

export const MemberStore = {
  create: (data: any) => CRUDOperations.create(STORES.MEMBERS, data),
  read: (id: string) => CRUDOperations.read(STORES.MEMBERS, id),
  readAll: (limit?: number) => CRUDOperations.readAll(STORES.MEMBERS, limit),
  update: (data: any) => CRUDOperations.update(STORES.MEMBERS, data),
  delete: (id: string) => CRUDOperations.delete(STORES.MEMBERS, id),
  queryByMemberNumber: (memberNumber: string) =>
    CRUDOperations.queryByIndex(STORES.MEMBERS, 'memberNumber', memberNumber),
  clear: () => CRUDOperations.clear(STORES.MEMBERS),
  count: () => CRUDOperations.count(STORES.MEMBERS)
};

export const PendingChangesStore = {
  create: (data: any) => CRUDOperations.create(STORES.PENDING_CHANGES, data),
  read: (id: string) => CRUDOperations.read(STORES.PENDING_CHANGES, id),
  readAll: (limit?: number) => CRUDOperations.readAll(STORES.PENDING_CHANGES, limit),
  update: (data: any) => CRUDOperations.update(STORES.PENDING_CHANGES, data),
  delete: (id: string) => CRUDOperations.delete(STORES.PENDING_CHANGES, id),
  clear: () => CRUDOperations.clear(STORES.PENDING_CHANGES),
  count: () => CRUDOperations.count(STORES.PENDING_CHANGES)
};
