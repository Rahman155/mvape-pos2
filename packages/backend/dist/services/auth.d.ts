/**
 * Authentication Service
 * Handles JWT token generation/validation, password hashing, and user authentication
 */
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
export declare class AuthService {
    /**
     * Hash password using bcrypt
     * Uses 12 salt rounds as per security requirements
     *
     * @param password - Plain text password to hash
     * @returns Hashed password
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Compare password with hash
     * Used during login to verify password
     *
     * @param password - Plain text password from user
     * @param hash - Stored bcrypt hash
     * @returns True if password matches, false otherwise
     */
    static verifyPassword(password: string, hash: string): Promise<boolean>;
    /**
     * Generate JWT access token
     * Token valid for 1 hour by default
     *
     * @param payload - Token payload data
     * @returns JWT token string
     */
    static generateAccessToken(payload: TokenPayload): string;
    /**
     * Generate JWT refresh token
     * Token valid for 7 days by default, used to obtain new access tokens
     *
     * @param userId - User ID
     * @returns JWT refresh token string
     */
    static generateRefreshToken(userId: string): string;
    /**
     * Verify and decode JWT access token
     * Returns payload if token is valid and not expired
     *
     * @param token - JWT token to verify
     * @returns Decoded token payload
     * @throws ApiError if token is invalid or expired
     */
    static verifyAccessToken(token: string): TokenPayload;
    /**
     * Verify and decode JWT refresh token
     * Returns payload if token is valid and not expired
     *
     * @param token - Refresh token to verify
     * @returns Decoded token payload
     * @throws ApiError if token is invalid or expired
     */
    static verifyRefreshToken(token: string): RefreshTokenPayload;
    /**
     * Authenticate user with email and password
     * Verifies credentials and returns tokens if valid
     *
     * @param loginRequest - { email, password }
     * @returns LoginResponse with user data and tokens
     * @throws ApiError if credentials are invalid
     */
    static login(loginRequest: LoginRequest): Promise<LoginResponse>;
    /**
     * Refresh access token using refresh token
     * Returns new access token if refresh token is valid
     *
     * @param refreshToken - Valid refresh token
     * @returns RefreshTokenResponse with new access token
     * @throws ApiError if refresh token is invalid
     */
    static refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse>;
    /**
     * Convert expiry string (e.g., "24h", "7d") to seconds
     * Used to calculate expiresIn for API responses
     *
     * @param expiryString - Expiry time string (e.g., "1h", "7d", "3600")
     * @returns Expiry time in seconds
     */
    private static getTokenExpiresIn;
    /**
     * Validate user credentials (used by authenticate middleware)
     * Returns user data if credentials are valid
     *
     * @param userId - User ID to validate
     * @returns User data
     * @throws ApiError if user not found or inactive
     */
    static validateUser(userId: string): Promise<{
        id: string;
        username: string;
        email: string;
        role: "KASIR" | "OWNER" | "ADMIN";
        storeId: string | null;
    }>;
}
export default AuthService;
//# sourceMappingURL=auth.d.ts.map