/**
 * Property-based tests for receipt generation
 * Tests that core receipt calculation properties hold across various input combinations
 */

import fc from 'fast-check';
import { Decimal } from 'decimal.js';
import {
  calculateReceiptTotal,
  ReceiptLineItem,
  validateLineItems,
  calculateReceiptSummary,
} from '../receiptGenerator';

describe('Receipt Generation - Property-Based Tests', () => {
  /**
   * Property 1: Receipt total calculation consistency
   * **Validates: Requirements 7.9, 7.10**
   * 
   * The receipt total should equal the sum of all line items.
   * This property tests that for any combination of line items with valid quantities
   * and prices, the calculated total matches the sum of individual item totals.
   */
  describe('Property 1: Receipt total calculation consistency', () => {
    it('should calculate total equal to sum of all line items', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productName: fc.string({ minLength: 1, maxLength: 50 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.float({ min: 0.01, max: 100000, noNaN: true, noInfinity: true }),
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (products) => {
            // Create line items with correctly calculated totals
            const lineItems: ReceiptLineItem[] = products.map((product) => {
              const unitPrice = new Decimal(product.unitPrice);
              const quantity = new Decimal(product.quantity);
              const totalPrice = unitPrice.times(quantity);

              return {
                productName: product.productName,
                quantity: product.quantity,
                unitPrice: unitPrice.toString(),
                totalPrice: totalPrice.toString(),
              };
            });

            // Validate line items are correct (quantity * unitPrice = totalPrice)
            const itemsAreValid = validateLineItems(lineItems);
            if (!itemsAreValid) {
              throw new Error('Generated line items are invalid');
            }

            // Calculate the expected total by summing line item totals
            const expectedTotal = lineItems.reduce((sum, item) => {
              return sum.plus(new Decimal(item.totalPrice));
            }, new Decimal(0));

            // Calculate the actual total using the receipt generator
            const actualTotal = calculateReceiptTotal(lineItems);

            // The actual total should equal the expected total
            expect(new Decimal(actualTotal).equals(expectedTotal)).toBe(true);
          }
        ),
        { numRuns: 1000, verbose: true }
      );
    });

    it('should handle empty line items array', () => {
      const emptyItems: ReceiptLineItem[] = [];
      const total = calculateReceiptTotal(emptyItems);
      expect(total).toBe('0');
    });

    it('should calculate correct total with single line item', () => {
      fc.assert(
        fc.property(
          fc.record({
            productName: fc.string({ minLength: 1, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.float({ min: 0.01, max: 100000, noNaN: true, noInfinity: true }),
          }),
          (product) => {
            const unitPrice = new Decimal(product.unitPrice);
            const quantity = new Decimal(product.quantity);
            const expectedTotal = unitPrice.times(quantity);

            const lineItems: ReceiptLineItem[] = [
              {
                productName: product.productName,
                quantity: product.quantity,
                unitPrice: unitPrice.toString(),
                totalPrice: expectedTotal.toString(),
              },
            ];

            const actualTotal = calculateReceiptTotal(lineItems);
            expect(new Decimal(actualTotal).equals(expectedTotal)).toBe(true);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });

    it('should maintain precision with decimal prices', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productName: fc.string({ minLength: 1, maxLength: 50 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              // Use a more realistic price range with smaller decimals
              unitPrice: fc.float({ min: 0.01, max: 1000, noNaN: true, noInfinity: true }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (products) => {
            const lineItems: ReceiptLineItem[] = products.map((product) => {
              const unitPrice = new Decimal(product.unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
              const quantity = new Decimal(product.quantity);
              const totalPrice = unitPrice.times(quantity);

              return {
                productName: product.productName,
                quantity: product.quantity,
                unitPrice: unitPrice.toString(),
                totalPrice: totalPrice.toString(),
              };
            });

            // Validate all line items
            expect(validateLineItems(lineItems)).toBe(true);

            // Calculate expected and actual totals
            const expectedTotal = lineItems.reduce((sum, item) => {
              return sum.plus(new Decimal(item.totalPrice));
            }, new Decimal(0));

            const actualTotal = new Decimal(calculateReceiptTotal(lineItems));

            // Should match exactly without rounding errors
            expect(actualTotal.equals(expectedTotal)).toBe(true);
          }
        ),
        { numRuns: 500, verbose: true }
      );
    });

    it('should calculate correct total when combined with tax and discount', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productName: fc.string({ minLength: 1, maxLength: 50 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.float({ min: 0.01, max: 10000, noNaN: true, noInfinity: true }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          fc.float({ min: 0, max: 20, noNaN: true, noInfinity: true }),
          fc.float({ min: 0, max: 100000, noNaN: true, noInfinity: true }),
          (products, taxRate, discountAmount) => {
            const lineItems: ReceiptLineItem[] = products.map((product) => {
              const unitPrice = new Decimal(product.unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
              const quantity = new Decimal(product.quantity);
              const totalPrice = unitPrice.times(quantity);

              return {
                productName: product.productName,
                quantity: product.quantity,
                unitPrice: unitPrice.toString(),
                totalPrice: totalPrice.toString(),
              };
            });

            // Calculate receipt summary with tax and discount
            const summary = calculateReceiptSummary(lineItems, taxRate, discountAmount);

            // Verify the receipt total calculation
            // total = subtotal + tax - discount
            const expectedTotal = new Decimal(summary.subtotal)
              .plus(new Decimal(summary.tax))
              .minus(new Decimal(summary.discount));

            expect(new Decimal(summary.total).equals(expectedTotal)).toBe(true);

            // Verify subtotal matches line items sum
            const expectedSubtotal = lineItems.reduce((sum, item) => {
              return sum.plus(new Decimal(item.totalPrice));
            }, new Decimal(0));

            expect(new Decimal(summary.subtotal).equals(expectedSubtotal)).toBe(true);
          }
        ),
        { numRuns: 500, verbose: true }
      );
    });

    it('should never produce negative totals with valid inputs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productName: fc.string({ minLength: 1, maxLength: 50 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.float({ min: 0.01, max: 10000, noNaN: true, noInfinity: true }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (products) => {
            const lineItems: ReceiptLineItem[] = products.map((product) => {
              const unitPrice = new Decimal(product.unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
              const quantity = new Decimal(product.quantity);
              const totalPrice = unitPrice.times(quantity);

              return {
                productName: product.productName,
                quantity: product.quantity,
                unitPrice: unitPrice.toString(),
                totalPrice: totalPrice.toString(),
              };
            });

            const total = new Decimal(calculateReceiptTotal(lineItems));
            expect(total.isNegative()).toBe(false);
          }
        ),
        { numRuns: 500, verbose: true }
      );
    });
  });

  /**
   * Additional unit tests for edge cases and specific scenarios
   */
  describe('Receipt total calculation - Unit tests', () => {
    it('should calculate total correctly with two items', () => {
      const lineItems: ReceiptLineItem[] = [
        {
          productName: 'Product A',
          quantity: 2,
          unitPrice: '10.50',
          totalPrice: '21.00',
        },
        {
          productName: 'Product B',
          quantity: 3,
          unitPrice: '5.00',
          totalPrice: '15.00',
        },
      ];

      const total = calculateReceiptTotal(lineItems);
      expect(total).toBe('36.00');
    });

    it('should calculate total with large quantities', () => {
      const lineItems: ReceiptLineItem[] = [
        {
          productName: 'Bulk Item',
          quantity: 1000,
          unitPrice: '99.99',
          totalPrice: '99990.00',
        },
      ];

      const total = calculateReceiptTotal(lineItems);
      expect(total).toBe('99990.00');
    });

    it('should calculate total with many decimal places', () => {
      const lineItems: ReceiptLineItem[] = [
        {
          productName: 'Item 1',
          quantity: 1,
          unitPrice: '0.33',
          totalPrice: '0.33',
        },
        {
          productName: 'Item 2',
          quantity: 1,
          unitPrice: '0.33',
          totalPrice: '0.33',
        },
        {
          productName: 'Item 3',
          quantity: 1,
          unitPrice: '0.34',
          totalPrice: '0.34',
        },
      ];

      const total = calculateReceiptTotal(lineItems);
      expect(total).toBe('1.00');
    });

    it('should handle tax and discount correctly', () => {
      const lineItems: ReceiptLineItem[] = [
        {
          productName: 'Product',
          quantity: 1,
          unitPrice: '100',
          totalPrice: '100',
        },
      ];

      // 10% tax, 10 discount
      const summary = calculateReceiptSummary(lineItems, 10, 10);

      // subtotal: 100
      // tax: 100 * 0.1 = 10
      // discount: 10
      // total: 100 + 10 - 10 = 100
      expect(summary.subtotal).toBe('100');
      expect(summary.tax).toBe('10');
      expect(summary.discount).toBe('10');
      expect(summary.total).toBe('100');
    });

    it('should throw error when line item totals do not match quantity * unitPrice', () => {
      const lineItems: ReceiptLineItem[] = [
        {
          productName: 'Product',
          quantity: 2,
          unitPrice: '10',
          totalPrice: '25', // Should be 20, not 25
        },
      ];

      expect(() => {
        calculateReceiptSummary(lineItems);
      }).toThrow();
    });
  });
});
