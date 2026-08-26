/**
 * Authentication Service
 * Handles JWT token generation/validation, password hashing, and user authentication
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { User as DatabaseUser } from '../database/types.js';
import { ApiErrorCode, ApiError } from '../utils/errors.js';
import { AttendanceService } from './attendance.js';

/**
 * JWT Token Payload
 */
export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: 'KASIR' | 'OWNER' | 'ADMIN';
  storeId?: string;
}

/**
 * Refresh Token Payload (minimal payload for refresh tokens)
 */
export interface RefreshTokenPayload {
  userId: string;
  tokenType: 'refresh';
}

/**
 * Login Request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login Response
 */
export interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: 'KASIR' | 'OWNER' | 'ADMIN';
    storeId?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  attendanceId?: string;
}

/**
 * Refresh Token Response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * Authentication Service
 */
export class AuthService {
  /**
   * Hash password using bcrypt
   * Uses 12 salt rounds as per security requirements
   *
   * @param password - Plain text password to hash
   * @returns Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12; // Security requirement: 12 salt rounds
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Password hashing failed', error as Error);
      throw new ApiError('Failed to hash password', ApiErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Compare password with hash
   * Used during login to verify password
   *
   * @param password - Plain text password from user
   * @param hash - Stored bcrypt hash
   * @returns True if password matches, false otherwise
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed', error as Error);
      return false;
    }
  }

  /**
   * Generate JWT access token
   * Token valid for 1 hour by default
   *
   * @param payload - Token payload data
   * @returns JWT token string
   */
  static generateAccessToken(payload: TokenPayload): string {
    try {
      // Validate JWT secret is configured
      if (!config.jwt.secret || config.jwt.secret === 'your-secret-key-change-in-production') {
        throw new Error('JWT_SECRET not properly configured');
      }

      const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiry || '1h', // Default 1 hour
        algorithm: 'HS256',
      });

      return token;
    } catch (error) {
      logger.error('Access token generation failed', error as Error);
      throw new ApiError('Failed to generate access token', ApiErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Generate JWT refresh token
   * Token valid for 7 days by default, used to obtain new access tokens
   *
   * @param userId - User ID
   * @returns JWT refresh token string
   */
  static generateRefreshToken(userId: string): string {
    try {
      // Validate JWT refresh secret is configured
      if (!config.jwt.refreshSecret || config.jwt.refreshSecret === 'your-refresh-secret-key') {
        throw new Error('JWT_REFRESH_SECRET not properly configured');
      }

      const payload: RefreshTokenPayload = {
        userId,
        tokenType: 'refresh',
      };

      const token = jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiry || '7d', // Default 7 days
        algorithm: 'HS256',
      });

      return token;
    } catch (error) {
      logger.error('Refresh token generation failed', error as Error);
      throw new ApiError('Failed to generate refresh token', ApiErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Verify and decode JWT access token
   * Returns payload if token is valid and not expired
   *
   * @param token - JWT token to verify
   * @returns Decoded token payload
   * @throws ApiError if token is invalid or expired
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      if (!config.jwt.secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: ['HS256'],
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Token expired', { expiresAt: error.expiredAt });
        throw new ApiError('Token expired', ApiErrorCode.TOKEN_EXPIRED, 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Invalid token', { message: error.message });
        throw new ApiError('Invalid token', ApiErrorCode.INVALID_TOKEN, 401);
      }
      logger.error('Token verification failed', error as Error);
      throw new ApiError('Token verification failed', ApiErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Verify and decode JWT refresh token
   * Returns payload if token is valid and not expired
   *
   * @param token - Refresh token to verify
   * @returns Decoded token payload
   * @throws ApiError if token is invalid or expired
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      if (!config.jwt.refreshSecret) {
        throw new Error('JWT_REFRESH_SECRET not configured');
      }

      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        algorithms: ['HS256'],
      }) as RefreshTokenPayload;

      // Verify it's a refresh token
      if (decoded.tokenType !== 'refresh') {
        throw new ApiError('Invalid token type', ApiErrorCode.INVALID_TOKEN, 401);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Refresh token expired', { expiresAt: error.expiredAt });
        throw new ApiError('Refresh token expired', ApiErrorCode.TOKEN_EXPIRED, 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Invalid refresh token', { message: error.message });
        throw new ApiError('Invalid refresh token', ApiErrorCode.INVALID_TOKEN, 401);
      }
      logger.error('Refresh token verification failed', error as Error);
      throw new ApiError('Refresh token verification failed', ApiErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Authenticate user with email and password
   * Verifies credentials and returns tokens if valid
   *
   * @param loginRequest - { email, password }
   * @returns LoginResponse with user data and tokens
   * @throws ApiError if credentials are invalid
   */
  static async login(loginRequest: LoginRequest): Promise<LoginResponse> {
    try {
      const { email, password } = loginRequest;

      // Validate input
      if (!email || !password) {
        throw new ApiError('Email and password are required', ApiErrorCode.BAD_REQUEST, 400);
      }

      // Find user by email
      const result = await db.query(
        'SELECT id, username, email, password_hash, role, store_id, is_active FROM users WHERE email = $1',
        [email]
      );

      if (!result.rows || result.rows.length === 0) {
        logger.warn('Login attempt with non-existent email', { email });
        throw new ApiError('Invalid email or password', ApiErrorCode.UNAUTHORIZED, 401);
      }

      const user = result.rows[0] as DatabaseUser;

      // Check if user is active
      if (!user.is_active) {
        logger.warn('Login attempt with inactive user', { userId: user.id, email });
        throw new ApiError('User account is inactive', ApiErrorCode.UNAUTHORIZED, 401);
      }

      // Verify password
      const passwordValid = await this.verifyPassword(password, user.password_hash);

      if (!passwordValid) {
        logger.warn('Login attempt with invalid password', { email });
        throw new ApiError('Invalid email or password', ApiErrorCode.UNAUTHORIZED, 401);
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        username: user.username,
        email: user.email || '',
        role: user.role as 'KASIR' | 'OWNER' | 'ADMIN',
        storeId: user.store_id || undefined,
      };

      const accessToken = this.generateAccessToken(tokenPayload);
      const refreshToken = this.generateRefreshToken(user.id);

      // Update last_login timestamp
      await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      // Record clock-in for KASIR users
      let attendanceId: string | undefined;
      if (user.role === 'KASIR') {
        try {
          const clockInResponse = await AttendanceService.clockIn({
            userId: user.id,
            storeId: user.store_id,
          });
          attendanceId = clockInResponse.attendanceId;
        } catch (attendanceError) {
          logger.warn('Failed to record attendance during login', attendanceError as Error, {
            userId: user.id,
          });
          // Don't fail login if attendance recording fails
        }
      }

      // Calculate access token expiration time
      const expiresIn = this.getTokenExpiresIn(config.jwt.expiry || '1h');

      logger.info('User login successful', {
        userId: user.id,
        email: user.email,
        role: user.role,
        attendanceId,
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email || '',
          role: user.role as 'KASIR' | 'OWNER' | 'ADMIN',
          storeId: user.store_id || undefined,
        },
        accessToken,
        refreshToken,
        expiresIn,
        attendanceId,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Login failed', error as Error);
      throw new ApiError('Login failed', ApiErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Refresh access token using refresh token
   * Returns new access token if refresh token is valid
   *
   * @param refreshToken - Valid refresh token
   * @returns RefreshTokenResponse with new access token
   * @throws ApiError if refresh token is invalid
   */
  static async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // Verify refresh token
      const payload = this.verifyRefreshToken(refreshToken);

      // Fetch fresh user data
      const result = await db.query(
        'SELECT id, username, email, role, store_id, is_active FROM users WHERE id = $1',
        [payload.userId]
      );

      if (!result.rows || result.rows.length === 0) {
        logger.warn('Refresh token for non-existent user', { userId: payload.userId });
        throw new ApiError('User not found', ApiErrorCode.UNAUTHORIZED, 401);
      }

      const user = result.rows[0] as DatabaseUser;

      // Check if user is still active
      if (!user.is_active) {
        logger.warn('Refresh token for inactive user', { userId: user.id });
        throw new ApiError('User account is inactive', ApiErrorCode.UNAUTHORIZED, 401);
      }

      // Generate new access token
      const tokenPayload: TokenPayload = {
        userId: user.id,
        username: user.username,
        email: user.email || '',
        role: user.role as 'KASIR' | 'OWNER' | 'ADMIN',
        storeId: user.store_id || undefined,
      };

      const newAccessToken = this.generateAccessToken(tokenPayload);
      const expiresIn = this.getTokenExpiresIn(config.jwt.expiry || '1h');

      logger.debug('Access token refreshed', { userId: user.id });

      return {
        accessToken: newAccessToken,
        expiresIn,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Token refresh failed', error as Error);
      throw new ApiError('Token refresh failed', ApiErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Convert expiry string (e.g., "24h", "7d") to seconds
   * Used to calculate expiresIn for API responses
   *
   * @param expiryString - Expiry time string (e.g., "1h", "7d", "3600")
   * @returns Expiry time in seconds
   */
  private static getTokenExpiresIn(expiryString: string): number {
    // If it's already a number, return it as seconds
    if (!isNaN(Number(expiryString))) {
      return Number(expiryString);
    }

    // Parse duration strings like "1h", "24h", "7d", "30m", "3600"
    const match = expiryString.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 1 hour if unable to parse
      return 3600;
    }

    const [, value, unit] = match;
    const numValue = Number(value);

    switch (unit) {
      case 's':
        return numValue;
      case 'm':
        return numValue * 60;
      case 'h':
        return numValue * 3600;
      case 'd':
        return numValue * 86400;
      default:
        return 3600; // Default to 1 hour
    }
  }

  /**
   * Validate user credentials (used by authenticate middleware)
   * Returns user data if credentials are valid
   *
   * @param userId - User ID to validate
   * @returns User data
   * @throws ApiError if user not found or inactive
   */
  static async validateUser(userId: string) {
    try {
      const result = await db.query(
        'SELECT id, username, email, role, store_id, is_active FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new ApiError('User not found', ApiErrorCode.UNAUTHORIZED, 401);
      }

      const user = result.rows[0] as DatabaseUser;

      if (!user.is_active) {
        throw new ApiError('User account is inactive', ApiErrorCode.UNAUTHORIZED, 401);
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email || '',
        role: user.role,
        storeId: user.store_id,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('User validation failed', error as Error, { userId });
      throw new ApiError('User validation failed', ApiErrorCode.INTERNAL_ERROR, 500);
    }
  }
}

export default AuthService;
