import { logger } from '../utils/logger.js';
import { toAppError } from '../utils/errors.js';
import { config } from '../config/index.js';
/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
export function errorHandlerMiddleware(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    const requestId = req.requestId || 'unknown';
    const duration = req.startTime ? Date.now() - req.startTime : undefined;
    // Convert error to AppError
    const appError = toAppError(err);
    // Log error
    logger.error(`[${req.method}] ${req.path} - ${appError.message}`, appError, {
        requestId,
        statusCode: appError.statusCode,
        code: appError.code,
        path: req.path,
        method: req.method,
    }, duration);
    // Prepare error response
    const errorResponse = {
        error: {
            message: appError.message,
            code: appError.code,
            statusCode: appError.statusCode,
            ...(config.server.isDevelopment && appError.details && {
                details: appError.details,
            }),
            ...(config.server.isDevelopment && {
                stack: appError.stack,
            }),
        },
        requestId,
    };
    // Send error response
    res.status(appError.statusCode).json(errorResponse);
}
/**
 * Middleware to handle 404 Not Found
 */
export function notFoundMiddleware(_req, res) {
    res.status(404).json({
        error: {
            message: 'Not Found',
            code: 'NOT_FOUND',
            statusCode: 404,
        },
    });
}
/**
 * Async error wrapper for route handlers
 * Wraps async route handlers to catch errors and pass to next()
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=errorHandler.js.map