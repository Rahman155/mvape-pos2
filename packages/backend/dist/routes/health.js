import { Router } from 'express';
import { config } from '../config/index.js';
import { db } from '../database/index.js';
import { redis } from '../cache/index.js';
import { logger } from '../utils/logger.js';
export const healthRouter = Router();
/**
 * GET /health
 * Simple liveness probe
 */
healthRouter.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});
/**
 * GET /status
 * Detailed service status
 */
healthRouter.get('/status', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const poolStats = db.getPoolStats();
    res.json({
        service: 'vapestore-pos-backend',
        version: '1.0.0',
        status: 'healthy',
        environment: config.server.nodeEnv,
        timestamp: new Date().toISOString(),
        uptime: Math.round(uptime),
        memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        database: poolStats,
        api: {
            prefix: config.api.prefix,
            corsOrigin: config.api.corsOrigin,
        },
    });
});
/**
 * GET /ready
 * Readiness probe (checks if dependencies are available)
 * Checks database and Redis cache connectivity
 */
healthRouter.get('/ready', async (_req, res) => {
    try {
        const dbHealthy = await db.healthCheck();
        const dbConnected = db.connected();
        const cacheHealthy = await redis.healthCheck();
        const cacheConnected = redis.connected();
        const isReady = dbConnected && cacheConnected;
        if (isReady) {
            res.json({
                ready: true,
                timestamp: new Date().toISOString(),
                database: {
                    status: dbHealthy ? 'connected' : 'degraded',
                    ...db.getPoolStats(),
                },
                cache: {
                    status: cacheHealthy ? 'connected' : 'degraded',
                },
            });
        }
        else {
            res.status(503).json({
                ready: false,
                timestamp: new Date().toISOString(),
                database: {
                    status: dbConnected ? 'connected' : 'disconnected',
                },
                cache: {
                    status: cacheConnected ? 'connected' : 'disconnected',
                },
                message: 'Service dependencies are not available',
            });
        }
    }
    catch (error) {
        logger.error('Readiness check failed', error);
        res.status(503).json({
            ready: false,
            timestamp: new Date().toISOString(),
            message: 'Service check failed',
        });
    }
});
/**
 * GET /version
 * Get API version information
 */
healthRouter.get('/version', (_req, res) => {
    res.json({
        apiVersion: '1.0.0',
        nodeVersion: process.version,
        environment: config.server.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});
/**
 * GET /db/status
 * Detailed database and cache status (for debugging)
 */
healthRouter.get('/db/status', async (_req, res) => {
    try {
        const dbIsHealthy = await db.healthCheck();
        const dbStats = db.getPoolStats();
        const cacheIsHealthy = await redis.healthCheck();
        res.json({
            database: {
                healthy: dbIsHealthy,
                connected: db.connected(),
                ...dbStats,
            },
            cache: {
                healthy: cacheIsHealthy,
                connected: redis.connected(),
                url: config.redis.url,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger.error('Status check failed', error);
        res.status(500).json({
            error: 'Status check failed',
            message: error.message,
        });
    }
});
/**
 * GET /cache/status
 * Detailed cache status (for debugging)
 */
healthRouter.get('/cache/status', async (_req, res) => {
    try {
        const isHealthy = await redis.healthCheck();
        const connected = redis.connected();
        res.json({
            cache: {
                healthy: isHealthy,
                connected,
                url: config.redis.url,
                status: isHealthy ? 'operational' : 'degraded',
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger.error('Cache status check failed', error);
        res.status(500).json({
            error: 'Cache status check failed',
            message: error.message,
        });
    }
});
//# sourceMappingURL=health.js.map