import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/index.js';

/**
 * Send a successful API response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  requestId?: string
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  });
}

/**
 * Send a paginated API response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  },
  statusCode: number = 200,
  requestId?: string
): Response<PaginatedResponse<T>> {
  return res.status(statusCode).json({
    data,
    pagination,
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  });
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  requestId?: string
): Response<ApiResponse<T>> {
  return sendSuccess(res, data, 201, requestId);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Send an accepted response (202)
 */
export function sendAccepted<T>(
  res: Response,
  data?: T,
  requestId?: string
): Response {
  if (data) {
    return sendSuccess(res, data, 202, requestId);
  }
  return res.status(202).send();
}

/**
 * Helper to calculate pagination info
 */
export function calculatePagination(
  total: number,
  page: number = 1,
  pageSize: number = 20
): {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  skip: number;
} {
  const pages = Math.ceil(total / pageSize);
  const validPage = Math.max(1, Math.min(page, pages || 1));
  const skip = (validPage - 1) * pageSize;

  return {
    total,
    page: validPage,
    pageSize,
    pages: pages || 0,
    skip,
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: number | string,
  pageSize?: number | string,
  maxPageSize: number = 100
): { page: number; pageSize: number } {
  let parsedPage = 1;
  let parsedPageSize = 20;

  if (page !== undefined) {
    parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
  }

  if (pageSize !== undefined) {
    parsedPageSize = Math.max(
      1,
      Math.min(parseInt(String(pageSize), 10) || 20, maxPageSize)
    );
  }

  return { page: parsedPage, pageSize: parsedPageSize };
}
