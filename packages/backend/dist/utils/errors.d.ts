/**
 * API Error Codes
 */
export declare enum ApiErrorCode {
    BAD_REQUEST = "BAD_REQUEST",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    INVALID_TOKEN = "INVALID_TOKEN",
    MISSING_CREDENTIALS = "MISSING_CREDENTIALS",
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
}
/**
 * API Error class - extends standard Error
 * Used for all API error responses
 */
export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly code: ApiErrorCode | string;
    readonly details?: Record<string, unknown>;
    constructor(message: string, code?: ApiErrorCode | string, statusCode?: number, details?: Record<string, unknown>);
    /**
     * Convert error to JSON response
     */
    toJSON(): {
        error: {
            details?: Record<string, unknown> | undefined;
            message: string;
            code: string;
            statusCode: number;
        };
    };
}
/**
 * Base application error class (legacy - kept for compatibility)
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(message: string, statusCode?: number, code?: string, details?: Record<string, unknown>);
    /**
     * Convert error to JSON response
     */
    toJSON(): {
        error: {
            details?: Record<string, unknown> | undefined;
            message: string;
            code: string;
            statusCode: number;
        };
    };
}
/**
 * Validation error
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Authentication error
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
/**
 * Authorization error
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Not found error
 */
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
/**
 * Conflict error
 */
export declare class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Rate limit error
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
/**
 * Internal server error
 */
export declare class InternalServerError extends AppError {
    constructor(message?: string);
}
/**
 * Service unavailable error
 */
export declare class ServiceUnavailableError extends AppError {
    constructor(message?: string);
}
/**
 * Database error
 */
export declare class DatabaseError extends AppError {
    constructor(message: string, originalError?: Error);
}
/**
 * Type guard to check if error is AppError
 */
export declare function isAppError(error: unknown): error is AppError;
/**
 * Convert any error to AppError
 */
export declare function toAppError(error: unknown): AppError;
//# sourceMappingURL=errors.d.ts.map