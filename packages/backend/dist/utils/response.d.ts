import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/index.js';
/**
 * Send a successful API response
 */
export declare function sendSuccess<T>(res: Response, data: T, statusCode?: number, requestId?: string): Response<ApiResponse<T>>;
/**
 * Send a paginated API response
 */
export declare function sendPaginated<T>(res: Response, data: T[], pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
}, statusCode?: number, requestId?: string): Response<PaginatedResponse<T>>;
/**
 * Send a created response (201)
 */
export declare function sendCreated<T>(res: Response, data: T, requestId?: string): Response<ApiResponse<T>>;
/**
 * Send a no content response (204)
 */
export declare function sendNoContent(res: Response): Response;
/**
 * Send an accepted response (202)
 */
export declare function sendAccepted<T>(res: Response, data?: T, requestId?: string): Response;
/**
 * Helper to calculate pagination info
 */
export declare function calculatePagination(total: number, page?: number, pageSize?: number): {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
    skip: number;
};
/**
 * Validate pagination parameters
 */
export declare function validatePaginationParams(page?: number | string, pageSize?: number | string, maxPageSize?: number): {
    page: number;
    pageSize: number;
};
//# sourceMappingURL=response.d.ts.map