/**
 * Type definitions for the backend API
 */

import './express.js';

// UUID type
export type UUID = string;

// API Response types
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, unknown>;
    stack?: string;
  };
  requestId?: string;
}

// User types
export type UserRole = 'KASIR' | 'OWNER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  storeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

// Store types
export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  operatingHours?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  skip?: number;
  limit?: number;
}

// Sort options
export interface SortOptions {
  field: string;
  order: 'ASC' | 'DESC';
}

// Filter options
export interface FilterOptions {
  [key: string]: unknown;
}

// Query options combining all
export interface QueryOptions extends PaginationOptions {
  sort?: SortOptions;
  filter?: FilterOptions;
}
