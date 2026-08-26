/**
 * Authentication routes
 * Handles login, logout, token refresh, and session management
 */
import express from 'express';
import { logger } from '../utils/logger.js';
import { AuthService } from '../services/auth.js';
import { ApiError, ApiErrorCode } from '../utils/errors.js';
export const authRouter = express.Router();
/**
 * POST /api/v1/auth/login
 * Public endpoint - authenticates user with email and password
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 *
 * Response (200):
 * {
 *   "data": {
 *     "user": {
 *       "id": "user-id",
 *       "username": "john",
 *       "email": "john@example.com",
 *       "role": "KASIR",
 *       "storeId": "store-id"
 *     },
 *     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
 *     "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
 *     "expiresIn": 3600,
 *     "attendanceId": "attendance-uuid" (for KASIR users)
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123"
 *   }
 * }
 *
 * Response (401):
 * {
 *   "error": {
 *     "message": "Invalid email or password",
 *     "code": "UNAUTHORIZED",
 *     "statusCode": 401
 *   },
 *   "requestId": "req-123"
 * }
 */
authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // Input validation
        if (!email) {
            throw new ApiError('Email is required', ApiErrorCode.BAD_REQUEST, 400);
        }
        if (!password) {
            throw new ApiError('Password is required', ApiErrorCode.BAD_REQUEST, 400);
        }
        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ApiError('Invalid email format', ApiErrorCode.VALIDATION_ERROR, 400);
        }
        // Authenticate user
        const result = await AuthService.login({ email, password });
        logger.info('User login successful', {
            userId: result.user.id,
            email: result.user.email,
            requestId: req.requestId,
        });
        // Return response with tokens
        res.status(200).json({
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/auth/refresh
 * Public endpoint - generates new access token using valid refresh token
 *
 * Request body:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
 * }
 *
 * Response (200):
 * {
 *   "data": {
 *     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
 *     "expiresIn": 3600
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123"
 *   }
 * }
 *
 * Response (401):
 * {
 *   "error": {
 *     "message": "Token expired",
 *     "code": "TOKEN_EXPIRED",
 *     "statusCode": 401
 *   },
 *   "requestId": "req-123"
 * }
 */
authRouter.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        // Input validation
        if (!refreshToken) {
            throw new ApiError('Refresh token is required', ApiErrorCode.MISSING_CREDENTIALS, 400);
        }
        // Refresh access token
        const result = await AuthService.refreshAccessToken(refreshToken);
        logger.debug('Access token refreshed', {
            requestId: req.requestId,
        });
        // Return response with new access token
        res.status(200).json({
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/auth/logout
 * Protected endpoint - invalidates session and clocks out if kasir
 * Requires authentication
 *
 * Request headers:
 * Authorization: Bearer <access_token>
 *
 * Response (200):
 * {
 *   "data": {
 *     "success": true,
 *     "message": "Logged out successfully",
 *     "clockOut": {
 *       "timestamp": "2024-01-15T17:30:00.000Z",
 *       "durationMinutes": 510
 *     } (only for KASIR users)
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123"
 *   }
 * }
 *
 * Response (401):
 * {
 *   "error": {
 *     "message": "Authentication required",
 *     "code": "UNAUTHORIZED",
 *     "statusCode": 401
 *   },
 *   "requestId": "req-123"
 * }
 */
authRouter.post('/logout', async (req, res, next) => {
    try {
        // Verify user is authenticated
        if (!req.user) {
            throw new ApiError('Authentication required', ApiErrorCode.UNAUTHORIZED, 401);
        }
        const userId = req.user.id;
        const clockOutTime = new Date();
        let clockOutData = undefined;
        // Clock out for KASIR users
        if (req.user.role === 'KASIR') {
            try {
                const { AttendanceService } = await import('../services/attendance.js');
                const attendanceRecord = await AttendanceService.clockOut(userId, clockOutTime);
                clockOutData = {
                    timestamp: attendanceRecord.clock_out,
                    durationMinutes: attendanceRecord.duration_minutes,
                };
                logger.info('User clocked out on logout', {
                    userId,
                    attendanceId: attendanceRecord.id,
                    durationMinutes: attendanceRecord.duration_minutes,
                    requestId: req.requestId,
                });
            }
            catch (error) {
                // Log clock-out error but don't fail logout
                if (error instanceof ApiError && error.statusCode === 404) {
                    // No attendance record found (user wasn't clocked in)
                    logger.warn('No attendance record found for clock-out', {
                        userId,
                        requestId: req.requestId,
                    });
                }
                else {
                    logger.error('Failed to clock out on logout', error, {
                        userId,
                        requestId: req.requestId,
                    });
                }
                // Continue with logout even if clock-out fails
            }
        }
        logger.info('User logged out', {
            userId,
            role: req.user.role,
            requestId: req.requestId,
        });
        // TODO: In Task 8, implement token blacklisting using Redis
        // For now, logout happens on client side by removing tokens
        const responseData = {
            success: true,
            message: 'Logged out successfully',
        };
        if (clockOutData) {
            responseData.clockOut = clockOutData;
        }
        res.status(200).json({
            data: responseData,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/auth/me
 * Protected endpoint - returns current authenticated user's profile
 * Requires authentication
 *
 * Request headers:
 * Authorization: Bearer <access_token>
 *
 * Response (200):
 * {
 *   "data": {
 *     "user": {
 *       "id": "user-id",
 *       "username": "john",
 *       "email": "john@example.com",
 *       "role": "KASIR",
 *       "storeId": "store-id"
 *     }
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123"
 *   }
 * }
 *
 * Response (401):
 * {
 *   "error": {
 *     "message": "Authentication required",
 *     "code": "UNAUTHORIZED",
 *     "statusCode": 401
 *   },
 *   "requestId": "req-123"
 * }
 */
authRouter.get('/me', async (req, res, next) => {
    try {
        // Verify user is authenticated
        if (!req.user) {
            throw new ApiError('Authentication required', ApiErrorCode.UNAUTHORIZED, 401);
        }
        // Return current user profile
        res.status(200).json({
            data: {
                user: req.user,
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
export default authRouter;
//# sourceMappingURL=auth.js.map