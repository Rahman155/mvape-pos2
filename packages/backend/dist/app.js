import express from 'express';
import { config, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { db, migrationRunner } from './database/index.js';
import { redis } from './cache/index.js';
// Middleware imports
import { requestIdMiddleware, httpLoggingMiddleware, timeoutMiddleware, } from './middleware/requestLogging.js';
import { createCorsMiddleware, createHelmetMiddleware, securityHeadersMiddleware, httpsRedirectMiddleware, } from './middleware/security.js';
import { errorHandlerMiddleware, notFoundMiddleware, } from './middleware/errorHandler.js';
import { authenticateMiddleware } from './middleware/authenticate.js';
// Routes imports
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { productsRouter } from './routes/products.js';
import membersRouter from './routes/members.js';
import transactionsRouter from './routes/transactions.js';
import { syncRouter } from './routes/sync.js';
import { attendanceRouter } from './routes/attendance.js';
import storesRouter from './routes/stores.js';
import inventoryRouter from './routes/inventory.js';
import stockTransfersRouter from './routes/stock-transfers.js';
import bopRouter from './routes/bop.js';
import suppliersRouter from './routes/suppliers.js';
import purchaseOrdersRouter from './routes/purchase-orders.js';
import payablesRouter from './routes/payables.js';
import piutangRouter from './routes/piutang.js';
import stockOpnameRouter from './routes/stock-opname.js';
import { reportsRouter } from './routes/reports.js';
/**
 * Create and configure Express application
 */
export function createApp() {
    // Validate configuration
    validateConfig();
    const app = express();
    // Trust proxy in production
    if (config.server.isProduction) {
        app.set('trust proxy', 1);
    }
    // ============================================================
    // SECURITY & SAFETY MIDDLEWARE (first in chain)
    // ============================================================
    // HTTPS redirect (only in production)
    if (config.server.isProduction) {
        app.use(httpsRedirectMiddleware);
    }
    // Security headers
    app.use(createHelmetMiddleware());
    app.use(securityHeadersMiddleware);
    // CORS
    app.use(createCorsMiddleware());
    // ============================================================
    // REQUEST TRACKING & LOGGING
    // ============================================================
    // Add request ID to all requests
    app.use(requestIdMiddleware);
    // HTTP request logging
    app.use(httpLoggingMiddleware);
    // ============================================================
    // BODY PARSING MIDDLEWARE
    // ============================================================
    // Parse JSON bodies
    app.use(express.json({ limit: '10mb' }));
    // Parse URL-encoded bodies
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    // ============================================================
    // AUTHENTICATION MIDDLEWARE
    // ============================================================
    // Extract and validate JWT token from requests
    app.use(authenticateMiddleware);
    // ============================================================
    // REQUEST TIMEOUT
    // ============================================================
    // Set request timeout to 30 seconds
    app.use(timeoutMiddleware(30000));
    // ============================================================
    // HEALTH CHECK ROUTES (public routes, no authentication needed)
    // ============================================================
    app.use('/', healthRouter);
    // ============================================================
    // API ROUTES (protected routes would go here)
    // ============================================================
    const apiRouter = express.Router();
    // Public endpoints (no authentication required)
    apiRouter.post('/auth/login', authRouter);
    apiRouter.post('/auth/refresh', authRouter);
    // Protected endpoints (authentication required)
    apiRouter.use('/auth', authRouter);
    apiRouter.use('/dashboard', dashboardRouter);
    apiRouter.use('/products', productsRouter);
    apiRouter.use('/members', membersRouter);
    apiRouter.use('/transactions', transactionsRouter);
    apiRouter.use('/sync', syncRouter);
    apiRouter.use('/attendance', attendanceRouter);
    apiRouter.use('/stores', storesRouter);
    apiRouter.use('/inventory', inventoryRouter);
    apiRouter.use('/stock-transfers', stockTransfersRouter);
    apiRouter.use('/bop', bopRouter);
    apiRouter.use('/suppliers', suppliersRouter);
    apiRouter.use('/purchase-orders', purchaseOrdersRouter);
    apiRouter.use('/payables', payablesRouter);
    apiRouter.use('/piutang', piutangRouter);
    apiRouter.use('/stock-opname', stockOpnameRouter);
    apiRouter.use('/reports', reportsRouter);
    // Placeholder for API routes
    apiRouter.get('/version', (_req, res) => {
        res.json({
            apiVersion: '1.0.0',
            environment: config.server.nodeEnv,
            timestamp: new Date().toISOString(),
        });
    });
    app.use(config.api.prefix, apiRouter);
    // ============================================================
    // ERROR HANDLING (last in chain)
    // ============================================================
    // 404 Not Found handler (must be after all routes)
    app.use(notFoundMiddleware);
    // Global error handler (must be last)
    app.use(errorHandlerMiddleware);
    return app;
}
/**
 * Start the server
 */
export async function startServer() {
    const app = createApp();
    return new Promise((resolve, reject) => {
        try {
            // Initialize database and cache, then run migrations
            (async () => {
                try {
                    logger.info('Initializing database connection...');
                    await db.initialize();
                    logger.info('Initializing Redis cache connection...');
                    await redis.initialize();
                    logger.info('Running database migrations...');
                    await migrationRunner.runPendingMigrations();
                    logger.info('Database and cache ready!');
                }
                catch (error) {
                    logger.error('Database or cache initialization failed', error);
                    throw error;
                }
            })();
            const server = app.listen(config.server.port, () => {
                logger.info(`Server started successfully`, {
                    port: config.server.port,
                    environment: config.server.nodeEnv,
                    apiPrefix: config.api.prefix,
                });
                resolve({ app, port: config.server.port });
            });
            // Handle server errors
            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger.error(`Port ${config.server.port} is already in use`, error);
                }
                else {
                    logger.error('Server error', error);
                }
                reject(error);
            });
            // Graceful shutdown handler
            process.on('SIGTERM', () => {
                logger.info('SIGTERM received, shutting down gracefully');
                server.close(async () => {
                    await redis.close();
                    await db.close();
                    logger.info('Server closed');
                    process.exit(0);
                });
            });
            process.on('SIGINT', () => {
                logger.info('SIGINT received, shutting down gracefully');
                server.close(async () => {
                    await redis.close();
                    await db.close();
                    logger.info('Server closed');
                    process.exit(0);
                });
            });
        }
        catch (error) {
            logger.error('Failed to start server', error);
            reject(error);
        }
    });
}
export default createApp;
//# sourceMappingURL=app.js.map