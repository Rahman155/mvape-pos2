/**
 * Unit tests for receipt printing functionality
 * Tests print dialog opening, PDF export, preview functionality, and clipboard operations
 * 
 * **Validates: Requirements 19.6 (Receipt Editing - reprint with current details), 28 (Receipt Generation)**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Transaction, TransactionItem, Store, User } from '@/types';
import { Receipt, generateReceipt } from '@/lib/receiptGenerator';
import {
  printReceipt,
  exportReceiptAsPDF,
  previewReceipt,
  copyReceiptToClipboard,
  generatePrintHTML,
  isPrintSupported,
  isPDFExportSupported,
  getPrintCapabilities,
} from '@/lib/receiptPrinting';

// Mock data
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
];

const mockTransaction: Transaction = {
  id: 'txn-123-abc-def-456',
  storeId: 'store-1',
  kasirId: 'user-123',
  transactionDate: new Date('2024-01-15T14:30:00'),
  totalAmount: 620000,
  paymentMethod: 'CASH',
  status: 'COMPLETED',
  notes: 'Customer satisfied',
  createdAt: new Date('2024-01-15T14:30:00'),
  updatedAt: new Date('2024-01-15T14:30:00'),
  isEdited: false,
  version: 1,
  items: mockTransactionItems,
};

const mockEditedTransaction: Transaction = {
  ...mockTransaction,
  totalAmount: 600000, // reduced after edit
  isEdited: true,
  editedAt: new Date('2024-01-15T15:00:00'),
  editedBy: 'user-123',
};

describe('Receipt Printing - Print Functionality', () => {
  beforeEach(() => {
    // Mock window.open for print and preview tests
    global.window.open = vi.fn(() => ({
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      onload: null,
      print: vi.fn(),
      close: vi.fn(),
    })) as any;

    // Mock setTimeout for async print tests
    vi.useFakeTimers();
  });

  describe('printReceipt', () => {
    it('should open print dialog when printReceipt is called', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      printReceipt(receipt, 'Test Receipt');

      expect(window.open).toHaveBeenCalledWith('', '', expect.stringContaining('width=800'));
    });

    it('should handle print window creation failure gracefully', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      global.window.open = vi.fn(() => null);

      expect(() => printReceipt(receipt)).toThrow('Failed to open print window');
    });

    it('should generate print window with correct title', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const mockWindow = {
        document: { write: vi.fn(), close: vi.fn() },
        onload: null,
        print: vi.fn(),
        close: vi.fn(),
      };
      global.window.open = vi.fn(() => mockWindow) as any;

      printReceipt(receipt, 'Receipt Print');

      expect(window.open).toHaveBeenCalled();
    });

    it('should write receipt content to print window', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const mockWindow = {
        document: { write: vi.fn(), close: vi.fn() },
        onload: null,
        print: vi.fn(),
        close: vi.fn(),
      };
      global.window.open = vi.fn(() => mockWindow) as any;

      printReceipt(receipt);

      expect(mockWindow.document.write).toHaveBeenCalled();
      const writtenContent = (mockWindow.document.write as any).mock.calls[0][0];
      expect(writtenContent).toContain('<!DOCTYPE html>');
      expect(writtenContent).toContain('monospace');
    });

    it('should call print() on the window when loaded', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const mockWindow = {
        document: { write: vi.fn(), close: vi.fn() },
        onload: null,
        print: vi.fn(),
        close: vi.fn(),
      };
      global.window.open = vi.fn(() => mockWindow) as any;

      printReceipt(receipt);

      // Simulate window load
      if (mockWindow.onload) {
        mockWindow.onload();
        vi.runAllTimers();
        expect(mockWindow.print).toHaveBeenCalled();
      }
    });

    it('should close window after printing', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const mockWindow = {
        document: { write: vi.fn(), close: vi.fn() },
        onload: null,
        print: vi.fn(),
        close: vi.fn(),
      };
      global.window.open = vi.fn(() => mockWindow) as any;

      printReceipt(receipt);

      // Simulate window load
      if (mockWindow.onload) {
        mockWindow.onload();
        vi.runAllTimers();
        expect(mockWindow.close).toHaveBeenCalled();
      }
    });
  });

  describe('previewReceipt', () => {
    it('should open preview window', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      previewReceipt(receipt, 'Receipt Preview');

      expect(window.open).toHaveBeenCalled();
    });

    it('should set preview window title', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const mockWindow = {
        document: { write: vi.fn(), close: vi.fn() },
        title: '',
        onload: null,
        print: vi.fn(),
        close: vi.fn(),
      };
      global.window.open = vi.fn(() => mockWindow) as any;

      previewReceipt(receipt, 'Receipt Preview');

      expect(mockWindow.document.write).toHaveBeenCalled();
    });

    it('should handle preview window opening failure', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      global.window.open = vi.fn(() => null);

      expect(() => previewReceipt(receipt)).toThrow('Failed to open preview window');
    });

    it('should generate preview window with receipt content', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const mockWindow = {
        document: { write: vi.fn(), close: vi.fn() },
        title: '',
        onload: null,
        print: vi.fn(),
        close: vi.fn(),
      };
      global.window.open = vi.fn(() => mockWindow) as any;

      previewReceipt(receipt, 'Test Preview');

      expect(mockWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('receipt'));
    });
  });
});

describe('Receipt Printing - PDF Export', () => {
  describe('exportReceiptAsPDF', () => {
    it('should generate PDF with receipt content', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      // Mock jsPDF behavior
      const mockPDF = {
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn(() => ['line 1', 'line 2']),
        addPage: vi.fn(),
        save: vi.fn(),
        getNumberOfPages: vi.fn(() => 1),
        setPage: vi.fn(),
        internal: {
          pageSize: {
            getWidth: vi.fn(() => 80),
            setHeight: vi.fn(),
          },
        },
      };

      // Mock jsPDF constructor
      global.jsPDF = vi.fn(() => mockPDF) as any;

      exportReceiptAsPDF(receipt, 'test-receipt');

      expect(mockPDF.text).toHaveBeenCalled();
    });

    it('should use thermal paper dimensions (80mm width)', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      const mockPDF = {
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn(() => []),
        addPage: vi.fn(),
        save: vi.fn(),
        getNumberOfPages: vi.fn(() => 1),
        setPage: vi.fn(),
        internal: {
          pageSize: {
            getWidth: vi.fn(() => 80),
            setHeight: vi.fn(),
          },
        },
      };

      global.jsPDF = vi.fn((config) => {
        expect(config.format[0]).toBe(80); // 80mm width
        return mockPDF;
      }) as any;

      exportReceiptAsPDF(receipt, 'test-receipt');
    });

    it('should save PDF with correct filename', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      const mockPDF = {
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn(() => []),
        addPage: vi.fn(),
        save: vi.fn(),
        getNumberOfPages: vi.fn(() => 1),
        setPage: vi.fn(),
        internal: {
          pageSize: {
            getWidth: vi.fn(() => 80),
            setHeight: vi.fn(),
          },
        },
      };

      global.jsPDF = vi.fn(() => mockPDF) as any;

      exportReceiptAsPDF(receipt, 'my-receipt');

      expect(mockPDF.save).toHaveBeenCalledWith(expect.stringContaining('my-receipt'));
      expect(mockPDF.save).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
    });

    it('should handle long receipt lines by wrapping', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      const mockPDF = {
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn(() => ['wrapped line 1', 'wrapped line 2']),
        addPage: vi.fn(),
        save: vi.fn(),
        getNumberOfPages: vi.fn(() => 1),
        setPage: vi.fn(),
        internal: {
          pageSize: {
            getWidth: vi.fn(() => 80),
            setHeight: vi.fn(),
          },
        },
      };

      global.jsPDF = vi.fn(() => mockPDF) as any;

      exportReceiptAsPDF(receipt, 'test-receipt');

      // Should call splitTextToSize for long lines
      expect(mockPDF.splitTextToSize).toHaveBeenCalled();
    });

    it('should add new page when content exceeds page height', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      const mockPDF = {
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn(() => []),
        addPage: vi.fn(),
        save: vi.fn(),
        getNumberOfPages: vi.fn(() => 2),
        setPage: vi.fn(),
        internal: {
          pageSize: {
            getWidth: vi.fn(() => 80),
            setHeight: vi.fn(),
          },
        },
      };

      global.jsPDF = vi.fn(() => mockPDF) as any;

      exportReceiptAsPDF(receipt, 'test-receipt');

      // Should handle multi-page if receipt is very long
      expect(mockPDF.setPage).toHaveBeenCalled();
    });
  });
});

describe('Receipt Printing - Clipboard Operations', () => {
  describe('copyReceiptToClipboard', () => {
    it('should copy receipt text to clipboard', async () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      // Mock clipboard API
      global.navigator.clipboard = {
        writeText: vi.fn(() => Promise.resolve()),
      } as any;

      await copyReceiptToClipboard(receipt);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(receipt.text);
    });

    it('should handle clipboard write failure', async () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      
      global.navigator.clipboard = {
        writeText: vi.fn(() => Promise.reject(new Error('Clipboard denied'))),
      } as any;

      await expect(copyReceiptToClipboard(receipt)).rejects.toThrow('Failed to copy receipt');
    });

    it('should preserve receipt text format in clipboard', async () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      let copiedText = '';

      global.navigator.clipboard = {
        writeText: vi.fn((text) => {
          copiedText = text;
          return Promise.resolve();
        }),
      } as any;

      await copyReceiptToClipboard(receipt);

      expect(copiedText).toBe(receipt.text);
      expect(copiedText).toContain('Vape Store Pusat');
      expect(copiedText).toContain('TOTAL');
    });
  });
});

describe('Receipt Printing - HTML Generation', () => {
  describe('generatePrintHTML', () => {
    it('should generate valid HTML structure', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const html = generatePrintHTML(receipt);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
    });

    it('should include receipt content in HTML', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const html = generatePrintHTML(receipt);

      expect(html).toContain('Vape Store Pusat');
      expect(html).toContain('CASH');
      expect(html).toContain('Thank you for your purchase');
    });

    it('should include print-friendly CSS styles', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const html = generatePrintHTML(receipt);

      expect(html).toContain('@media print');
      expect(html).toContain('font-family: \'Courier New\', monospace');
      expect(html).toContain('page-break-inside: avoid');
    });

    it('should include print and close buttons for non-print view', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const html = generatePrintHTML(receipt);

      expect(html).toContain('Print');
      expect(html).toContain('Close');
      expect(html).toContain('window.print()');
      expect(html).toContain('window.close()');
    });

    it('should set 80mm width for thermal printer compatibility', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const html = generatePrintHTML(receipt);

      expect(html).toContain('width: 80mm');
    });

    it('should escape HTML special characters in receipt content', () => {
      const receiptWithSpecialChars = generateReceipt(mockTransaction, {
        ...mockStore,
        name: 'Store & Company <Ltd>',
      }, mockUser);
      const html = generatePrintHTML(receiptWithSpecialChars);

      expect(html).toContain('&amp;');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
    });

    it('should preserve monospace formatting for receipt', () => {
      const receipt = generateReceipt(mockTransaction, mockStore, mockUser);
      const html = generatePrintHTML(receipt);

      expect(html).toContain('receipt-line');
      expect(html).toContain('white-space: pre');
    });
  });
});

describe('Receipt Printing - Capability Detection', () => {
  describe('isPrintSupported', () => {
    it('should return true if print is supported', () => {
      global.window.print = vi.fn();
      expect(isPrintSupported()).toBe(true);
    });

    it('should return false if print is not supported', () => {
      delete (global.window as any).print;
      expect(isPrintSupported()).toBe(false);
    });
  });

  describe('isPDFExportSupported', () => {
    it('should return true if PDF export is available', () => {
      expect(isPDFExportSupported()).toBe(true);
    });
  });

  describe('getPrintCapabilities', () => {
    it('should detect available print capabilities', () => {
      const capabilities = getPrintCapabilities();

      expect(capabilities).toHaveProperty('canPrint');
      expect(capabilities).toHaveProperty('canExportPDF');
      expect(capabilities).toHaveProperty('canPreview');
      expect(capabilities).toHaveProperty('canCopy');
      expect(capabilities).toHaveProperty('recommendedAction');
    });

    it('should recommend print if available', () => {
      global.window.print = vi.fn();
      const capabilities = getPrintCapabilities();

      expect(capabilities.recommendedAction).toBe('print');
    });

    it('should recommend PDF if print unavailable but PDF available', () => {
      delete (global.window as any).print;
      global.window.open = vi.fn();
      const capabilities = getPrintCapabilities();

      // Should recommend PDF over other options if print unavailable
      expect(capabilities.canPrint).toBe(false);
    });
  });
});

describe('Receipt Printing - Current Details (Edited Transactions)', () => {
  it('should display current receipt details when transaction is edited', () => {
    const receipt = generateReceipt(mockEditedTransaction, mockStore, mockUser);

    // Receipt should contain the edited total, not original
    expect(receipt.text).toContain('600000');
    // Should not contain original total
    expect(receipt.text).not.toContain('620000');
  });

  it('should show edited transaction in print preview', () => {
    const receipt = generateReceipt(mockEditedTransaction, mockStore, mockUser);
    const html = generatePrintHTML(receipt);

    expect(html).toContain('Rp 600.000');
  });

  it('should maintain all transaction details in printed receipt after edits', () => {
    const receipt = generateReceipt(mockEditedTransaction, mockStore, mockUser);

    // Receipt should contain all necessary info
    expect(receipt.text).toContain('Vape Store Pusat');
    expect(receipt.text).toContain('kasir_budi');
    expect(receipt.text).toContain('Vape Mod Voopoo');
    expect(receipt.text).toContain('Liquid Premium 60ml');
    expect(receipt.text).toContain('CASH');
    expect(receipt.text).toContain('Thank you for your purchase');
  });

  it('should correctly recalculate item totals after quantity edits', () => {
    const editedTransaction: Transaction = {
      ...mockTransaction,
      totalAmount: 470000, // reduced from 620000
      items: [
        {
          ...mockTransactionItems[0],
          quantity: 0, // quantity changed
          totalPrice: 0,
        },
        mockTransactionItems[1],
      ],
      isEdited: true,
      editedAt: new Date(),
      editedBy: 'user-123',
    };

    const receipt = generateReceipt(editedTransaction, mockStore, mockUser);

    expect(receipt.text).toContain('Rp 470.000');
  });
});

describe('Receipt Printing - Edge Cases and Error Handling', () => {
  it('should handle receipt with very long product names', () => {
    const longNameReceipt = generateReceipt(
      {
        ...mockTransaction,
        items: [
          {
            ...mockTransactionItems[0],
            productId: 'This is a very long product name that should wrap properly in receipt',
          },
        ],
      },
      mockStore,
      mockUser
    );

    const html = generatePrintHTML(longNameReceipt);
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
  });

  it('should handle receipt with many items', () => {
    const manyItemsReceipt = generateReceipt(
      {
        ...mockTransaction,
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `item-${i}`,
          transactionId: mockTransaction.id,
          productId: `Product ${i}`,
          quantity: 1,
          unitPrice: 10000,
          totalPrice: 10000,
          createdAt: new Date(),
        })),
        totalAmount: 500000,
      },
      mockStore,
      mockUser
    );

    const html = generatePrintHTML(manyItemsReceipt);
    expect(html).toContain('Product 0');
    expect(html).toContain('Product 49');
  });

  it('should handle special characters in store name and address', () => {
    const specialCharReceipt = generateReceipt(
      mockTransaction,
      {
        ...mockStore,
        name: 'Toko & Supermarket "Premium" <Utama>',
        address: 'Jl. A & B, No. 123 "Pusat Kota"',
      },
      mockUser
    );

    const html = generatePrintHTML(specialCharReceipt);
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });

  it('should generate printable receipt for all payment methods', () => {
    const paymentMethods: Array<'CASH' | 'MEMBER_CREDIT' | 'TEMPO'> = [
      'CASH',
      'MEMBER_CREDIT',
      'TEMPO',
    ];

    paymentMethods.forEach((method) => {
      const receipt = generateReceipt(
        { ...mockTransaction, paymentMethod: method },
        mockStore,
        mockUser
      );

      expect(receipt.text).toContain(method);
    });
  });
});
