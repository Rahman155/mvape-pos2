/**
 * Product Search Component
 * Provides search and filter functionality for products
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface ProductSearchProps {
  onSearch?: (query: string, category?: string) => void;
  categories?: string[];
  placeholder?: string;
  debounceDelay?: number;
}

/**
 * ProductSearch Component with debouncing
 */
export const ProductSearch: React.FC<ProductSearchProps> = ({
  onSearch,
  categories = [],
  placeholder = 'Search by product name or SKU...',
  debounceDelay = 300,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSearching(false);
      if (onSearch) {
        onSearch(searchQuery, selectedCategory);
      }
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, onSearch, debounceDelay]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setIsSearching(true);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setIsSearching(false);
  }, []);

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCategory(e.target.value);
      setIsSearching(true);
    },
    []
  );

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {selectedCategory && (
            <Button
              onClick={() => setSelectedCategory('')}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              Clear Filter
            </Button>
          )}
        </div>
      )}

      {/* Search Status Indicator */}
      {isSearching && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Searching...
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
