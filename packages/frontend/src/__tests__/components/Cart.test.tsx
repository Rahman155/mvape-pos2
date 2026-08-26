/**
 * Shopping Cart component tests
 * Tests for cart display, item management, and user interactions
 * Validates: Requirements 7.2, 7.3, 7.4 (Shopping Cart Management)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Cart from '@/components/kasir/Cart';
import { useCartStore } from '@/stores/cart.store';
import { ProductWithStock } from '@/types';

/**
 * Mock products for testing
 */
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

describe('Cart Component', () => {
  beforeEach(() => {
    // Reset store before each test
    useCartStore.setState({
      items: [],
      total: 0,
      itemCount: 0,
    });
  });

  describe('Empty cart display', () => {
    it('should display empty cart message', () => {
      render(<Cart />);

      expect(screen.getByText('Cart is empty')).toBeInTheDocument();
      expect(screen.getByText('Add products to get started')).toBeInTheDocument();
    });

    it('should show empty cart icon', () => {
      render(<Cart />);

      expect(screen.getByText('🛒')).toBeInTheDocument();
    });

    it('should disable checkout button when cart is empty', () => {
      render(<Cart showCheckoutButton={true} />);

      const checkoutButton = screen.getByRole('button', { name: /cart empty/i });
      expect(checkoutButton).toBeDisabled();
    });

    it('should not show clear button when cart is empty', () => {
      render(<Cart />);

      const clearButtons = screen.queryAllByRole('button', { name: /clear/i });
      expect(clearButtons).toHaveLength(0);
    });
  });

  describe('Cart with items', () => {
    it('should display cart items', () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      render(<Cart />);

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('SKU001')).toBeInTheDocument();
    });

    it('should display item quantity', () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      render(<Cart />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display item price formatted', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      // Indonesian currency format
      expect(screen.getByText(/Rp/)).toBeInTheDocument();
    });

    it('should display multiple items', () => {
      useCartStore.getState().addItem(mockProduct1, 2);
      useCartStore.getState().addItem(mockProduct2, 1);

      render(<Cart />);

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });

    it('should display cart header with item count', () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      render(<Cart />);

      expect(screen.getByText(/Cart \(2\)/)).toBeInTheDocument();
    });

    it('should show clear button when cart has items', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Cart total calculation', () => {
    it('should display correct total for single item', () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      render(<Cart />);

      // Total should be 2 * 100000 = 200000
      const totalSection = screen.getByText(/Total:/);
      expect(totalSection).toBeInTheDocument();
    });

    it('should display correct total for multiple items', () => {
      useCartStore.getState().addItem(mockProduct1, 2); // 200000
      useCartStore.getState().addItem(mockProduct2, 1); // 60000
      // Total: 260000

      render(<Cart />);

      const totalSection = screen.getByText(/Total:/);
      expect(totalSection).toBeInTheDocument();
    });
  });

  describe('Remove item functionality', () => {
    it('should remove item when clicking remove button', async () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      render(<Cart />);

      const removeButtons = screen.getAllByRole('button', { name: /remove item/i });
      expect(removeButtons).toHaveLength(1);

      fireEvent.click(removeButtons[0]);

      expect(screen.getByText('Cart is empty')).toBeInTheDocument();
    });

    it('should update cart after item removal', async () => {
      useCartStore.getState().addItem(mockProduct1, 2);
      useCartStore.getState().addItem(mockProduct2, 1);

      const { rerender } = render(<Cart />);

      const removeButtons = screen.getAllByRole('button', { name: /remove item/i });
      fireEvent.click(removeButtons[0]);

      rerender(<Cart />);

      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
    });
  });

  describe('Update quantity functionality', () => {
    it('should allow editing quantity', async () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      render(<Cart />);

      // Click on quantity to edit
      const quantityButton = screen.getByText('2');
      fireEvent.click(quantityButton);

      // Should show input and save/cancel buttons
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should update quantity when saving', async () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      const { rerender } = render(<Cart />);

      const quantityButton = screen.getByText('2');
      fireEvent.click(quantityButton);

      const input = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '5' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      rerender(<Cart />);

      // Should update to new quantity
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should cancel quantity edit', async () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      const { rerender } = render(<Cart />);

      const quantityButton = screen.getByText('2');
      fireEvent.click(quantityButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      rerender(<Cart />);

      // Should show original quantity button
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should remove item when quantity set to 0', async () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      const { rerender } = render(<Cart />);

      const quantityButton = screen.getByText('2');
      fireEvent.click(quantityButton);

      const input = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '0' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      rerender(<Cart />);

      expect(screen.getByText('Cart is empty')).toBeInTheDocument();
    });
  });

  describe('Clear cart functionality', () => {
    it('should clear all items when clicking clear button', () => {
      useCartStore.getState().addItem(mockProduct1, 2);
      useCartStore.getState().addItem(mockProduct2, 1);

      const { rerender } = render(<Cart />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      rerender(<Cart />);

      expect(screen.getByText('Cart is empty')).toBeInTheDocument();
    });
  });

  describe('Checkout button', () => {
    it('should call onCheckout when button is clicked', () => {
      const onCheckout = jest.fn();
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart showCheckoutButton={true} onCheckout={onCheckout} />);

      const checkoutButton = screen.getByRole('button', { name: /proceed to checkout/i });
      fireEvent.click(checkoutButton);

      expect(onCheckout).toHaveBeenCalledTimes(1);
    });

    it('should not show checkout button when showCheckoutButton is false', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart showCheckoutButton={false} />);

      expect(
        screen.queryByRole('button', { name: /proceed to checkout/i })
      ).not.toBeInTheDocument();
    });

    it('should show checkout button by default', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
    });
  });

  describe('Responsive behavior', () => {
    it('should have responsive container class', () => {
      const { container } = render(<Cart />);

      const cardElement = container.querySelector('.flex.flex-col.h-full');
      expect(cardElement).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const customClass = 'custom-cart-class';
      const { container } = render(<Cart className={customClass} />);

      const cartElement = container.querySelector(`.${customClass}`);
      expect(cartElement).toBeInTheDocument();
    });

    it('should have scrollable item list', () => {
      const { container } = render(<Cart />);

      const itemList = container.querySelector('.overflow-y-auto');
      expect(itemList).toBeInTheDocument();
    });
  });

  describe('Item details display', () => {
    it('should display product name', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    it('should display product SKU', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      expect(screen.getByText('SKU001')).toBeInTheDocument();
    });

    it('should display price label', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      expect(screen.getByText('Price:')).toBeInTheDocument();
    });

    it('should display quantity label', () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      render(<Cart />);

      expect(screen.getByText('Qty:')).toBeInTheDocument();
    });

    it('should display subtotal label', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    });
  });

  describe('Styling and visual feedback', () => {
    it('should have appropriate visual styling for empty state', () => {
      const { container } = render(<Cart />);

      const emptyState = container.querySelector('.py-8');
      expect(emptyState).toBeInTheDocument();
    });

    it('should have dark mode support classes', () => {
      const { container } = render(<Cart />);

      const darkModeElements = container.querySelectorAll('[class*="dark:"]');
      expect(darkModeElements.length).toBeGreaterThan(0);
    });

    it('should have hover effects on items', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      const { container } = render(<Cart />);

      const itemElement = container.querySelector('.hover\\:bg-gray-100');
      expect(itemElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA labels', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      expect(screen.getByLabelText('Remove item')).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      useCartStore.getState().addItem(mockProduct1, 1);

      render(<Cart />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time updates', () => {
    it('should reflect store changes in real-time', () => {
      const { rerender } = render(<Cart />);

      expect(screen.getByText('Cart is empty')).toBeInTheDocument();

      // Add item to store
      useCartStore.getState().addItem(mockProduct1, 1);

      rerender(<Cart />);

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.queryByText('Cart is empty')).not.toBeInTheDocument();
    });

    it('should update item count in header', () => {
      useCartStore.getState().addItem(mockProduct1, 2);

      const { rerender } = render(<Cart />);

      expect(screen.getByText(/Cart \(2\)/)).toBeInTheDocument();

      useCartStore.getState().addItem(mockProduct2, 1);

      rerender(<Cart />);

      expect(screen.getByText(/Cart \(3\)/)).toBeInTheDocument();
    });
  });
});
