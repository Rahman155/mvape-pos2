/**
 * useCart hook
 * Provides access to shopping cart state and operations
 */

import { useCallback } from 'react';
import { useCartStore, CartItem } from '@/stores/cart.store';
import { ProductWithStock } from '@/types';

export interface UseCartReturn {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (product: ProductWithStock, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateItem: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isEmpty: boolean;
  hasItems: boolean;
}

/**
 * Hook to access and manage shopping cart state
 * Provides all cart operations with memoized callbacks
 * @returns Cart state and methods
 */
export function useCart(): UseCartReturn {
  const { items, total, itemCount, addItem, removeItem, updateItem, clearCart } =
    useCartStore();

  // Memoized callbacks to ensure stable references
  const memoizedAddItem = useCallback(
    (product: ProductWithStock, quantity: number) => {
      addItem(product, quantity);
    },
    [addItem]
  );

  const memoizedRemoveItem = useCallback(
    (productId: string) => {
      removeItem(productId);
    },
    [removeItem]
  );

  const memoizedUpdateItem = useCallback(
    (productId: string, quantity: number) => {
      updateItem(productId, quantity);
    },
    [updateItem]
  );

  const memoizedClearCart = useCallback(() => {
    clearCart();
  }, [clearCart]);

  return {
    items,
    total,
    itemCount,
    addItem: memoizedAddItem,
    removeItem: memoizedRemoveItem,
    updateItem: memoizedUpdateItem,
    clearCart: memoizedClearCart,
    isEmpty: items.length === 0,
    hasItems: items.length > 0,
  };
}
