/**
 * Shopping cart store using Zustand
 * Manages cart state including items, totals, and calculations
 * Features localStorage persistence for cart recovery
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductWithStock } from '@/types';

/**
 * Represents a single item in the shopping cart
 */
export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  sellingPrice: number;
  subtotal: number; // quantity * sellingPrice
}

/**
 * Cart store state and methods
 */
interface CartState {
  items: CartItem[];
  total: number; // sum of all subtotals
  itemCount: number; // total items in cart

  // Actions
  addItem: (product: ProductWithStock, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateItem: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const INITIAL_STATE = {
  items: [] as CartItem[],
  total: 0,
  itemCount: 0,
};

/**
 * Calculate total from items
 */
const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
};

/**
 * Calculate total item count
 */
const calculateItemCount = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.quantity, 0);
};

/**
 * Global shopping cart store
 * Persists cart to localStorage for recovery across sessions
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      addItem: (product: ProductWithStock, quantity: number) => {
        if (quantity <= 0) {
          console.warn('Cannot add item with quantity <= 0');
          return;
        }

        if (!product.isAvailable) {
          console.warn(`Product ${product.id} is not available`);
          return;
        }

        set((state) => {
          const existingItem = state.items.find((item) => item.productId === product.id);

          let updatedItems: CartItem[];

          if (existingItem) {
            // Update quantity if item already exists
            updatedItems = state.items.map((item) =>
              item.productId === product.id
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    subtotal: (item.quantity + quantity) * item.sellingPrice,
                  }
                : item
            );
          } else {
            // Add new item
            const newItem: CartItem = {
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              quantity,
              sellingPrice: product.sellingPrice,
              subtotal: quantity * product.sellingPrice,
            };
            updatedItems = [...state.items, newItem];
          }

          return {
            items: updatedItems,
            total: calculateTotal(updatedItems),
            itemCount: calculateItemCount(updatedItems),
          };
        });
      },

      removeItem: (productId: string) => {
        set((state) => {
          const updatedItems = state.items.filter((item) => item.productId !== productId);

          return {
            items: updatedItems,
            total: calculateTotal(updatedItems),
            itemCount: calculateItemCount(updatedItems),
          };
        });
      },

      updateItem: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          // If quantity is 0 or negative, remove the item
          set((state) => {
            const updatedItems = state.items.filter((item) => item.productId !== productId);

            return {
              items: updatedItems,
              total: calculateTotal(updatedItems),
              itemCount: calculateItemCount(updatedItems),
            };
          });
          return;
        }

        set((state) => {
          const updatedItems = state.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity,
                  subtotal: quantity * item.sellingPrice,
                }
              : item
          );

          return {
            items: updatedItems,
            total: calculateTotal(updatedItems),
            itemCount: calculateItemCount(updatedItems),
          };
        });
      },

      clearCart: () => {
        set(INITIAL_STATE);
      },
    }),
    {
      name: 'cart-store',
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

/**
 * Get current cart state (non-reactive)
 * Useful for non-component code
 */
export function getCartState() {
  return useCartStore.getState();
}

/**
 * Get cart item by product ID
 */
export function getCartItem(productId: string) {
  const state = useCartStore.getState();
  return state.items.find((item) => item.productId === productId);
}

/**
 * Check if product is in cart
 */
export function isProductInCart(productId: string): boolean {
  const state = useCartStore.getState();
  return state.items.some((item) => item.productId === productId);
}
