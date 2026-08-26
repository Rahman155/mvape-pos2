/**
 * Product Grid Component
 * Displays products in a responsive grid layout for POS system
 */

'use client';

import React, { useState } from 'react';
import { ProductWithStock } from '@/types';
import Button from '@/components/ui/Button';
import { ShoppingCart, AlertCircle, Package } from 'lucide-react';

interface ProductGridProps {
  products: ProductWithStock[];
  loading?: boolean;
  error?: string | null;
  onProductSelect?: (product: ProductWithStock) => void;
  onAddToCart?: (product: ProductWithStock, quantity: number) => void;
}

/**
 * Formats currency in Indonesian Rupiah
 */
const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
};

/**
 * ProductCard - Individual product card component
 */
const ProductCard: React.FC<{
  product: ProductWithStock;
  onAddToCart?: (product: ProductWithStock, quantity: number) => void;
  onSelect?: (product: ProductWithStock) => void;
}> = ({ product, onAddToCart, onSelect }) => {
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity);
      setQuantity(1); // Reset quantity after adding
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Product Image */}
      <div className="relative bg-gray-100 dark:bg-gray-700 h-40 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <Package className="w-12 h-12 mb-2" />
            <span className="text-xs">No Image</span>
          </div>
        )}

        {/* Stock Badge */}
        <div className="absolute top-2 right-2">
          {product.isAvailable ? (
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              In Stock ({product.quantity})
            </span>
          ) : (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
          {product.name}
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          SKU: {product.sku}
        </p>

        {product.category && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {product.category}
          </p>
        )}

        {/* Price */}
        <div className="mb-3">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(product.sellingPrice)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {product.isAvailable ? (
            <>
              <div className="flex-1 flex items-center gap-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.quantity}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(
                      Math.max(1, Math.min(val || 1, product.quantity))
                    );
                  }}
                  className="flex-1 text-center px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() =>
                    setQuantity(Math.min(product.quantity, quantity + 1))
                  }
                  className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  +
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Add
              </Button>
            </>
          ) : (
            <Button
              disabled
              className="w-full bg-gray-400 cursor-not-allowed"
              size="sm"
            >
              Out of Stock
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ProductGrid Component
 */
export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  error = null,
  onProductSelect,
  onAddToCart,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error loading products
          </p>
          <p className="text-red-500 dark:text-red-300 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            No products found
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => onProductSelect?.(product)}
          className="cursor-pointer"
        >
          <ProductCard
            product={product}
            onAddToCart={onAddToCart}
            onSelect={onProductSelect}
          />
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
