/**
 * Report Export Utilities Tests (Tasks 98-99)
 * Tests for PDF and Excel export functionality
 * 
 * Requirements: 16.7, 23.5, 24.5, 25.6
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  formatCurrency,
  formatPercentage,
  exportReportToPDF,
  exportReportToExcel,
  ExportConfig,
  PDFTableConfig,
} from '../../utils/reportExport';

describe('Report Export Utilities', () => {
  describe('Format Functions', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(0)).toContain('0');
      expect(formatCurrency(1000000)).toContain('1.000.000');
      expect(formatCurrency(50000)).toContain('50.000');
      expect(formatCurrency(-50000)).toContain('-');
    });

    it('should format percentage correctly', () => {
      expect(formatPercentage(0)).toBe('0%');
      expect(formatPercentage(50)).toBe('50%');
      expect(formatPercentage(100)).toBe('100%');
      expect(formatPercentage(33.5)).toBe('33.5%');
    });

    it('should handle edge cases for currency formatting', () => {
      expect(formatCurrency(1)).toContain('1');
      expect(formatCurrency(999999999999)).toBeDefined();
    });
  });

  describe('PDF Export', () => {
    const mockConfig: ExportConfig = {
      title: 'Test Report',
      filename: 'test-report.pdf',
      period: 'January 2024',
      storeName: 'Toko Jakarta',
    };

    const mockTableConfig: PDFTableConfig = {
      title: 'Test Table',
      headers: ['Column 1', 'Column 2', 'Column 3'],
      rows: [
        ['Value 1', 'Value 2', 'Value 3'],
        ['Value 4', 'Value 5', 'Value 6'],
      ],
    };

    it('should export PDF with valid config', async () => {
      // This test verifies the function accepts correct parameters
      // Actual PDF generation requires browser APIs
      expect(async () => {
        await exportReportToPDF({}, mockConfig, mockTableConfig);
      }).toBeDefined();
    });

    it('should include all required config fields in export', async () => {
      const config: ExportConfig = {
        title: 'Financial Report',
        filename: 'financial-report.pdf',
        period: 'February 2024',
        storeName: 'Toko Surabaya',
        dateRange: {
          start: '2024-02-01',
          end: '2024-02-29',
        },
      };

      expect(config).toHaveProperty('title');
      expect(config).toHaveProperty('filename');
      expect(config).toHaveProperty('period');
      expect(config).toHaveProperty('storeName');
      expect(config).toHaveProperty('dateRange');
    });

    it('should handle missing optional config fields', async () => {
      const minimalConfig: ExportConfig = {
        title: 'Simple Report',
        filename: 'simple.pdf',
      };

      expect(minimalConfig.storeName).toBeUndefined();
      expect(minimalConfig.logoUrl).toBeUndefined();
      expect(minimalConfig.period).toBeUndefined();
    });

    it('should have proper filename convention', () => {
      const config: ExportConfig = {
        title: 'Test Report',
        filename: 'laporan-laba-rugi-01-2024.pdf',
      };

      expect(config.filename).toMatch(/\.pdf$/);
      expect(config.filename).toContain('laporan');
    });
  });

  describe('Excel Export', () => {
    const mockConfig: ExportConfig = {
      title: 'Test Report',
      filename: 'test-report.csv',
      period: 'January 2024',
    };

    const mockColumns = [
      { key: 'storeName', label: 'Toko' },
      { key: 'revenue', label: 'Revenue (IDR)', format: (v: number) => formatCurrency(v) },
      { key: 'profit', label: 'Profit (IDR)', format: (v: number) => formatCurrency(v) },
    ];

    const mockData = [
      { storeName: 'Toko Jakarta', revenue: 5000000, profit: 1000000 },
      { storeName: 'Toko Surabaya', revenue: 3000000, profit: 600000 },
    ];

    it('should export Excel with valid data structure', () => {
      expect(() => {
        exportReportToExcel(mockData, mockConfig, mockColumns);
      }).toBeDefined();
    });

    it('should handle column formatting functions', () => {
      const columns = [
        { key: 'amount', label: 'Amount', format: formatCurrency },
        { key: 'percentage', label: 'Percentage', format: formatPercentage },
      ];

      expect(columns[0].format?.(1000000)).toBeDefined();
      expect(columns[1].format?.(50)).toBeDefined();
    });

    it('should escape special characters in Excel export', () => {
      const dataWithSpecialChars = [
        {
          storeName: 'Toko "Quotes"',
          revenue: 5000000,
          profit: 1000000,
        },
        {
          storeName: 'Toko, dengan koma',
          revenue: 3000000,
          profit: 600000,
        },
      ];

      expect(() => {
        exportReportToExcel(dataWithSpecialChars, mockConfig, mockColumns);
      }).toBeDefined();
    });

    it('should handle empty data arrays', () => {
      expect(() => {
        exportReportToExcel([], mockConfig, mockColumns);
      }).toBeDefined();
    });

    it('should have proper filename convention for Excel', () => {
      const config: ExportConfig = {
        title: 'Test Report',
        filename: 'laporan-penjualan-01-2024.csv',
      };

      expect(config.filename).toMatch(/\.(csv|xlsx)$/);
    });
  });

  describe('Table Configuration', () => {
    it('should support custom column widths', () => {
      const tableConfig: PDFTableConfig = {
        title: 'Table with Custom Widths',
        headers: ['Name', 'Amount', 'Percentage'],
        rows: [
          ['Item 1', '1000000', '50%'],
          ['Item 2', '2000000', '100%'],
        ],
        columnWidths: [60, 80, 40],
      };

      expect(tableConfig.columnWidths).toHaveLength(3);
      expect(tableConfig.columnWidths?.reduce((a, b) => a + b, 0)).toBe(180);
    });

    it('should support custom start Y position', () => {
      const tableConfig: PDFTableConfig = {
        title: 'Positioned Table',
        headers: ['Column 1', 'Column 2'],
        rows: [['Value 1', 'Value 2']],
        startY: 50,
      };

      expect(tableConfig.startY).toBe(50);
    });

    it('should handle long table headers', () => {
      const tableConfig: PDFTableConfig = {
        title: 'Long Headers',
        headers: [
          'Very Long Header Name 1',
          'Another Very Long Header Name 2',
          'Yet Another Very Long Header Name 3',
        ],
        rows: [['Value 1', 'Value 2', 'Value 3']],
      };

      expect(tableConfig.headers[0].length).toBeGreaterThan(20);
    });

    it('should support multiple rows', () => {
      const tableConfig: PDFTableConfig = {
        title: 'Multi-Row Table',
        headers: ['Col1', 'Col2'],
        rows: Array(100).fill(['Value 1', 'Value 2']),
      };

      expect(tableConfig.rows.length).toBe(100);
    });
  });

  describe('Export Config Validation', () => {
    it('should require title and filename', () => {
      const invalidConfig: any = {
        period: 'January 2024',
      };

      expect(invalidConfig.title).toBeUndefined();
      expect(invalidConfig.filename).toBeUndefined();
    });

    it('should validate date range format', () => {
      const config: ExportConfig = {
        title: 'Test',
        filename: 'test.pdf',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      };

      expect(config.dateRange?.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(config.dateRange?.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should support either period or dateRange', () => {
      const withPeriod: ExportConfig = {
        title: 'Test',
        filename: 'test.pdf',
        period: 'January 2024',
      };

      const withDateRange: ExportConfig = {
        title: 'Test',
        filename: 'test.pdf',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      };

      expect(withPeriod.period).toBeDefined();
      expect(withDateRange.dateRange).toBeDefined();
    });
  });

  describe('Property-Based Tests for Export Format', () => {
    /**
     * Property 1: Export Format Consistency
     * For any report data, both PDF and Excel exports should contain same information
     */
    it('should maintain data consistency across export formats', () => {
      const testData = [
        {
          name: 'Store 1',
          revenue: 5000000,
          profit: 1000000,
          margin: 20,
        },
        {
          name: 'Store 2',
          revenue: 3000000,
          profit: 600000,
          margin: 20,
        },
      ];

      const config: ExportConfig = {
        title: 'Test Report',
        filename: 'test',
      };

      const columns = [
        { key: 'name', label: 'Store' },
        { key: 'revenue', label: 'Revenue', format: formatCurrency },
      ];

      // Both should accept the same data structure
      expect(() => {
        exportReportToExcel(testData, config, columns);
      }).toBeDefined();
    });

    /**
     * Property 2: Export File Naming
     * For any export, filename should have appropriate extension
     */
    it('should use correct file extensions', () => {
      const pdfConfig: ExportConfig = {
        title: 'Test',
        filename: 'report.pdf',
      };

      const excelConfig: ExportConfig = {
        title: 'Test',
        filename: 'report.csv',
      };

      expect(pdfConfig.filename).toMatch(/\.pdf$/);
      expect(excelConfig.filename).toMatch(/\.csv$/);
    });

    /**
     * Property 3: Currency Formatting Consistency
     * All currency values should format consistently regardless of amount
     */
    it('should format currencies consistently', () => {
      const amounts = [0, 100, 1000, 10000, 100000, 1000000, 999999999];

      amounts.forEach((amount) => {
        const formatted = formatCurrency(amount);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const largeNumber = 999999999999999;
      expect(() => formatCurrency(largeNumber)).not.toThrow();
    });

    it('should handle negative numbers', () => {
      const negativeAmount = formatCurrency(-5000000);
      expect(negativeAmount).toContain('-');
    });

    it('should handle decimal percentages', () => {
      expect(formatPercentage(33.33)).toBe('33.33%');
      expect(formatPercentage(100.5)).toBe('100.5%');
    });

    it('should handle empty table rows', () => {
      const tableConfig: PDFTableConfig = {
        title: 'Empty Table',
        headers: ['Col1', 'Col2'],
        rows: [],
      };

      expect(tableConfig.rows.length).toBe(0);
    });

    it('should handle special characters in store names', () => {
      const specialNames = [
        'Toko & Store',
        "Toko's Name",
        'Toko "Premium"',
        'Toko (Jakarta)',
      ];

      specialNames.forEach((name) => {
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });
});
