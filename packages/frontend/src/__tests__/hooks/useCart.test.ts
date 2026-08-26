/**
 * useCart hook tests
 * Tests for shopping cart hook and its integration with the store
 */

import { renderHook, act } from '@testing-library/react';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cart.store';
import { ProductWithStock } from '@/types';

describe('useCart Hook', () => {
  beforeEach(() => {
    // Reset store before each test
    useCartStore.setState({
      items: [],
      total: 0,
      itemCount: 0,
    });
  });

  const mockProduct1: ProductWithStock = {
    id: 'prod-1',
    name: 'Product 1',
    sku: 'SKU001',
    category: 'Category 1',
    costPrice: 50000,
    sellingPrice: 100000,
    description: 'Test product 1',
    imageUrl: 'https://example.com/image1.jpg',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    quantity: 10,
    reserved: 0,
    isAvailable: true,
  };

  const mockProduct2: ProductWithStock = {
    id: 'prod-2',
    name: 'Product 2',
    sku: 'SKU002',
    category: 'Category 1',
    costPrice: 30000,
    sellingPrice: 60000,
    description: 'Test product 2',
    imageUrl: 'https://example.com/image2.jpg',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    quantity: 5,
    reserved: 0,
    isAvailable: true,
  };

  describe('Hook initialization', () => {
    it('should return cart state', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.hasItems).toBe(false);
    });

    it('should return all cart methods', () => {
      const { result } = renderHook(() => useCart());

      expect(typeof result.current.addItem).toBe('function');
      expect(typeof result.current.removeItem).toBe('function');
      expect(typeof result.current.updateItem).toBe('function');
      expect(typeof result.current.clearCart).toBe('function');
    });
  });

  describe('addItem', () => {
    it('should add item to cart', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productId).toBe('prod-1');
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.total).toBe(200000);
      expect(result.current.itemCount).toBe(2);
    });

    it('should update isEmpty and hasItems', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.isEmpty).toBe(true);
      expect(result.current.hasItems).toBe(false);

      act(() => {
        result.current.addItem(mockProduct1, 1);
      });

      expect(result.current.isEmpty).toBe(false);
      expect(result.current.hasItems).toBe(true);
    });

    it('should provide memoized addItem callback', () => {
      const { result, rerender } = renderHook(() => useCart());

      const addItem1 = result.current.addItem;

      rerender();

      const addItem2 = result.current.addItem;

      expect(addItem1).toBe(addItem2);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.removeItem('prod-1');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productId).toBe('prod-2');
      expect(result.current.total).toBe(60000);
    });

    it('should update isEmpty and hasItems', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 1);
      });

      expect(result.current.isEmpty).toBe(false);

      act(() => {
        result.current.removeItem('prod-1');
      });

      expect(result.current.isEmpty).toBe(true);
      expect(result.current.hasItems).toBe(false);
    });

    it('should provide memoized removeItem callback', () => {
      const { result, rerender } = renderHook(() => useCart());

      const removeItem1 = result.current.removeItem;

      rerender();

      const removeItem2 = result.current.removeItem;

      expect(removeItem1).toBe(removeItem2);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.updateItem('prod-1', 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.items[0].subtotal).toBe(500000);
      expect(result.current.total).toBe(500000);
      expect(result.current.itemCount).toBe(5);
    });

    it('should provide memoized updateItem callback', () => {
      const { result, rerender } = renderHook(() => useCart());

      const updateItem1 = result.current.updateItem;

      rerender();

      const updateItem2 = result.current.updateItem;

      expect(updateItem1).toBe(updateItem2);
    });
  });

  describe('clearCart', () => {
    it('should remove all items', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should provide memoized clearCart callback', () => {
      const { result, rerender } = renderHook(() => useCart());

      const clearCart1 = result.current.clearCart;

      rerender();

      const clearCart2 = result.current.clearCart;

      expect(clearCart1).toBe(clearCart2);
    });
  });

  describe('Cart properties', () => {
    it('should reflect isEmpty correctly', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.isEmpty).toBe(true);

      act(() => {
        result.current.addItem(mockProduct1, 1);
      });

      expect(result.current.isEmpty).toBe(false);

      act(() => {
        result.current.removeItem('prod-1');
      });

      expect(result.current.isEmpty).toBe(true);
    });

    it('should reflect hasItems correctly', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.hasItems).toBe(false);

      act(() => {
        result.current.addItem(mockProduct1, 1);
      });

      expect(result.current.hasItems).toBe(true);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.hasItems).toBe(false);
    });
  });

  describe('State consistency', () => {
    it('should maintain consistent total and itemCount', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 3);
      });

      // Total should be (2 * 100000) + (3 * 60000) = 380000
      expect(result.current.total).toBe(380000);
      // ItemCount should be 2 + 3 = 5
      expect(result.current.itemCount).toBe(5);

      act(() => {
        result.current.updateItem('prod-1', 4);
      });

      // Total should be (4 * 100000) + (3 * 60000) = 580000
      expect(result.current.total).toBe(580000);
      // ItemCount should be 4 + 3 = 7
      expect(result.current.itemCount).toBe(7);
    });

    it('should sync with store changes', () => {
      const { result } = renderHook(() => useCart());

      // Change store directly
      act(() => {
        useCartStore.getState().addItem(mockProduct1, 2);
      });

      // Hook should reflect the change
      expect(result.current.items).toHaveLength(1);
      expect(result.current.total).toBe(200000);
      expect(result.current.itemCount).toBe(2);
    });
  });

  describe('Multiple hook instances', () => {
    it('should share state between multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useCart());
      const { result: result2 } = renderHook(() => useCart());

      act(() => {
        result1.current.addItem(mockProduct1, 2);
      });

      // Both instances should show the same state
      expect(result1.current.items).toHaveLength(1);
      expect(result2.current.items).toHaveLength(1);
      expect(result1.current.total).toBe(result2.current.total);
    });

    it('should react to changes from other hook instances', () => {
      const { result: result1 } = renderHook(() => useCart());
      const { result: result2 } = renderHook(() => useCart());

      act(() => {
        result1.current.addItem(mockProduct1, 2);
      });

      expect(result2.current.items).toHaveLength(1);
      expect(result2.current.total).toBe(200000);

      act(() => {
        result2.current.addItem(mockProduct2, 1);
      });

      expect(result1.current.items).toHaveLength(2);
      expect(result1.current.total).toBe(260000);
    });
  });

  describe('Complex workflows', () => {
    it('should handle add-update-remove workflow', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.total).toBe(260000);
      expect(result.current.itemCount).toBe(3);

      act(() => {
        result.current.updateItem('prod-1', 4);
      });

      expect(result.current.total).toBe(460000);
      expect(result.current.itemCount).toBe(5);

      act(() => {
        result.current.removeItem('prod-2');
      });

      expect(result.current.total).toBe(400000);
      expect(result.current.itemCount).toBe(4);
      expect(result.current.hasItems).toBe(true);

      act(() => {
        result.current.removeItem('prod-1');
      });

      expect(result.current.isEmpty).toBe(true);
      expect(result.current.total).toBe(0);
    });

    it('should handle duplicate adds', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 1);
        result.current.addItem(mockProduct1, 1);
        result.current.addItem(mockProduct1, 1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.total).toBe(300000);
      expect(result.current.itemCount).toBe(3);
    });

    it('should handle clear and readd', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.itemCount).toBe(3);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.isEmpty).toBe(true);
      expect(result.current.itemCount).toBe(0);

      act(() => {
        result.current.addItem(mockProduct1, 3);
      });

      expect(result.current.itemCount).toBe(3);
      expect(result.current.total).toBe(300000);
    });
  });
});
