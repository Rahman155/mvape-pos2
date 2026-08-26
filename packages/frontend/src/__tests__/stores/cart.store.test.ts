/**
 * Cart store tests
 * Tests for shopping cart state management and operations
 */

import { useCartStore, getCartState, getCartItem, isProductInCart, CartItem } from '@/stores/cart.store';
import { ProductWithStock } from '@/types';

describe('Cart Store', () => {
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

  const mockUnavailableProduct: ProductWithStock = {
    id: 'prod-3',
    name: 'Unavailable Product',
    sku: 'SKU003',
    category: 'Category 1',
    costPrice: 20000,
    sellingPrice: 40000,
    description: 'Unavailable product',
    imageUrl: 'https://example.com/image3.jpg',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    quantity: 0,
    reserved: 0,
    isAvailable: false,
  };

  describe('addItem', () => {
    it('should add item to empty cart', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe('prod-1');
      expect(items[0].quantity).toBe(2);
      expect(items[0].subtotal).toBe(200000); // 2 * 100000
      expect(total).toBe(200000);
      expect(itemCount).toBe(2);
    });

    it('should add multiple different items to cart', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 2);
      addItem(mockProduct2, 1);

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(2);
      expect(total).toBe(260000); // (2 * 100000) + (1 * 60000)
      expect(itemCount).toBe(3);
    });

    it('should increment quantity if item already exists', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 2);
      addItem(mockProduct1, 3);

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(5);
      expect(items[0].subtotal).toBe(500000); // 5 * 100000
      expect(total).toBe(500000);
      expect(itemCount).toBe(5);
    });

    it('should not add item with quantity 0', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 0);

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(0);
    });

    it('should not add item with negative quantity', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, -5);

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(0);
    });

    it('should not add unavailable product', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockUnavailableProduct, 1);

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(0);
    });

    it('should preserve cart item properties', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 1);

      const { items } = useCartStore.getState();
      const item = items[0];

      expect(item.productId).toBe(mockProduct1.id);
      expect(item.productName).toBe(mockProduct1.name);
      expect(item.sku).toBe(mockProduct1.sku);
      expect(item.sellingPrice).toBe(mockProduct1.sellingPrice);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { addItem, removeItem } = useCartStore.getState();
      addItem(mockProduct1, 2);
      addItem(mockProduct2, 1);

      removeItem('prod-1');

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe('prod-2');
      expect(total).toBe(60000);
      expect(itemCount).toBe(1);
    });

    it('should handle removing non-existent item', () => {
      const { addItem, removeItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      removeItem('non-existent');

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(total).toBe(200000);
      expect(itemCount).toBe(2);
    });

    it('should remove item from multi-item cart', () => {
      const { addItem, removeItem } = useCartStore.getState();
      addItem(mockProduct1, 2);
      addItem(mockProduct2, 3);

      removeItem('prod-2');

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(total).toBe(200000);
      expect(itemCount).toBe(2);
    });

    it('should result in empty cart when removing last item', () => {
      const { addItem, removeItem } = useCartStore.getState();
      addItem(mockProduct1, 1);

      removeItem('prod-1');

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(0);
      expect(total).toBe(0);
      expect(itemCount).toBe(0);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity', () => {
      const { addItem, updateItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      updateItem('prod-1', 5);

      const { items, total, itemCount } = useCartStore.getState();
      expect(items[0].quantity).toBe(5);
      expect(items[0].subtotal).toBe(500000); // 5 * 100000
      expect(total).toBe(500000);
      expect(itemCount).toBe(5);
    });

    it('should remove item when quantity set to 0', () => {
      const { addItem, updateItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      updateItem('prod-1', 0);

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(0);
      expect(total).toBe(0);
      expect(itemCount).toBe(0);
    });

    it('should remove item when quantity set to negative', () => {
      const { addItem, updateItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      updateItem('prod-1', -1);

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(0);
      expect(total).toBe(0);
      expect(itemCount).toBe(0);
    });

    it('should handle updating non-existent item', () => {
      const { addItem, updateItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      updateItem('non-existent', 5);

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(total).toBe(200000);
      expect(itemCount).toBe(2);
    });

    it('should update item in multi-item cart', () => {
      const { addItem, updateItem } = useCartStore.getState();
      addItem(mockProduct1, 2);
      addItem(mockProduct2, 1);

      updateItem('prod-1', 4);

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(2);
      expect(total).toBe(460000); // (4 * 100000) + (1 * 60000)
      expect(itemCount).toBe(5);
    });

    it('should recalculate subtotal correctly', () => {
      const { addItem, updateItem } = useCartStore.getState();
      addItem(mockProduct1, 1);

      updateItem('prod-1', 10);

      const { items } = useCartStore.getState();
      expect(items[0].subtotal).toBe(1000000); // 10 * 100000
    });
  });

  describe('clearCart', () => {
    it('should remove all items from cart', () => {
      const { addItem, clearCart } = useCartStore.getState();
      addItem(mockProduct1, 2);
      addItem(mockProduct2, 3);

      clearCart();

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(0);
      expect(total).toBe(0);
      expect(itemCount).toBe(0);
    });

    it('should handle clearing empty cart', () => {
      const { clearCart } = useCartStore.getState();

      clearCart();

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(0);
      expect(total).toBe(0);
      expect(itemCount).toBe(0);
    });
  });

  describe('Calculations', () => {
    it('should calculate correct total with multiple items', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 2); // 200000
      addItem(mockProduct2, 3); // 180000
      // Total: 380000

      const { total } = useCartStore.getState();
      expect(total).toBe(380000);
    });

    it('should calculate correct item count', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 5);
      addItem(mockProduct2, 3);

      const { itemCount } = useCartStore.getState();
      expect(itemCount).toBe(8);
    });

    it('should handle decimal prices correctly', () => {
      const productWithDecimal: ProductWithStock = {
        ...mockProduct1,
        sellingPrice: 99999.99,
      };

      const { addItem } = useCartStore.getState();
      addItem(productWithDecimal, 1);

      const { total } = useCartStore.getState();
      expect(total).toBe(99999.99);
    });

    it('should update calculations when item is removed', () => {
      const { addItem, removeItem } = useCartStore.getState();
      addItem(mockProduct1, 2); // 200000
      addItem(mockProduct2, 1); // 60000
      // Initial total: 260000

      removeItem('prod-2');

      const { total, itemCount } = useCartStore.getState();
      expect(total).toBe(200000);
      expect(itemCount).toBe(2);
    });

    it('should update calculations when item is updated', () => {
      const { addItem, updateItem } = useCartStore.getState();
      addItem(mockProduct1, 2); // 200000
      addItem(mockProduct2, 1); // 60000
      // Initial total: 260000

      updateItem('prod-1', 3); // Change to 300000

      const { total, itemCount } = useCartStore.getState();
      expect(total).toBe(360000);
      expect(itemCount).toBe(4);
    });
  });

  describe('getCartState', () => {
    it('should return current cart state without subscription', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      const state = getCartState();
      expect(state.items).toHaveLength(1);
      expect(state.total).toBe(200000);
      expect(state.itemCount).toBe(2);
    });

    it('should return non-reactive snapshot', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 1);

      const state1 = getCartState();
      const state2 = getCartState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getCartItem', () => {
    it('should return cart item by product ID', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      const item = getCartItem('prod-1');
      expect(item).toBeDefined();
      expect(item?.productId).toBe('prod-1');
      expect(item?.quantity).toBe(2);
    });

    it('should return undefined for non-existent item', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 1);

      const item = getCartItem('non-existent');
      expect(item).toBeUndefined();
    });

    it('should return correct item from multi-item cart', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 2);
      addItem(mockProduct2, 3);

      const item = getCartItem('prod-2');
      expect(item?.productId).toBe('prod-2');
      expect(item?.quantity).toBe(3);
    });
  });

  describe('isProductInCart', () => {
    it('should return true for product in cart', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 1);

      expect(isProductInCart('prod-1')).toBe(true);
    });

    it('should return false for product not in cart', () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 1);

      expect(isProductInCart('prod-2')).toBe(false);
    });

    it('should return false for empty cart', () => {
      expect(isProductInCart('prod-1')).toBe(false);
    });

    it('should return false after item is removed', () => {
      const { addItem, removeItem } = useCartStore.getState();
      addItem(mockProduct1, 1);
      removeItem('prod-1');

      expect(isProductInCart('prod-1')).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should persist cart to localStorage', async () => {
      const { addItem } = useCartStore.getState();
      addItem(mockProduct1, 2);

      // Wait for persistence
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stored = localStorage.getItem('cart-store');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.items).toHaveLength(1);
        expect(parsed.state.items[0].productId).toBe('prod-1');
      }
    });

    it('should restore state from localStorage on init', () => {
      const testItem: CartItem = {
        productId: 'prod-1',
        productName: 'Test Product',
        sku: 'SKU001',
        quantity: 2,
        sellingPrice: 100000,
        subtotal: 200000,
      };

      const testData = {
        state: {
          items: [testItem],
        },
      };

      localStorage.setItem('cart-store', JSON.stringify(testData));

      const state = getCartState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productId).toBe('prod-1');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle add, update, remove sequence', () => {
      const { addItem, updateItem, removeItem } = useCartStore.getState();

      // Add items
      addItem(mockProduct1, 2);
      addItem(mockProduct2, 1);
      expect(useCartStore.getState().total).toBe(260000);

      // Update quantity
      updateItem('prod-1', 4);
      expect(useCartStore.getState().total).toBe(460000);

      // Remove item
      removeItem('prod-2');
      expect(useCartStore.getState().total).toBe(400000);
    });

    it('should maintain correct totals through multiple operations', () => {
      const { addItem, updateItem, removeItem } = useCartStore.getState();

      addItem(mockProduct1, 1); // 100000
      addItem(mockProduct2, 1); // 60000
      // Total: 160000

      updateItem('prod-1', 2); // 200000
      // Total: 260000

      addItem(mockProduct1, 1); // Already exists, becomes 3
      // Total: 300000 + 60000 = 360000

      removeItem('prod-2');
      // Total: 300000

      expect(useCartStore.getState().total).toBe(300000);
      expect(useCartStore.getState().itemCount).toBe(3);
    });

    it('should handle rapid add operations', () => {
      const { addItem } = useCartStore.getState();

      for (let i = 0; i < 5; i++) {
        addItem(mockProduct1, 1);
      }

      const { items, total, itemCount } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(5);
      expect(total).toBe(500000);
      expect(itemCount).toBe(5);
    });
  });
});
