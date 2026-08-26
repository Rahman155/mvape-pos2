/**
 * API Error Codes
 */
export var ApiErrorCode;
(function (ApiErrorCode) {
    ApiErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    ApiErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ApiErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ApiErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ApiErrorCode["CONFLICT"] = "CONFLICT";
    ApiErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ApiErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ApiErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ApiErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ApiErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    ApiErrorCode["MISSING_CREDENTIALS"] = "MISSING_CREDENTIALS";
    ApiErrorCode["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
})(ApiErrorCode || (ApiErrorCode = {}));
/**
 * API Error class - extends standard Error
 * Used for all API error responses
 */
export class ApiError extends Error {
    statusCode;
    code;
    details;
    constructor(message, code = ApiErrorCode.INTERNAL_ERROR, statusCode = 500, details) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        // Set prototype for instanceof checks
        Object.setPrototypeOf(this, ApiError.prototype);
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
    /**
     * Convert error to JSON response
     */
    toJSON() {
        return {
            error: {
                message: this.message,
                code: this.code,
                statusCode: this.statusCode,
                ...(this.details && { details: this.details }),
            },
        };
    }
}
/**
 * Base application error class (legacy - kept for compatibility)
 */
export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        // Set prototype for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
    /**
     * Convert error to JSON response
     */
    toJSON() {
        return {
            error: {
                message: this.message,
                code: this.code,
                statusCode: this.statusCode,
                ...(this.details && { details: this.details }),
            },
        };
    }
}
/**
 * Validation error
 */
export class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
    constructor(message = 'Authorization failed') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}
/**
 * Not found error
 */
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
/**
 * Conflict error
 */
export class ConflictError extends AppError {
    constructor(message, details) {
        super(message, 409, 'CONFLICT', details);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
/**
 * Internal server error
 */
export class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'INTERNAL_SERVER_ERROR');
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}
/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE');
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}
/**
 * Database error
 */
export class DatabaseError extends AppError {
    constructor(message, originalError) {
        super(`Database error: ${message}`, 500, 'DATABASE_ERROR', originalError ? { originalMessage: originalError.message } : undefined);
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
/**
 * Type guard to check if error is AppError
 */
export function isAppError(error) {
    return error instanceof AppError;
}
/**
 * Convert any error to AppError
 */
export function toAppError(error) {
    if (isAppError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return new InternalServerError(error.message);
    }
    return new InternalServerError(String(error));
}
//# sourceMappingURL=errors.js.map