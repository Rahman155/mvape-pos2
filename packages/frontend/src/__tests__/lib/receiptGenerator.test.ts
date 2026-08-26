/**
 * Unit tests for receipt generation
 * Tests receipt formatting with various transaction types, logo scaling, and currency formatting
 * Validates: Requirements 7.10, 20
 */

import {
  formatCurrency,
  formatReceiptDate,
  generateReceiptText,
  generateReceiptHTML,
  generateReceipt,
  wrapText,
  calculateReceiptDimensions,
  scaleLogoForReceipt,
  formatForPrinting,
  validateReceiptData,
} from '@/lib/receiptGenerator';
import { Transaction, TransactionItem, Store, User } from '@/types';

// Test fixtures
const mockUser: User = {
  id: 'user-123',
  username: 'kasir_budi',
  email: 'budi@store.com',
  role: 'KASIR',
  storeId: 'store-1',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLogin: new Date('2024-01-15'),
};

const mockStore: Store = {
  id: 'store-1',
  name: 'Vape Store Pusat',
  address: 'Jl. Merdeka No. 123, Jakarta',
  phone: '021-1234567',
  logoUrl: 'https://example.com/logo.png',
  isActive: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockStoreWithoutLogo: Store = {
  id: 'store-2',
  name: 'Vape Store Cabang',
  address: 'Jl. Sudirman No. 456, Bandung',
  phone: '022-9876543',
  isActive: true,
  createdAt: new Date('2023-06-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTransactionItems: TransactionItem[] = [
  {
    id: 'item-1',
    transactionId: 'txn-123',
    productId: 'Vape Mod Voopoo',
    quantity: 1,
    unitPrice: 450000,
    totalPrice: 450000,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'item-2',
    transactionId: 'txn-123',
    productId: 'Liquid Premium 60ml',
    quantity: 2,
    unitPrice: 85000,
    totalPrice: 170000,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'item-3',
    transactionId: 'txn-123',
    productId: 'Coil Pack (5pcs)',
    quantity: 1,
    unitPrice: 75000,
    totalPrice: 75000,
    createdAt: new Date('2024-01-15'),
  },
];

const mockTransaction: Transaction = {
  id: 'txn-123-abc-def-456',
  storeId: 'store-1',
  kasirId: 'user-123',
  transactionDate: new Date('2024-01-15T14:30:00'),
  totalAmount: 695000,
  paymentMethod: 'CASH',
  status: 'COMPLETED',
  notes: 'Customer satisfied',
  createdAt: new Date('2024-01-15T14:30:00'),
  updatedAt: new Date('2024-01-15T14:30:00'),
  isEdited: false,
  version: 1,
  items: mockTransactionItems,
};

describe('Receipt Generation - Formatting', () => {
  describe('formatCurrency', () => {
    it('should format currency with proper IDR localization', () => {
      expect(formatCurrency(450000)).toBe('Rp 450.000');
      expect(formatCurrency(85000)).toBe('Rp 85.000');
    });

    it('should handle zero amount', () => {
      expect(formatCurrency(0)).toBe('Rp 0');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(1000000)).toBe('Rp 1.000.000');
      expect(formatCurrency(99999999)).toBe('Rp 99.999.999');
    });

    it('should handle small amounts', () => {
      expect(formatCurrency(1)).toBe('Rp 1');
      expect(formatCurrency(999)).toBe('Rp 999');
    });

    it('should remove decimal places for currency', () => {
      expect(formatCurrency(450000.5)).toBe('Rp 450.000');
      expect(formatCurrency(85000.99)).toBe('Rp 85.000');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-450000)).toContain('-');
    });
  });

  describe('formatReceiptDate', () => {
    const testDate = new Date('2024-01-15T14:30:45');

    it('should format date in short format by default', () => {
      const formatted = formatReceiptDate(testDate);
      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
      expect(formatted).toContain('15');
      expect(formatted).toContain('14');
      expect(formatted).toContain('30');
    });

    it('should format date in long format', () => {
      const formatted = formatReceiptDate(testDate, 'long');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('Januari');
    });

    it('should accept string date input', () => {
      const formatted = formatReceiptDate('2024-01-15T14:30:45');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
    });

    it('should handle different dates correctly', () => {
      const date2 = new Date('2024-12-25T23:59:59');
      const formatted = formatReceiptDate(date2);
      expect(formatted).toContain('2024');
      expect(formatted).toContain('12');
      expect(formatted).toContain('25');
    });
  });

  describe('wrapText', () => {
    it('should wrap text to specified width', () => {
      const text = 'This is a long product name that needs wrapping';
      const wrapped = wrapText(text, 20);
      
      expect(wrapped.length).toBeGreaterThan(1);
      wrapped.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(20);
      });
    });

    it('should handle single word longer than width', () => {
      const text = 'Supercalifragilisticexpialidocious';
      const wrapped = wrapText(text, 20);
      
      expect(wrapped[0]).toBe('Supercalifragilisticexpialidocious');
    });

    it('should not split on spaces unnecessarily', () => {
      const text = 'Short text';
      const wrapped = wrapText(text, 20);
      
      expect(wrapped.length).toBe(1);
      expect(wrapped[0]).toBe('Short text');
    });

    it('should handle empty text', () => {
      const wrapped = wrapText('', 20);
      expect(wrapped.length).toBe(0);
    });

    it('should handle text with multiple spaces', () => {
      const text = 'Multiple    spaces    here';
      const wrapped = wrapText(text, 30);
      
      wrapped.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(30);
      });
    });
  });
});

describe('Receipt Generation - Text Format', () => {
  describe('generateReceiptText', () => {
    it('should generate receipt with all required sections', () => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser);
      
      expect(receipt).toContain('Vape Store Pusat');
      expect(receipt).toContain('Jl. Merdeka No. 123, Jakarta');
      expect(receipt).toContain('021-1234567');
      expect(receipt).toContain('txn-123-abc');
      expect(receipt).toContain('CASH');
      expect(receipt).toContain('kasir_budi');
    });

    it('should include all transaction items in receipt', () => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser);
      
      expect(receipt).toContain('Vape Mod Voopoo');
      expect(receipt).toContain('Liquid Premium 60ml');
      expect(receipt).toContain('Coil Pack (5pcs)');
    });

    it('should display correct quantities and prices', () => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser);
      
      expect(receipt).toContain('1'); // Quantity for first item
      expect(receipt).toContain('2'); // Quantity for second item
    });

    it('should calculate and display correct total amount', () => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser);
      
      expect(receipt).toContain('Rp 695.000'); // Total amount
      expect(receipt).toContain('TOTAL');
    });

    it('should include thank you message', () => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser);
      
      expect(receipt).toContain('Thank you for your purchase');
    });

    it('should include store information', () => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser);
      
      expect(receipt).toContain('Receipt ID:');
      expect(receipt).toContain('Date:');
      expect(receipt).toContain('Kasir:');
      expect(receipt).toContain('Payment:');
    });

    it('should handle store without address', () => {
      const storeNoAddress = { ...mockStore, address: undefined };
      const receipt = generateReceiptText(mockTransaction, storeNoAddress, mockUser);
      
      expect(receipt).toContain('Vape Store Pusat');
      expect(receipt).not.toContain('undefined');
    });

    it('should handle store without phone', () => {
      const storeNoPhone = { ...mockStore, phone: undefined };
      const receipt = generateReceiptText(mockTransaction, storeNoPhone, mockUser);
      
      expect(receipt).toContain('Vape Store Pusat');
      expect(receipt).not.toContain('undefined');
    });

    it('should use custom width if provided', () => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser, { width: 50 });
      
      receipt.split('\n').forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(50);
      });
    });

    it('should use provided date format', () => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser, { dateFormat: 'long' });
      
      expect(receipt).toContain('Januari');
    });
  });

  describe('generateReceiptText - Different Transaction Types', () => {
    it('should generate receipt for MEMBER_CREDIT payment', () => {
      const memberTransaction: Transaction = {
        ...mockTransaction,
        paymentMethod: 'MEMBER_CREDIT',
      };
      
      const receipt = generateReceiptText(memberTransaction, mockStore, mockUser);
      expect(receipt).toContain('MEMBER_CREDIT');
    });

    it('should generate receipt for TEMPO payment', () => {
      const tempoTransaction: Transaction = {
        ...mockTransaction,
        paymentMethod: 'TEMPO',
      };
      
      const receipt = generateReceiptText(tempoTransaction, mockStore, mockUser);
      expect(receipt).toContain('TEMPO');
    });

    it('should handle transaction with single item', () => {
      const singleItemTransaction: Transaction = {
        ...mockTransaction,
        totalAmount: 450000,
        items: [mockTransactionItems[0]],
      };
      
      const receipt = generateReceiptText(singleItemTransaction, mockStore, mockUser);
      expect(receipt).toContain('Vape Mod Voopoo');
      expect(receipt).toContain('Rp 450.000');
    });

    it('should handle transaction with many items', () => {
      const manyItemsTransaction: Transaction = {
        ...mockTransaction,
        items: [
          ...mockTransactionItems,
          {
            id: 'item-4',
            transactionId: 'txn-123',
            productId: 'Battery 18650',
            quantity: 4,
            unitPrice: 25000,
            totalPrice: 100000,
            createdAt: new Date('2024-01-15'),
          },
          {
            id: 'item-5',
            transactionId: 'txn-123',
            productId: 'Tank Replacement',
            quantity: 2,
            unitPrice: 60000,
            totalPrice: 120000,
            createdAt: new Date('2024-01-15'),
          },
        ],
        totalAmount: 1115000,
      };
      
      const receipt = generateReceiptText(manyItemsTransaction, mockStore, mockUser);
      expect(receipt).toContain('Battery 18650');
      expect(receipt).toContain('Tank Replacement');
      expect(receipt).toContain('Rp 1.115.000');
    });
  });
});

describe('Receipt Generation - HTML Format', () => {
  describe('generateReceiptHTML', () => {
    it('should generate valid HTML receipt', () => {
      const html = generateReceiptHTML(mockTransaction, mockStore, mockUser);
      
      expect(html).toContain('<div class="receipt"');
      expect(html).toContain('</div>');
      expect(html).toContain('<table');
      expect(html).toContain('</table>');
    });

    it('should include store name in HTML', () => {
      const html = generateReceiptHTML(mockTransaction, mockStore, mockUser);
      
      expect(html).toContain('Vape Store Pusat');
    });

    it('should include transaction items in table', () => {
      const html = generateReceiptHTML(mockTransaction, mockStore, mockUser);
      
      expect(html).toContain('Vape Mod Voopoo');
      expect(html).toContain('Liquid Premium 60ml');
      expect(html).toContain('Coil Pack (5pcs)');
    });

    it('should include formatted totals', () => {
      const html = generateReceiptHTML(mockTransaction, mockStore, mockUser);
      
      expect(html).toContain('TOTAL');
      expect(html).toContain('Rp 695.000');
    });

    it('should properly escape HTML special characters', () => {
      const storeWithSpecialChars: Store = {
        ...mockStore,
        name: 'Store & Company <Ltd>',
        address: 'Address "with" quotes & ampersand',
      };
      
      const html = generateReceiptHTML(mockTransaction, storeWithSpecialChars, mockUser);
      
      expect(html).toContain('&amp;');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
      expect(html).toContain('&quot;');
    });

    it('should handle store without address', () => {
      const storeNoAddress = { ...mockStore, address: undefined };
      const html = generateReceiptHTML(mockTransaction, storeNoAddress, mockUser);
      
      expect(html).toContain('Vape Store Pusat');
      expect(html).not.toContain('undefined');
    });

    it('should handle store without phone', () => {
      const storeNoPhone = { ...mockStore, phone: undefined };
      const html = generateReceiptHTML(mockTransaction, storeNoPhone, mockUser);
      
      expect(html).toContain('Vape Store Pusat');
      expect(html).not.toContain('undefined');
    });

    it('should include receipt metadata', () => {
      const html = generateReceiptHTML(mockTransaction, mockStore, mockUser);
      
      expect(html).toContain('Receipt ID');
      expect(html).toContain('Date');
      expect(html).toContain('Kasir');
      expect(html).toContain('Payment');
    });
  });
});

describe('Receipt Generation - Complete Receipt', () => {
  describe('generateReceipt', () => {
    it('should generate receipt with text, HTML, and lines', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      expect(receipt.text).toBeDefined();
      expect(receipt.html).toBeDefined();
      expect(receipt.lines).toBeDefined();
      expect(Array.isArray(receipt.lines)).toBe(true);
      expect(receipt.lines.length).toBeGreaterThan(0);
    });

    it('should have matching content in text and HTML', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      expect(receipt.text).toContain('Vape Store Pusat');
      expect(receipt.html).toContain('Vape Store Pusat');
      expect(receipt.text).toContain('Rp 695.000');
      expect(receipt.html).toContain('Rp 695.000');
    });

    it('should split text into lines correctly', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      const textLines = receipt.text.split('\n');
      expect(receipt.lines.length).toBe(textLines.length);
      receipt.lines.forEach((line, index) => {
        expect(line).toBe(textLines[index]);
      });
    });

    it('should use config options', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser, {
        width: 50,
        dateFormat: 'long',
      });
      
      expect(receipt.text).toContain('Januari');
    });
  });

  describe('formatForPrinting', () => {
    it('should return printable text format', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const printFormat = formatForPrinting(receipt);
      
      expect(printFormat).toBe(receipt.text);
    });

    it('should preserve line breaks for printing', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const printFormat = formatForPrinting(receipt);
      
      expect(printFormat).toContain('\n');
    });
  });
});

describe('Receipt Generation - Logo Scaling and Positioning', () => {
  describe('scaleLogoForReceipt', () => {
    const logoUrl = 'https://example.com/logo.png';

    it('should return logo with default dimensions', () => {
      const scaled = scaleLogoForReceipt(logoUrl);
      
      expect(scaled.url).toBe(logoUrl);
      expect(scaled.width).toBe(300);
      expect(scaled.height).toBe(150);
    });

    it('should apply custom maxWidth', () => {
      const scaled = scaleLogoForReceipt(logoUrl, { maxWidth: 200 });
      
      expect(scaled.width).toBe(200);
      expect(scaled.height).toBe(150);
    });

    it('should apply custom maxHeight', () => {
      const scaled = scaleLogoForReceipt(logoUrl, { maxHeight: 100 });
      
      expect(scaled.width).toBe(300);
      expect(scaled.height).toBe(100);
    });

    it('should apply both custom dimensions', () => {
      const scaled = scaleLogoForReceipt(logoUrl, { maxWidth: 250, maxHeight: 120 });
      
      expect(scaled.width).toBe(250);
      expect(scaled.height).toBe(120);
    });

    it('should maintain aspect ratio in CSS style', () => {
      const scaled = scaleLogoForReceipt(logoUrl, { maintainAspectRatio: true });
      
      expect(scaled.style).toContain('object-fit: contain');
    });

    it('should exclude aspect ratio style when disabled', () => {
      const scaled = scaleLogoForReceipt(logoUrl, { maintainAspectRatio: false });
      
      expect(scaled.style).not.toContain('object-fit');
    });

    it('should include centering styles', () => {
      const scaled = scaleLogoForReceipt(logoUrl);
      
      expect(scaled.style).toContain('margin: 0 auto');
      expect(scaled.style).toContain('display: block');
    });

    it('should include max-width and max-height in styles', () => {
      const scaled = scaleLogoForReceipt(logoUrl, { maxWidth: 200, maxHeight: 100 });
      
      expect(scaled.style).toContain('max-width: 200px');
      expect(scaled.style).toContain('max-height: 100px');
    });

    it('should handle various URL formats', () => {
      const urls = [
        'https://example.com/logo.png',
        'http://example.com/path/to/logo.jpg',
        '/static/logo.svg',
        'data:image/png;base64,iVBORw0KG...',
      ];

      urls.forEach((url) => {
        const scaled = scaleLogoForReceipt(url);
        expect(scaled.url).toBe(url);
      });
    });
  });

  describe('calculateReceiptDimensions', () => {
    it('should calculate receipt dimensions from content', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const dims = calculateReceiptDimensions(receipt);
      
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });

    it('should respect custom font size', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const dims12 = calculateReceiptDimensions(receipt, 12);
      const dims16 = calculateReceiptDimensions(receipt, 16);
      
      expect(dims16.width).toBeGreaterThan(dims12.width);
      expect(dims16.height).toBeGreaterThan(dims12.height);
    });

    it('should calculate based on longest line', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const dims = calculateReceiptDimensions(receipt);
      
      const maxLineLength = Math.max(...receipt.lines.map((line) => line.length));
      expect(dims.width).toBeGreaterThan(maxLineLength * 6); // 0.6 = avgCharWidth factor
    });

    it('should calculate height based on line count', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const dims = calculateReceiptDimensions(receipt, 12);
      
      const expectedHeight = receipt.lines.length * (12 * 1.5);
      expect(Math.abs(dims.height - expectedHeight)).toBeLessThan(1);
    });
  });
});

describe('Receipt Generation - Data Validation', () => {
  describe('validateReceiptData', () => {
    it('should validate correct receipt data', () => {
      const result = validateReceiptData(mockTransaction, mockStore);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject transaction without ID', () => {
      const invalidTransaction = { ...mockTransaction, id: '' };
      const result = validateReceiptData(invalidTransaction, mockStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transaction ID is required');
    });

    it('should reject transaction without items', () => {
      const invalidTransaction = { ...mockTransaction, items: [] };
      const result = validateReceiptData(invalidTransaction, mockStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least one item'))).toBe(true);
    });

    it('should reject transaction with zero or negative total', () => {
      const invalidTransaction = { ...mockTransaction, totalAmount: 0 };
      const result = validateReceiptData(invalidTransaction, mockStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('total must be greater than 0'))).toBe(true);
    });

    it('should validate each item in transaction', () => {
      const invalidTransaction: Transaction = {
        ...mockTransaction,
        items: [
          {
            id: 'item-1',
            transactionId: 'txn-123',
            productId: '',
            quantity: 1,
            unitPrice: 100000,
            totalPrice: 100000,
            createdAt: new Date(),
          },
        ],
      };
      
      const result = validateReceiptData(invalidTransaction, mockStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Product ID is required'))).toBe(true);
    });

    it('should reject item with invalid quantity', () => {
      const invalidTransaction: Transaction = {
        ...mockTransaction,
        items: [
          {
            id: 'item-1',
            transactionId: 'txn-123',
            productId: 'Product',
            quantity: 0,
            unitPrice: 100000,
            totalPrice: 0,
            createdAt: new Date(),
          },
        ],
      };
      
      const result = validateReceiptData(invalidTransaction, mockStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Quantity must be greater than 0'))).toBe(true);
    });

    it('should reject item with negative price', () => {
      const invalidTransaction: Transaction = {
        ...mockTransaction,
        items: [
          {
            id: 'item-1',
            transactionId: 'txn-123',
            productId: 'Product',
            quantity: 1,
            unitPrice: -100000,
            totalPrice: -100000,
            createdAt: new Date(),
          },
        ],
      };
      
      const result = validateReceiptData(invalidTransaction, mockStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot be negative'))).toBe(true);
    });

    it('should reject store without ID', () => {
      const invalidStore = { ...mockStore, id: '' };
      const result = validateReceiptData(mockTransaction, invalidStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Store ID is required');
    });

    it('should reject store without name', () => {
      const invalidStore = { ...mockStore, name: '' };
      const result = validateReceiptData(mockTransaction, invalidStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Store name is required');
    });

    it('should accumulate multiple validation errors', () => {
      const invalidTransaction: Transaction = {
        ...mockTransaction,
        id: '',
        totalAmount: -100,
        items: [],
      };
      const invalidStore = { ...mockStore, id: '', name: '' };
      
      const result = validateReceiptData(invalidTransaction, invalidStore);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });
});

describe('Receipt Generation - Edge Cases', () => {
  it('should handle very long product names', () => {
    const longNameTransaction: Transaction = {
      ...mockTransaction,
      items: [
        {
          id: 'item-1',
          transactionId: 'txn-123',
          productId: 'This is a very long product name that should wrap across multiple lines in the receipt',
          quantity: 1,
          unitPrice: 100000,
          totalPrice: 100000,
          createdAt: new Date(),
        },
      ],
      totalAmount: 100000,
    };

    const receipt = generateReceiptText(longNameTransaction, mockStore, mockUser);
    expect(receipt).toBeDefined();
    expect(receipt.length).toBeGreaterThan(0);
  });

  it('should handle transaction with large amounts', () => {
    const largeAmountTransaction: Transaction = {
      ...mockTransaction,
      totalAmount: 999999999,
      items: [
        {
          id: 'item-1',
          transactionId: 'txn-123',
          productId: 'Expensive Item',
          quantity: 1,
          unitPrice: 999999999,
          totalPrice: 999999999,
          createdAt: new Date(),
        },
      ],
    };

    const receipt = generateReceiptText(largeAmountTransaction, mockStore, mockUser);
    expect(receipt).toContain('Rp 999.999.999');
  });

  it('should handle transaction with many items', () => {
    const manyItemsTransaction: Transaction = {
      ...mockTransaction,
      totalAmount: 1000000,
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        transactionId: 'txn-123',
        productId: `Product ${i}`,
        quantity: 1,
        unitPrice: 20000,
        totalPrice: 20000,
        createdAt: new Date(),
      })),
    };

    const receipt = generateReceiptText(manyItemsTransaction, mockStore, mockUser);
    expect(receipt).toContain('Product 0');
    expect(receipt).toContain('Product 49');
  });

  it('should handle store with very long address', () => {
    const storeWithLongAddress: Store = {
      ...mockStore,
      address: 'Jalan yang sangat panjang dengan nama lengkap dan detail yang sangat terperinci nomor 123 komplek perumahan besar berlantai tinggi gedung modern',
    };

    const receipt = generateReceiptText(mockTransaction, storeWithLongAddress, mockUser);
    expect(receipt).toContain('Jalan yang sangat panjang');
  });

  it('should maintain receipt formatting at different widths', () => {
    const widths = [30, 40, 50, 60];
    
    widths.forEach((width) => {
      const receipt = generateReceiptText(mockTransaction, mockStore, mockUser, { width });
      
      receipt.split('\n').forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(width + 1); // +1 for tolerance
      });
    });
  });
});

describe('Receipt Generation - Integration', () => {
  it('should generate consistent receipt for same transaction', () => {
    const receipt1 = generateReceipt(mockTransaction, mockStore, mockUser);
    const receipt2 = generateReceipt(mockTransaction, mockStore, mockUser);

    expect(receipt1.text).toBe(receipt2.text);
    expect(receipt1.html).toBe(receipt2.html);
  });

  it('should generate different receipts for different transactions', () => {
    const transaction2: Transaction = {
      ...mockTransaction,
      id: 'txn-456',
      totalAmount: 500000,
    };

    const receipt1 = generateReceipt(mockTransaction, mockStore, mockUser);
    const receipt2 = generateReceipt(transaction2, mockStore, mockUser);

    expect(receipt1.text).not.toBe(receipt2.text);
  });

  it('should generate different receipts for different stores', () => {
    const receipt1 = generateReceipt(mockTransaction, mockStore, mockUser);
    const receipt2 = generateReceipt(mockTransaction, mockStoreWithoutLogo, mockUser);

    expect(receipt1.text).not.toBe(receipt2.text);
    expect(receipt1.text).toContain('Vape Store Pusat');
    expect(receipt2.text).toContain('Vape Store Cabang');
  });

  it('should handle complete receipt generation workflow', () => {
    // Validate data
    const validation = validateReceiptData(mockTransaction, mockStore);
    expect(validation.valid).toBe(true);

    // Generate receipt
    const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
    expect(receipt.text).toBeDefined();
    expect(receipt.html).toBeDefined();

    // Calculate dimensions
    const dims = calculateReceiptDimensions(receipt);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);

    // Scale logo
    const logo = scaleLogoForReceipt(mockStore.logoUrl || '');
    expect(logo.url).toBeDefined();

    // Format for printing
    const printFormat = formatForPrinting(receipt);
    expect(printFormat).toBe(receipt.text);
  });
});

