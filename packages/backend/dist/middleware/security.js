import cors from 'cors';
import helmet from 'helmet';
import { config } from '../config/index.js';
/**
 * Configure CORS middleware with app-specific settings
 */
export function createCorsMiddleware() {
    return cors({
        origin: config.api.corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', config.requestTracking.idHeader],
        exposedHeaders: [config.requestTracking.idHeader],
        maxAge: 3600, // 1 hour
    });
}
/**
 * Configure helmet middleware for security headers
 */
export function createHelmetMiddleware() {
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
        frameguard: {
            action: 'deny',
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin',
        },
    });
}
/**
 * Middleware to set security-related response headers
 */
export function securityHeadersMiddleware(req, res, next) {
    // Disable caching for API responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Set API version header
    res.setHeader('X-API-Version', '1.0.0');
    // Set powered by header (obfuscate to prevent fingerprinting in production)
    if (!config.server.isProduction) {
        res.setHeader('X-Powered-By', 'Vapestore-POS-API');
    }
    else {
        res.removeHeader('X-Powered-By');
    }
    next();
}
/**
 * Middleware to enforce HTTPS in production
 */
export function httpsRedirectMiddleware(req, res, next) {
    if (config.server.isProduction && req.protocol !== 'https') {
        res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    else {
        next();
    }
}
//# sourceMappingURL=security.js.map