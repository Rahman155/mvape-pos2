/**
 * Hook for managing product search and listing
 */

import { useState, useCallback, useEffect } from 'react';
import { apiService, getErrorMessage } from '@/lib/api';
import { ProductWithStock } from '@/types';

interface UseProductsParams {
  storeId?: string;
  initialLimit?: number;
}

interface UseProductsResult {
  products: ProductWithStock[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  loading: boolean;
  error: string | null;
  search: (query: string, limit?: number, offset?: number, category?: string) => Promise<void>;
  list: (limit?: number, offset?: number, category?: string) => Promise<void>;
  getProduct: (id: string) => Promise<ProductWithStock | null>;
  reset: () => void;
}

/**
 * Hook to manage product search, listing, and fetching
 *
 * @param params Configuration parameters
 * @returns Product management methods and state
 *
 * @example
 * const {
 *   products,
 *   total,
 *   page,
 *   pages,
 *   loading,
 *   error,
 *   search,
 *   list,
 * } = useProducts({ storeId: 'store-123', initialLimit: 20 });
 *
 * // Search products
 * await search('vape juice');
 *
 * // List all products
 * await list();
 */
export function useProducts(
  params?: UseProductsParams
): UseProductsResult {
  const { storeId, initialLimit = 20 } = params || {};

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search for products by query term
   */
  const search = useCallback(
    async (
      query: string,
      searchLimit?: number,
      offset?: number,
      category?: string
    ) => {
      try {
        setLoading(true);
        setError(null);

        const finalLimit = searchLimit || initialLimit;
        const finalOffset = offset ?? 0;

        const response = await apiService.products.search({
          q: query,
          storeId,
          limit: finalLimit,
          offset: finalOffset,
          category,
        });

        const { data, pagination } = response.data;

        setProducts(data);
        setTotal(pagination.total);
        setPage(pagination.page);
        setPages(pagination.pages);
        setLimit(finalLimit);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        console.error('Error searching products:', err);
      } finally {
        setLoading(false);
      }
    },
    [initialLimit, storeId]
  );

  /**
   * List all products without search query
   */
  const list = useCallback(
    async (listLimit?: number, offset?: number, category?: string) => {
      try {
        setLoading(true);
        setError(null);

        const finalLimit = listLimit || initialLimit;
        const finalOffset = offset ?? 0;

        const response = await apiService.products.search({
          storeId,
          limit: finalLimit,
          offset: finalOffset,
          category,
        });

        const { data, pagination } = response.data;

        setProducts(data);
        setTotal(pagination.total);
        setPage(pagination.page);
        setPages(pagination.pages);
        setLimit(finalLimit);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        console.error('Error listing products:', err);
      } finally {
        setLoading(false);
      }
    },
    [initialLimit, storeId]
  );

  /**
   * Get a single product by ID
   */
  const getProduct = useCallback(
    async (id: string): Promise<ProductWithStock | null> => {
      try {
        setError(null);

        const response = await apiService.products.get(id);
        return response.data.data as ProductWithStock;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        console.error('Error fetching product:', err);
        return null;
      }
    },
    []
  );

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setProducts([]);
    setTotal(0);
    setPage(1);
    setPages(1);
    setLimit(initialLimit);
    setLoading(false);
    setError(null);
  }, [initialLimit]);

  return {
    products,
    total,
    page,
    pages,
    limit,
    loading,
    error,
    search,
    list,
    getProduct,
    reset,
  };
}

export default useProducts;
