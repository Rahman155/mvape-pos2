/**
 * Sync Routes
 * Handles batch synchronization of offline changes
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { processBatchSync, getSyncStats } from '../services/sync.js';
import { logger } from '../utils/logger.js';
const router = Router();
/**
 * POST /api/sync/batch
 * Process a batch of offline changes
 *
 * Request body:
 * {
 *   "items": [
 *     {
 *       "id": "item-1",
 *       "entityType": "transaction",
 *       "changeType": "CREATE",
 *       "data": { ... },
 *       "clientTimestamp": 1234567890
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "results": [
 *     {
 *       "id": "item-1",
 *       "success": true,
 *       "data": { ... },
 *       "serverTimestamp": 1234567890
 *     },
 *     {
 *       "id": "item-2",
 *       "success": false,
 *       "error": "Validation error message",
 *       "serverTimestamp": 1234567890
 *     }
 *   ],
 *   "timestamp": 1234567890,
 *   "version": "1.0.0"
 * }
 */
router.post('/batch', requireAuth(), async (req, res) => {
    try {
        const { items } = req.body;
        // Validate request
        if (!items || !Array.isArray(items)) {
            logger.warn('Invalid batch sync request - items must be an array');
            return res.status(400).json({
                error: 'Invalid request format',
                message: 'items field must be an array',
            });
        }
        if (items.length === 0) {
            logger.debug('Empty batch sync request received');
            return res.status(200).json({
                success: true,
                results: [],
                timestamp: Date.now(),
                version: '1.0.0',
            });
        }
        // Validate each item
        const validationErrors = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.id) {
                validationErrors.push(`Item ${i}: missing id`);
            }
            if (!item.entityType) {
                validationErrors.push(`Item ${i}: missing entityType`);
            }
            if (!item.changeType) {
                validationErrors.push(`Item ${i}: missing changeType`);
            }
            if (!item.data) {
                validationErrors.push(`Item ${i}: missing data`);
            }
        }
        if (validationErrors.length > 0) {
            logger.warn('Batch sync validation errors:', validationErrors);
            return res.status(400).json({
                error: 'Validation failed',
                message: 'One or more items are invalid',
                details: validationErrors,
            });
        }
        logger.info(`Received batch sync request with ${items.length} items`);
        // Process batch
        const response = await processBatchSync(items);
        // Log results
        const successCount = response.results.filter((r) => r.success).length;
        const failureCount = response.results.filter((r) => !r.success).length;
        logger.info(`Batch sync completed: ${successCount} succeeded, ${failureCount} failed`);
        // Return 200 OK regardless of individual item success/failure
        // The caller should check individual result.success flags
        return res.status(200).json(response);
    }
    catch (error) {
        logger.error('Error processing batch sync:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
});
/**
 * GET /api/sync/stats
 * Get sync statistics
 */
router.get('/stats', requireAuth(), async (req, res) => {
    try {
        const stats = await getSyncStats();
        return res.status(200).json(stats);
    }
    catch (error) {
        logger.error('Error getting sync stats:', error);
        return res.status(500).json({
            error: 'Failed to get sync statistics',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /api/sync/health
 * Check sync system health
 */
router.post('/health', requireAuth(), async (req, res) => {
    try {
        return res.status(200).json({
            status: 'healthy',
            timestamp: Date.now(),
            version: '1.0.0',
        });
    }
    catch (error) {
        logger.error('Error checking sync health:', error);
        return res.status(500).json({
            error: 'Health check failed',
            status: 'unhealthy',
        });
    }
});
export const syncRouter = router;
//# sourceMappingURL=sync.js.map