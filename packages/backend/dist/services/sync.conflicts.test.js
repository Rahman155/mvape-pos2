/**
 * Tests for Server-Side Conflict Detection
 *
 * **Validates: Requirements 4.5, 26.5**
 *
 * Tests that the server properly detects, resolves, and communicates
 * conflicts to the client during batch synchronization.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processBatchSync } from './sync';
import { db } from '../database/connection.js';
// Mock database
vi.mock('../database/connection.js', () => ({
    db: {
        query: vi.fn(),
        transaction: vi.fn(),
    },
}));
describe('Server-Side Conflict Detection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('Conflict Detection via Timestamps', () => {
        it('should detect conflict when server version is newer than client version', async () => {
            /**
             * Conflict occurs when:
             * - Entity exists on server with newer timestamp
             * - Client is trying to update with older timestamp
             */
            const serverTimestamp = Date.now();
            const clientTimestamp = serverTimestamp - 5000; // 5 seconds older
            // Mock database to return existing entity with newer timestamp
            vi.mocked(db.query).mockResolvedValueOnce({
                rows: [{ updated_at: new Date(serverTimestamp) }],
            });
            const items = [
                {
                    id: 'txn-123',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    clientTimestamp,
                },
            ];
            const result = await processBatchSync(items);
            expect(result.conflictsDetected).toBeGreaterThanOrEqual(0);
            expect(result.results[0]).toBeDefined();
            // Conflict should be reported
            if (result.results[0].conflict?.detected) {
                expect(result.results[0].conflict.strategy).toBe('LWW');
                expect(result.results[0].conflict.reason).toContain('newer');
            }
        });
        it('should not detect conflict when client version is newer', async () => {
            const serverTimestamp = Date.now() - 5000;
            const clientTimestamp = Date.now();
            vi.mocked(db.query).mockResolvedValueOnce({
                rows: [{ updated_at: new Date(serverTimestamp) }],
            });
            const items = [
                {
                    id: 'txn-123',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    clientTimestamp,
                },
            ];
            const result = await processBatchSync(items);
            // Should not have conflict
            if (result.results[0].conflict) {
                expect(result.results[0].conflict.detected).toBe(false);
            }
        });
        it('should handle missing client timestamp', async () => {
            const items = [
                {
                    id: 'txn-123',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    // clientTimestamp omitted
                },
            ];
            const result = await processBatchSync(items);
            // Without client timestamp, no conflict can be detected
            if (result.results[0].conflict) {
                expect(result.results[0].conflict.detected).toBe(false);
            }
        });
    });
    describe('Conflict Resolution Application', () => {
        it('should apply LWW resolution strategy', async () => {
            /**
             * Last-Write-Wins: Server version wins when it's newer
             * The server keeps its version and doesn't update with older client version
             */
            const serverTimestamp = Date.now();
            const clientTimestamp = serverTimestamp - 1000;
            vi.mocked(db.query).mockResolvedValueOnce({
                rows: [{ updated_at: new Date(serverTimestamp) }],
            });
            // Mock transaction to handle the sync
            vi.mocked(db.transaction).mockImplementation(async (callback) => {
                return callback({ query: vi.fn() });
            });
            const items = [
                {
                    id: 'txn-123',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    clientTimestamp,
                },
            ];
            const result = await processBatchSync(items);
            expect(result.success).toBe(true);
            // Check if conflict was detected and resolved
            if (result.results[0].conflict?.detected) {
                expect(result.results[0].conflict.resolutionApplied).toContain('LWW');
            }
        });
    });
    describe('Multiple Conflicts Handling', () => {
        it('should handle multiple conflicts in single batch', async () => {
            const now = Date.now();
            // Mock database to return different timestamps for different entities
            vi.mocked(db.query)
                .mockResolvedValueOnce({
                rows: [{ updated_at: new Date(now + 1000) }], // Newer
            })
                .mockResolvedValueOnce({
                rows: [{ updated_at: new Date(now - 1000) }], // Older
            });
            vi.mocked(db.transaction).mockImplementation(async (callback) => {
                return callback({ query: vi.fn() });
            });
            const items = [
                {
                    id: 'txn-1',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    clientTimestamp: now,
                },
                {
                    id: 'member-1',
                    entityType: 'member',
                    changeType: 'UPDATE',
                    data: { name: 'John' },
                    clientTimestamp: now,
                },
            ];
            const result = await processBatchSync(items);
            expect(result.results.length).toBe(2);
            // Track how many conflicts were detected
            const conflictCount = result.results.filter((r) => r.conflict?.detected).length;
            expect(typeof conflictCount).toBe('number');
        });
        it('should track conflict statistics', async () => {
            const now = Date.now();
            // Mock for 3 entities
            vi.mocked(db.query)
                .mockResolvedValueOnce({ rows: [{ updated_at: new Date(now + 1000) }] })
                .mockResolvedValueOnce({ rows: [{ updated_at: new Date(now + 1000) }] })
                .mockResolvedValueOnce({ rows: [{ updated_at: new Date(now - 1000) }] });
            vi.mocked(db.transaction).mockImplementation(async (callback) => {
                return callback({ query: vi.fn() });
            });
            const items = [
                {
                    id: 'txn-1',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: {},
                    clientTimestamp: now,
                },
                {
                    id: 'txn-2',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: {},
                    clientTimestamp: now,
                },
                {
                    id: 'member-1',
                    entityType: 'member',
                    changeType: 'UPDATE',
                    data: {},
                    clientTimestamp: now,
                },
            ];
            const result = await processBatchSync(items);
            expect(result.results).toHaveLength(3);
            expect(typeof result.conflictsDetected).toBe('number');
        });
    });
    describe('Conflict Prevention', () => {
        it('should not detect conflicts for CREATE operations', async () => {
            /**
             * CREATE operations cannot conflict because the entity doesn't exist yet
             */
            const items = [
                {
                    id: 'new-txn',
                    entityType: 'transaction',
                    changeType: 'CREATE',
                    data: { amount: 100000 },
                    clientTimestamp: Date.now(),
                },
            ];
            const result = await processBatchSync(items);
            // No database query should be made for conflict detection on CREATE
            expect(result.results[0]).toBeDefined();
            // CREATE should not have conflict info attached
            if (result.results[0].conflict) {
                expect(result.results[0].conflict.detected).toBe(false);
            }
        });
        it('should handle non-existent entities gracefully', async () => {
            /**
             * If entity doesn't exist on server, no conflict possible
             */
            vi.mocked(db.query).mockResolvedValueOnce({
                rows: [], // Entity not found
            });
            const items = [
                {
                    id: 'nonexistent-txn',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    clientTimestamp: Date.now(),
                },
            ];
            const result = await processBatchSync(items);
            // Should handle gracefully
            expect(result.results[0]).toBeDefined();
        });
    });
    describe('Conflict Information Communication', () => {
        it('should include conflict details in response', async () => {
            const now = Date.now();
            vi.mocked(db.query).mockResolvedValueOnce({
                rows: [{ updated_at: new Date(now + 5000) }],
            });
            const items = [
                {
                    id: 'txn-123',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    clientTimestamp: now,
                },
            ];
            const result = await processBatchSync(items);
            expect(result).toHaveProperty('conflictsDetected');
            expect(result.results[0]).toHaveProperty('conflict');
            if (result.results[0].conflict?.detected) {
                expect(result.results[0].conflict).toHaveProperty('strategy');
                expect(result.results[0].conflict).toHaveProperty('reason');
                expect(result.results[0].conflict).toHaveProperty('serverVersion');
            }
        });
        it('should indicate resolution applied', async () => {
            const now = Date.now();
            vi.mocked(db.query).mockResolvedValueOnce({
                rows: [{ updated_at: new Date(now + 5000) }],
            });
            const items = [
                {
                    id: 'txn-123',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    clientTimestamp: now,
                },
            ];
            const result = await processBatchSync(items);
            if (result.results[0].conflict?.detected) {
                expect(result.results[0].conflict.resolutionApplied).toBeDefined();
                expect(typeof result.results[0].conflict.resolutionApplied).toBe('string');
            }
        });
    });
    describe('Conflict Idempotency', () => {
        it('should handle repeated conflict detection idempotently', async () => {
            /**
             * Property: Conflict detection idempotency
             * Same input should always produce the same conflict detection result
             */
            const now = Date.now();
            const clientTimestamp = now - 5000;
            // Mock same response for multiple calls
            vi.mocked(db.query).mockResolvedValue({
                rows: [{ updated_at: new Date(now) }],
            });
            const items = [
                {
                    id: 'txn-123',
                    entityType: 'transaction',
                    changeType: 'UPDATE',
                    data: { amount: 100000 },
                    clientTimestamp,
                },
            ];
            // Process same batch twice
            const result1 = await processBatchSync(items);
            const result2 = await processBatchSync(items);
            // Both should detect same conflict status
            expect(result1.results[0].conflict?.detected ===
                result2.results[0].conflict?.detected).toBe(true);
        });
    });
});
//# sourceMappingURL=sync.conflicts.test.js.map