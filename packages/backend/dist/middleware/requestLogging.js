import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
/**
 * Middleware to add request ID tracking
 */
export function requestIdMiddleware(req, res, next) {
    // Try to get request ID from header, otherwise generate new one
    const headerName = config.requestTracking.idHeader;
    const requestId = req.get(headerName) ||
        req.get('x-request-id') ||
        randomUUID();
    req.requestId = requestId;
    req.startTime = Date.now();
    // Add request ID to response header
    res.setHeader(headerName, requestId);
    next();
}
/**
 * Middleware to log HTTP requests and responses
 */
export function httpLoggingMiddleware(req, res, next) {
    const { method, url, ip, query, body } = req;
    const { requestId, startTime } = req;
    // Log incoming request
    logger.debug(`[${method}] ${url} - Request received`, {
        requestId,
        method,
        path: req.path,
        query: Object.keys(query).length > 0 ? query : undefined,
        ip,
        userAgent: req.get('user-agent'),
    });
    // Capture original send function
    const originalSend = res.send;
    // Override send to log response
    res.send = function (data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        // Determine log level based on status code
        let logLevel = 'info';
        if (statusCode >= 400 && statusCode < 500) {
            logLevel = 'warn';
        }
        else if (statusCode >= 500) {
            logLevel = 'error';
        }
        // Log response
        logger[logLevel](`[${method}] ${url} - Response sent`, {
            requestId,
            method,
            path: req.path,
            statusCode,
            ip,
        }, duration);
        // Call original send
        return originalSend.call(this, data);
    };
    next();
}
/**
 * Middleware to handle request timeout
 */
export function timeoutMiddleware(timeoutMs = 30000) {
    return (req, res, next) => {
        const timeoutId = setTimeout(() => {
            if (!res.headersSent) {
                logger.warn('Request timeout', { requestId: req.requestId });
                res.status(408).json({
                    error: {
                        message: 'Request timeout',
                        code: 'REQUEST_TIMEOUT',
                        statusCode: 408,
                    },
                });
            }
        }, timeoutMs);
        // Clear timeout when response is finished
        res.on('finish', () => {
            clearTimeout(timeoutId);
        });
        next();
    };
}
//# sourceMappingURL=requestLogging.js.map