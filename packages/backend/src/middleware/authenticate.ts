/**
 * Authentication middleware
 * Extracts and validates JWT tokens from requests
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AuthService, TokenPayload } from '../services/auth.js';
import { ApiError, ApiErrorCode } from '../utils/errors.js';

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
export function authenticateMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token found, continue without user
      // Individual route handlers will decide if authentication is required
      return next();
    }

    // Validate token
    const payload = validateToken(token);

    if (!payload) {
      // Invalid token, continue without user
      return next();
    }

    // Attach user to request
    req.user = {
      id: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      storeId: payload.storeId,
    };

    req.token = token;

    logger.debug('User authenticated', {
      requestId: req.requestId,
      userId: req.user.id,
      role: req.user.role,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', error as Error, {
      requestId: req.requestId,
    });
    // Continue without user on error
    next();
  }
}

/**
 * Extract JWT token from request
 * Checks Authorization header (Bearer scheme) and x-auth-token header
 *
 * @param req - Express request object
 * @returns Token string or null if not found
 */
export function extractToken(req: Request): string | null {
  // Check Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove "Bearer " prefix
  }

  // Check x-auth-token header
  const tokenHeader = req.headers['x-auth-token'];
  if (tokenHeader && typeof tokenHeader === 'string') {
    return tokenHeader;
  }

  return null;
}

/**
 * Validate JWT token using AuthService
 * Verifies token signature and expiration
 *
 * @param token - JWT token string
 * @returns TokenPayload if valid, null otherwise
 */
export function validateToken(token: string): TokenPayload | null {
  try {
    return AuthService.verifyAccessToken(token);
  } catch (error) {
    if (error instanceof ApiError) {
      logger.debug('Token validation failed', {
        code: error.code,
        message: error.message,
      });
    } else {
      logger.debug('Token validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

/**
 * Generate JWT token (re-export from AuthService)
 * This is used in the login endpoint
 *
 * @param payload - Token payload data
 * @param expiresIn - Token expiration time (default: 1 hour in seconds)
 * @returns JWT token string
 */
export function generateToken(payload: TokenPayload): string {
  return AuthService.generateAccessToken(payload);
}

/**
 * Generate refresh token (re-export from AuthService)
 * Typically longer-lived than access token
 *
 * @param userId - User ID
 * @returns Refresh token string
 */
export function generateRefreshToken(userId: string): string {
  return AuthService.generateRefreshToken(userId);
}
