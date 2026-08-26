/**
 * Sync Service Tests
 * Tests for batch synchronization of offline changes
 */
import { db } from '../../database/connection.js';
import { processBatchSync } from '../../services/sync.js';
import { v4 as uuidv4 } from 'uuid';
describe('Sync Service - Batch Processing', () => {
    let testStoreId;
    let testKasirId;
    let testProductId;
    let testMemberId;
    beforeAll(async () => {
        // Initialize database connection
        await db.initialize();
        // Create test data
        testStoreId = uuidv4();
        testKasirId = uuidv4();
        testProductId = uuidv4();
        testMemberId = uuidv4();
        // Insert test store
        await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3)', [
            testStoreId,
            'Test Store',
            'Test Address',
        ]);
        // Insert test user (kasir)
        await db.query('INSERT INTO users (id, username, password_hash, role, store_id) VALUES ($1, $2, $3, $4, $5)', [testKasirId, 'testkasir', 'hash', 'KASIR', testStoreId]);
        // Insert test product
        await db.query('INSERT INTO products (id, name, sku, cost_price, selling_price) VALUES ($1, $2, $3, $4, $5)', [testProductId, 'Test Product', 'SKU-001', 10000, 15000]);
        // Insert inventory
        await db.query('INSERT INTO inventory (id, product_id, store_id, quantity) VALUES ($1, $2, $3, $4)', [uuidv4(), testProductId, testStoreId, 100]);
        // Insert test member
        await db.query('INSERT INTO members (id, member_number, name, phone, credit_balance) VALUES ($1, $2, $3, $4, $5)', [testMemberId, 'MBR-001', 'Test Member', '08123456789', 100000]);
    });
    afterAll(async () => {
        // Cleanup
        await db.close();
    });
    beforeEach(async () => {
        // Clean up transactions before each test
        await db.query('DELETE FROM transaction_items');
        await db.query('DELETE FROM piutang');
        await db.query('DELETE FROM transactions');
    });
    describe('Empty and Invalid Batches', () => {
        it('should handle empty items array', async () => {
            const response = await processBatchSync([]);
            expect(response.success).toBe(true);
            expect(response.results).toHaveLength(0);
            expect(response.timestamp).toBeDefined();
            expect(response.version).toBe('1.0.0');
        });
        it('should handle null items gracefully', async () => {
            const response = await processBatchSync(null);
            expect(response.success).toBe(true);
            expect(response.results).toHaveLength(0);
        });
    });
    describe('Transaction Sync', () => {
        it('should create a transaction with CASH payment', async () => {
            const items = [
                {
                    id: 'sync-1',
                    entityType: 'transaction',
                    changeType: 'CREATE',
                    data: {
                        storeId: testStoreId,
                        kasirId: testKasirId,
                        items: [
                            {
                                productId: testProductId,
                                quantity: 5,
                                unitPrice: 15000,
                                totalPrice: 75000,
                            },
                        ],
                        paymentMethod: 'CASH',
                        paymentData: {
                            cash: {
                                amountReceived: 100000,
                                change: 25000,
                            },
                        },
                        notes: 'Test transaction',
                    },
                    clientTimestamp: Date.now(),
                },
            ];
            const response = await processBatchSync(items);
            expect(response.success).toBe(true);
            expect(response.results).toHaveLength(1);
            const result = response.results[0];
            expect(result.id).toBe('sync-1');
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.totalAmount).toBe(75000);
            expect(result.data.paymentMethod).toBe('CASH');
            expect(result.serverTimestamp).toBeDefined();
        });
        it('should create transaction and deduct inventory', async () => {
            // Get initial inventory
            const initialInventory = await db.query('SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2', [testProductId, testStoreId]);
            const initialQty = initialInventory.rows[0].quantity;
            const items = [
                {
                    id: 'sync-2',
                    entityType: 'transaction',
                    changeType: 'CREATE',
                    data: {
                        storeId: testStoreId,
                        kasirId: testKasirId,
                        items: [
                            {
                                productId: testProductId,
                                quantity: 3,
                                unitPrice: 15000,
                                totalPrice: 45000,
                            },
                        ],
                        paymentMethod: 'CASH',
                        paymentData: {
                            cash: {
                                amountReceived: 50000,
                                change: 5000,
                            },
                        },
                    },
                    clientTimestamp: Date.now(),
                },
            ];
            await processBatchSync(items);
            // Check inventory was deducted
            const finalInventory = await db.query('SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2', [testProductId, testStoreId]);
            const finalQty = finalInventory.rows[0].quantity;
            expect(finalQty).toBe(initialQty - 3);
        });
        it('should reject transaction with missing required fields', async () => {
            const items = [
                {
                    id: 'sync-6',
                    entityType: 'transaction',
                    changeType: 'CREATE',
                    data: {
                        storeId: testStoreId,
                        // Missing kasirId
                        items: [
                            {
                                productId: testProductId,
                                quantity: 1,
                                unitPrice: 15000,
                                totalPrice: 15000,
                            },
                        ],
                        paymentMethod: 'CASH',
                    },
                    clientTimestamp: Date.now(),
                },
            ];
            const response = await processBatchSync(items);
            const result = response.results[0];
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
    describe('Member Sync', () => {
        it('should create a new member', async () => {
            const items = [
                {
                    id: 'sync-10',
                    entityType: 'member',
                    changeType: 'CREATE',
                    data: {
                        name: 'New Member',
                        phone: '08111111111',
                        email: 'member@test.com',
                    },
                    clientTimestamp: Date.now(),
                },
            ];
            const response = await processBatchSync(items);
            const result = response.results[0];
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.name).toBe('New Member');
            expect(result.data.memberNumber).toBeDefined();
            expect(result.data.creditBalance).toBe(0);
        });
        it('should reject member creation with missing fields', async () => {
            const items = [
                {
                    id: 'sync-11',
                    entityType: 'member',
                    changeType: 'CREATE',
                    data: {
                        name: 'New Member',
                        // Missing phone
                    },
                    clientTimestamp: Date.now(),
                },
            ];
            const response = await processBatchSync(items);
            const result = response.results[0];
            expect(result.success).toBe(false);
            expect(result.error).toContain('required');
        });
    });
    describe('Batch Processing', () => {
        it('should process multiple items in a batch', async () => {
            const items = [
                {
                    id: 'batch-1',
                    entityType: 'transaction',
                    changeType: 'CREATE',
                    data: {
                        storeId: testStoreId,
                        kasirId: testKasirId,
                        items: [
                            {
                                productId: testProductId,
                                quantity: 1,
                                unitPrice: 15000,
                                totalPrice: 15000,
                            },
                        ],
                        paymentMethod: 'CASH',
                        paymentData: {
                            cash: {
                                amountReceived: 20000,
                                change: 5000,
                            },
                        },
                    },
                    clientTimestamp: Date.now(),
                },
                {
                    id: 'batch-2',
                    entityType: 'member',
                    changeType: 'CREATE',
                    data: {
                        name: 'Batch Member',
                        phone: '08222222222',
                    },
                    clientTimestamp: Date.now(),
                },
            ];
            const response = await processBatchSync(items);
            expect(response.success).toBe(true);
            expect(response.results).toHaveLength(2);
            expect(response.results[0].success).toBe(true);
            expect(response.results[1].success).toBe(true);
        });
        it('should handle partial batch failure', async () => {
            const items = [
                {
                    id: 'partial-1',
                    entityType: 'transaction',
                    changeType: 'CREATE',
                    data: {
                        storeId: testStoreId,
                        kasirId: testKasirId,
                        items: [
                            {
                                productId: testProductId,
                                quantity: 1,
                                unitPrice: 15000,
                                totalPrice: 15000,
                            },
                        ],
                        paymentMethod: 'CASH',
                        paymentData: {
                            cash: {
                                amountReceived: 20000,
                                change: 5000,
                            },
                        },
                    },
                    clientTimestamp: Date.now(),
                },
                {
                    id: 'partial-2',
                    entityType: 'member',
                    changeType: 'CREATE',
                    data: {
                        name: 'Member',
                        // Missing phone - this will fail
                    },
                    clientTimestamp: Date.now(),
                },
            ];
            const response = await processBatchSync(items);
            expect(response.success).toBe(true); // Batch itself is successful
            expect(response.results).toHaveLength(2);
            expect(response.results[0].success).toBe(true); // First item succeeds
            expect(response.results[1].success).toBe(false); // Second item fails
        });
    });
    describe('Error Handling', () => {
        it('should handle invalid entity types', async () => {
            const items = [
                {
                    id: 'error-1',
                    entityType: 'unsupported_type',
                    changeType: 'CREATE',
                    data: { name: 'Test' },
                    clientTimestamp: Date.now(),
                },
            ];
            const response = await processBatchSync(items);
            const result = response.results[0];
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported');
        });
        it('should handle invalid changeType', async () => {
            const items = [
                {
                    id: 'error-2',
                    entityType: 'transaction',
                    changeType: 'INVALID',
                    data: {},
                    clientTimestamp: Date.now(),
                },
            ];
            const response = await processBatchSync(items);
            const result = response.results[0];
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});
//# sourceMappingURL=sync.test.js.map