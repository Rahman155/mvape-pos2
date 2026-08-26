import { Request, Response, NextFunction } from 'express';
/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
export declare function errorHandlerMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void;
/**
 * Middleware to handle 404 Not Found
 */
export declare function notFoundMiddleware(_req: Request, res: Response): void;
/**
 * Async error wrapper for route handlers
 * Wraps async route handlers to catch errors and pass to next()
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map