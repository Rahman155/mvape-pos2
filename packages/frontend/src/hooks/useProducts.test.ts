/**
 * useProducts Hook Tests
 * Tests for product search, listing, and fetching functionality
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useProducts } from './useProducts';
import { apiService } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  apiService: {
    products: {
      search: jest.fn(),
      get: jest.fn(),
    },
  },
  getErrorMessage: jest.fn((error) => {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }),
}));

describe('useProducts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search()', () => {
    it('should search products by query term', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'prod-1',
              name: 'Vape Juice 30ml',
              sku: 'VJ-30ML-001',
              category: 'Juice',
              costPrice: 15000,
              sellingPrice: 25000,
              description: 'Premium vape juice',
              imageUrl: null,
              isActive: true,
              quantity: 50,
              reserved: 0,
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            pages: 1,
          },
        },
      };

      (apiService.products.search as jest.Mock).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      await waitFor(() => {
        result.current.search('juice');
      });

      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0].name).toBe('Vape Juice 30ml');
      expect(result.current.total).toBe(1);
      expect(result.current.loading).toBe(false);
    });

    it('should handle search errors', async () => {
      const errorMessage = 'Search failed';
      (apiService.products.search as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      await waitFor(() => {
        result.current.search('invalid');
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.products).toEqual([]);
    });

    it('should respect pagination parameters', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: {
            total: 100,
            page: 2,
            limit: 20,
            pages: 5,
          },
        },
      };

      (apiService.products.search as jest.Mock).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      await waitFor(() => {
        result.current.search('test', 20, 20);
      });

      expect(result.current.page).toBe(2);
      expect(result.current.limit).toBe(20);
      expect(result.current.pages).toBe(5);
      expect(result.current.total).toBe(100);
    });

    it('should filter by category', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 1 },
        },
      };

      (apiService.products.search as jest.Mock).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      await waitFor(() => {
        result.current.search('', undefined, undefined, 'Juice');
      });

      expect(apiService.products.search).toHaveBeenCalledWith({
        q: '',
        storeId: 'store-123',
        limit: 20,
        offset: 0,
        category: 'Juice',
      });
    });

    it('should set loading state correctly', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 1 },
        },
      };

      let resolveSearch: () => void;
      const searchPromise = new Promise<void>((resolve) => {
        resolveSearch = resolve;
      });

      (apiService.products.search as jest.Mock).mockReturnValueOnce(
        searchPromise.then(() => mockResponse)
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      expect(result.current.loading).toBe(false);

      const searchPromiseInternal = result.current.search('test');

      // Initially loading should be true
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      resolveSearch!();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('list()', () => {
    it('should list all products without search query', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'prod-1',
              name: 'Product 1',
              sku: 'P1',
              category: 'Test',
              costPrice: 10000,
              sellingPrice: 15000,
              description: 'Test product',
              imageUrl: null,
              isActive: true,
              quantity: 100,
              reserved: 0,
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            pages: 1,
          },
        },
      };

      (apiService.products.search as jest.Mock).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      await waitFor(() => {
        result.current.list();
      });

      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0].name).toBe('Product 1');
    });

    it('should respect custom limit and offset', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: { total: 100, page: 2, limit: 50, pages: 2 },
        },
      };

      (apiService.products.search as jest.Mock).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      await waitFor(() => {
        result.current.list(50, 50);
      });

      expect(result.current.limit).toBe(50);
      expect(result.current.page).toBe(2);
    });
  });

  describe('getProduct()', () => {
    it('should fetch a single product by ID', async () => {
      const mockProduct = {
        data: {
          data: {
            id: 'prod-1',
            name: 'Single Product',
            sku: 'SP-001',
            category: 'Test',
            costPrice: 15000,
            sellingPrice: 25000,
            description: 'Single product',
            imageUrl: 'https://example.com/image.jpg',
            isActive: true,
            quantity: 50,
            reserved: 0,
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };

      (apiService.products.get as jest.Mock).mockResolvedValueOnce(
        mockProduct
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      let product = null;
      await waitFor(async () => {
        product = await result.current.getProduct('prod-1');
      });

      expect(product).toEqual(mockProduct.data.data);
    });

    it('should handle product fetch errors', async () => {
      (apiService.products.get as jest.Mock).mockRejectedValueOnce(
        new Error('Product not found')
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      let product = null;
      await waitFor(async () => {
        product = await result.current.getProduct('nonexistent');
      });

      expect(product).toBeNull();
      expect(result.current.error).toBe('Product not found');
    });
  });

  describe('reset()', () => {
    it('should reset all state to initial values', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'prod-1', name: 'Product' }],
          pagination: { total: 1, page: 1, limit: 20, pages: 1 },
        },
      };

      (apiService.products.search as jest.Mock).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() => useProducts({ storeId: 'store-123' }));

      await waitFor(() => {
        result.current.search('test');
      });

      expect(result.current.products).toHaveLength(1);
      expect(result.current.total).toBe(1);

      result.current.reset();

      expect(result.current.products).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.page).toBe(1);
      expect(result.current.pages).toBe(1);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Initialization', () => {
    it('should use custom initial limit', () => {
      const { result } = renderHook(() =>
        useProducts({ storeId: 'store-123', initialLimit: 50 })
      );

      expect(result.current.limit).toBe(50);
    });

    it('should handle missing storeId gracefully', () => {
      const { result } = renderHook(() => useProducts());

      expect(result.current.products).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Store context', () => {
    it('should use storeId from params in API calls', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 1 },
        },
      };

      (apiService.products.search as jest.Mock).mockResolvedValueOnce(
        mockResponse
      );

      const { result } = renderHook(() =>
        useProducts({ storeId: 'custom-store' })
      );

      await waitFor(() => {
        result.current.search('test');
      });

      expect(apiService.products.search).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'custom-store',
        })
      );
    });
  });
});
