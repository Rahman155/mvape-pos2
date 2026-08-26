import { Request, Response, NextFunction } from 'express';
/**
 * Extend Express Request to include custom properties
 */
declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
        }
    }
}
/**
 * Middleware to add request ID tracking
 */
export declare function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to log HTTP requests and responses
 */
export declare function httpLoggingMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to handle request timeout
 */
export declare function timeoutMiddleware(timeoutMs?: number): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestLogging.d.ts.map