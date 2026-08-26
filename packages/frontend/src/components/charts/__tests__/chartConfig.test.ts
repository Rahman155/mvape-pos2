/**
 * Chart Configuration Tests
 * Unit tests for formatting utilities and configuration helpers
 */

import {
  currencyFormatter,
  percentageFormatter,
  compactNumberFormatter,
  dateFormatter,
  timeFormatter,
  createTooltipFormatter,
} from '../chartConfig';

describe('Chart Utilities', () => {
  describe('currencyFormatter', () => {
    it('should format Indonesian Rupiah correctly', () => {
      expect(currencyFormatter(1000000)).toBe('Rp 1.000.000');
      expect(currencyFormatter(5500000)).toBe('Rp 5.500.000');
    });

    it('should handle zero', () => {
      expect(currencyFormatter(0)).toBe('Rp 0');
    });

    it('should handle large numbers', () => {
      expect(currencyFormatter(1000000000)).toBe('Rp 1.000.000.000');
    });

    it('should support different currencies', () => {
      const result = currencyFormatter(1000, 'USD');
      expect(result).toContain('$');
    });

    it('should handle negative numbers', () => {
      const result = currencyFormatter(-500000);
      expect(result).toContain('-');
    });
  });

  describe('percentageFormatter', () => {
    it('should format percentages with decimals', () => {
      expect(percentageFormatter(25.5, 1)).toBe('25.5%');
      expect(percentageFormatter(33.333, 2)).toBe('33.33%');
    });

    it('should default to 1 decimal place', () => {
      expect(percentageFormatter(45)).toBe('45.0%');
    });

    it('should handle zero', () => {
      expect(percentageFormatter(0, 0)).toBe('0%');
    });

    it('should handle 100%', () => {
      expect(percentageFormatter(100, 0)).toBe('100%');
    });

    it('should handle values over 100%', () => {
      expect(percentageFormatter(150.5, 1)).toBe('150.5%');
    });
  });

  describe('compactNumberFormatter', () => {
    it('should format millions correctly', () => {
      expect(compactNumberFormatter(1500000)).toBe('1.5M');
      expect(compactNumberFormatter(2000000)).toBe('2.0M');
    });

    it('should format thousands correctly', () => {
      expect(compactNumberFormatter(5000)).toBe('5K');
      expect(compactNumberFormatter(15500)).toBe('15.5K');
    });

    it('should return number as string for values under 1000', () => {
      expect(compactNumberFormatter(500)).toBe('500');
      expect(compactNumberFormatter(999)).toBe('999');
    });

    it('should handle zero', () => {
      expect(compactNumberFormatter(0)).toBe('0');
    });

    it('should handle large numbers', () => {
      expect(compactNumberFormatter(1000000000)).toBe('1000.0M');
    });
  });

  describe('dateFormatter', () => {
    const testDate = '2024-01-15';

    it('should format date in short format', () => {
      const result = dateFormatter(testDate, 'short');
      expect(result).toMatch(/\d{2}\/\d{2}/);
    });

    it('should format date in long format', () => {
      const result = dateFormatter(testDate, 'long');
      expect(result).toContain('2024');
    });

    it('should handle Date object', () => {
      const date = new Date('2024-01-15');
      const result = dateFormatter(date, 'short');
      expect(result).toMatch(/\d{2}\/\d{2}/);
    });

    it('should default to short format', () => {
      const result = dateFormatter(testDate);
      expect(result).toMatch(/\d{2}\/\d{2}/);
    });
  });

  describe('timeFormatter', () => {
    it('should format hours and minutes correctly', () => {
      expect(timeFormatter(60)).toBe('01:00');
      expect(timeFormatter(125)).toBe('02:05');
    });

    it('should handle zero minutes', () => {
      expect(timeFormatter(0)).toBe('00:00');
    });

    it('should handle large values', () => {
      expect(timeFormatter(600)).toBe('10:00');
    });

    it('should pad single digits', () => {
      expect(timeFormatter(5)).toBe('00:05');
      expect(timeFormatter(65)).toBe('01:05');
    });
  });

  describe('createTooltipFormatter', () => {
    it('should create currency formatter', () => {
      const formatter = createTooltipFormatter('currency');
      const result = formatter(1000000);
      expect(result).toContain('Rp');
    });

    it('should create percentage formatter', () => {
      const formatter = createTooltipFormatter('percentage');
      const result = formatter(25);
      expect(result).toContain('%');
    });

    it('should create compact formatter', () => {
      const formatter = createTooltipFormatter('compact');
      const result = formatter(1500000);
      expect(result).toBe('1.5M');
    });

    it('should create number formatter', () => {
      const formatter = createTooltipFormatter('number');
      const result = formatter(1000);
      expect(result).toBe('1.000');
    });

    it('should default to number format', () => {
      const formatter = createTooltipFormatter();
      const result = formatter(1000);
      expect(result).toBe('1.000');
    });
  });
});
