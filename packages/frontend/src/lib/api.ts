import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000', 10);

let apiInstance: AxiosInstance | null = null;

/**
 * Initialize API client with default configuration
 */
export function initializeApiClient(): AxiosInstance {
  if (apiInstance) {
    return apiInstance;
  }

  apiInstance = axios.create({
    baseURL: API_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  apiInstance.interceptors.request.use(
    (config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  apiInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Handle unauthorized - clear auth and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return apiInstance;
}

/**
 * Get or initialize API client
 */
export function getApiClient(): AxiosInstance {
  if (!apiInstance) {
    initializeApiClient();
  }
  return apiInstance!;
}

/**
 * Helper function to handle API errors
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * API service methods
 */
export const apiService = {
  /**
   * Authentication endpoints
   */
  auth: {
    login: (username: string, password: string) =>
      getApiClient().post('/auth/login', { username, password }),
    logout: () =>
      getApiClient().post('/auth/logout'),
    refresh: (refreshToken: string) =>
      getApiClient().post('/auth/refresh', { refreshToken }),
  },

  /**
   * Dashboard endpoints
   */
  dashboard: {
    kasir: (params?: Record<string, unknown>) =>
      getApiClient().get('/dashboard/kasir/daily-stats', { params }),
    owner: (params?: Record<string, unknown>) =>
      getApiClient().get('/dashboard/owner/summary', { params }),
  },

  /**
   * Product endpoints
   */
  products: {
    list: (params?: Record<string, unknown>) =>
      getApiClient().get('/products', { params }),
    search: (params?: Record<string, unknown>) =>
      getApiClient().get('/products/search', { params }),
    get: (id: string) =>
      getApiClient().get(`/products/${id}`),
  },

  /**
   * Transaction endpoints
   */
  transactions: {
    create: (data: unknown) =>
      getApiClient().post('/transactions', data),
    list: (params?: Record<string, unknown>) =>
      getApiClient().get('/transactions', { params }),
    get: (id: string) =>
      getApiClient().get(`/transactions/${id}`),
    update: (id: string, data: unknown) =>
      getApiClient().put(`/transactions/${id}`, data),
  },

  /**
   * Member endpoints
   */
  members: {
    list: (params?: Record<string, unknown>) =>
      getApiClient().get('/members', { params }),
    get: (id: string) =>
      getApiClient().get(`/members/${id}`),
    create: (data: unknown) =>
      getApiClient().post('/members', data),
    update: (id: string, data: unknown) =>
      getApiClient().put(`/members/${id}`, data),
    updateCredit: (id: string, data: unknown) =>
      getApiClient().put(`/members/${id}/credit`, data),
    topup: (id: string, data: unknown) =>
      getApiClient().post(`/members/${id}/topup`, data),
  },

  /**
   * Store endpoints
   */
  stores: {
    list: () =>
      getApiClient().get('/stores'),
    get: (id: string) =>
      getApiClient().get(`/stores/${id}`),
    create: (data: unknown) =>
      getApiClient().post('/stores', data),
    update: (id: string, data: unknown) =>
      getApiClient().put(`/stores/${id}`, data),
    uploadLogo: (id: string, file: FormData) =>
      getApiClient().post(`/stores/${id}/logo`, file, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  },

  /**
   * Inventory endpoints
   */
  inventory: {
    list: (params?: Record<string, unknown>) =>
      getApiClient().get('/inventory', { params }),
    get: (id: string) =>
      getApiClient().get(`/inventory/${id}`),
    distribution: () =>
      getApiClient().get('/inventory/distribution'),
  },

  /**
   * BOP endpoints
   */
  bop: {
    list: (params?: Record<string, unknown>) =>
      getApiClient().get('/bop', { params }),
    create: (data: unknown) =>
      getApiClient().post('/bop', data),
    get: (id: string) =>
      getApiClient().get(`/bop/${id}`),
    update: (id: string, data: unknown) =>
      getApiClient().put(`/bop/${id}`, data),
  },

  /**
   * Reports endpoints
   */
  reports: {
    daily: (params?: Record<string, unknown>) =>
      getApiClient().get('/reports/daily', { params }),
    weekly: (params?: Record<string, unknown>) =>
      getApiClient().get('/reports/weekly', { params }),
    monthly: (params?: Record<string, unknown>) =>
      getApiClient().get('/reports/monthly', { params }),
    financial: (params?: Record<string, unknown>) =>
      getApiClient().get('/reports/financial', { params }),
    capital: (params?: Record<string, unknown>) =>
      getApiClient().get('/reports/capital', { params }),
    bop: (params?: Record<string, unknown>) =>
      getApiClient().get('/reports/bop', { params }),
    attendance: (params?: Record<string, unknown>) =>
      getApiClient().get('/reports/attendance', { params }),
  },
};
