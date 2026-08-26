/**
 * Point of Sale (POS) Page
 * Main page for kasir to browse products and manage transactions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { ProductWithStock } from '@/types';
import ProductSearch from '@/components/kasir/ProductSearch';
import ProductGrid from '@/components/kasir/ProductGrid';
import ProductPagination from '@/components/kasir/ProductPagination';

/**
 * POS Page Component
 */
export default function POSPage() {
  const { user } = useAuth();
  const {
    products,
    total,
    page,
    pages,
    limit,
    loading,
    error,
    search,
    list,
  } = useProducts({
    storeId: user?.storeId,
    initialLimit: 20,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories] = useState<string[]>([
    'Juice',
    'Devices',
    'Accessories',
    'Coils',
    'Batteries',
  ]);

  // Load products on mount
  useEffect(() => {
    list();
  }, []);

  // Handle search with debouncing
  const handleSearch = useCallback(
    (query: string, category?: string) => {
      setSearchTerm(query);
      setSelectedCategory(category || '');

      if (query.trim() || category) {
        search(query, limit, 0, category);
      } else {
        list(limit, 0);
      }
    },
    [search, list, limit]
  );

  // Handle pagination
  const handlePageChange = useCallback(
    (newPage: number) => {
      const offset = (newPage - 1) * limit;
      if (searchTerm || selectedCategory) {
        search(searchTerm, limit, offset, selectedCategory);
      } else {
        list(limit, offset);
      }
    },
    [search, list, limit, searchTerm, selectedCategory]
  );

  // Handle limit change
  const handleLimitChange = useCallback(
    (newLimit: number) => {
      if (searchTerm || selectedCategory) {
        search(searchTerm, newLimit, 0, selectedCategory);
      } else {
        list(newLimit, 0);
      }
    },
    [search, list, searchTerm, selectedCategory]
  );

  const handleProductSelect = (product: ProductWithStock) => {
    console.log('Product selected:', product);
    // This will be implemented in the cart management system (Task 22)
  };

  const handleAddToCart = (product: ProductWithStock, quantity: number) => {
    console.log('Add to cart:', { product, quantity });
    // This will be implemented in the cart management system (Task 22)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Point of Sale
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Browse products and manage your transactions
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search Products
          </h2>
          <ProductSearch
            onSearch={handleSearch}
            categories={categories}
            placeholder="Search by product name or SKU..."
            debounceDelay={300}
          />
        </div>

        {/* Product Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <ProductGrid
            products={products}
            loading={loading}
            error={error}
            onProductSelect={handleProductSelect}
            onAddToCart={handleAddToCart}
          />

          {/* Pagination */}
          {total > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <ProductPagination
                currentPage={page}
                totalPages={pages}
                totalItems={total}
                itemsPerPage={limit}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
