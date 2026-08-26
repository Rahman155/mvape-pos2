/**
 * Authentication middleware
 * Extracts and validates JWT tokens from requests
 */
import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../services/auth.js';
/**
 * Middleware to extract and validate JWT token from request
 * Supports token in Authorization header (Bearer <token>) or x-auth-token header
 *
 * Sets req.user if token is valid, otherwise continues without user
 * Does not throw errors - allows handlers to decide how to treat unauthenticated requests
 *
 * @returns Express middleware function
 *
 * @example
 * app.use(authenticateMiddleware);
 */
export declare function authenticateMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Extract JWT token from request
 * Checks Authorization header (Bearer scheme) and x-auth-token header
 *
 * @param req - Express request object
 * @returns Token string or null if not found
 */
export declare function extractToken(req: Request): string | null;
/**
 * Validate JWT token using AuthService
 * Verifies token signature and expiration
 *
 * @param token - JWT token string
 * @returns TokenPayload if valid, null otherwise
 */
export declare function validateToken(token: string): TokenPayload | null;
/**
 * Generate JWT token (re-export from AuthService)
 * This is used in the login endpoint
 *
 * @param payload - Token payload data
 * @param expiresIn - Token expiration time (default: 1 hour in seconds)
 * @returns JWT token string
 */
export declare function generateToken(payload: TokenPayload): string;
/**
 * Generate refresh token (re-export from AuthService)
 * Typically longer-lived than access token
 *
 * @param userId - User ID
 * @returns Refresh token string
 */
export declare function generateRefreshToken(userId: string): string;
//# sourceMappingURL=authenticate.d.ts.map