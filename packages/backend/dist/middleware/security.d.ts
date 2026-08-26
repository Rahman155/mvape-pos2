import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
/**
 * Configure CORS middleware with app-specific settings
 */
export declare function createCorsMiddleware(): (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Configure helmet middleware for security headers
 */
export declare function createHelmetMiddleware(): (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * Middleware to set security-related response headers
 */
export declare function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to enforce HTTPS in production
 */
export declare function httpsRedirectMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=security.d.ts.map