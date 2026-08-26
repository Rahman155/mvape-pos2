/**
 * Receipt Generation Utility
 * Handles receipt calculation and generation for POS transactions
 */

import { Decimal } from 'decimal.js';

/**
 * Line item in a receipt
 */
export interface ReceiptLineItem {
  productName: string;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
}

/**
 * Receipt data structure
 */
export interface Receipt {
  transactionId: string;
  storeName: string;
  storeLogoUrl?: string;
  kasirName: string;
  transactionDate: Date;
  lineItems: ReceiptLineItem[];
  subtotal: string;
  tax?: string;
  discount?: string;
  total: string;
  paymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';
  notes?: string;
}

/**
 * Calculate total from line items
 * Uses Decimal for precise arithmetic to avoid floating point errors
 * 
 * @param lineItems - Array of line items with quantity and price
 * @returns Total as string to preserve precision
 */
export function calculateReceiptTotal(lineItems: ReceiptLineItem[]): string {
  if (!lineItems || lineItems.length === 0) {
    return '0';
  }

  try {
    const total = lineItems.reduce((sum, item) => {
      const itemTotal = new Decimal(item.totalPrice);
      return sum.plus(itemTotal);
    }, new Decimal(0));

    return total.toString();
  } catch (error) {
    throw new Error(`Invalid line item values for total calculation: ${error}`);
  }
}

/**
 * Validate that each line item's total equals quantity * unitPrice
 * 
 * @param lineItems - Array of line items to validate
 * @returns true if all line items are valid
 */
export function validateLineItems(lineItems: ReceiptLineItem[]): boolean {
  return lineItems.every((item) => {
    try {
      const expectedTotal = new Decimal(item.quantity).times(
        new Decimal(item.unitPrice)
      );
      const actualTotal = new Decimal(item.totalPrice);
      return expectedTotal.equals(actualTotal);
    } catch {
      return false;
    }
  });
}

/**
 * Calculate receipt summary with tax and discount
 * 
 * @param lineItems - Array of line items
 * @param taxRate - Tax rate as percentage (e.g., 10 for 10%)
 * @param discountAmount - Discount amount (optional)
 * @returns Receipt summary with subtotal, tax, discount, and total
 */
export interface ReceiptSummary {
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
}

export function calculateReceiptSummary(
  lineItems: ReceiptLineItem[],
  taxRate: number = 0,
  discountAmount: string | number = 0
): ReceiptSummary {
  try {
    // Calculate subtotal
    const subtotal = calculateReceiptTotal(lineItems);
    const subtotalDecimal = new Decimal(subtotal);

    // Calculate tax
    const taxDecimal = subtotalDecimal.times(new Decimal(taxRate).div(100));

    // Get discount as Decimal
    const discountDecimal = new Decimal(discountAmount);

    // Calculate total: subtotal + tax - discount
    const total = subtotalDecimal.plus(taxDecimal).minus(discountDecimal);

    return {
      subtotal,
      tax: taxDecimal.toString(),
      discount: discountDecimal.toString(),
      total: total.toString(),
    };
  } catch (error) {
    throw new Error(`Error calculating receipt summary: ${error}`);
  }
}

/**
 * Generate a receipt from transaction data
 * 
 * @param transactionId - Unique transaction identifier
 * @param storeName - Name of the store
 * @param kasirName - Name of the cashier
 * @param lineItems - Array of line items
 * @param paymentMethod - Method of payment
 * @param storeLogoUrl - Optional store logo URL
 * @param taxRate - Tax rate as percentage (default 0)
 * @param discountAmount - Discount amount (default 0)
 * @param notes - Optional additional notes
 * @returns Generated receipt object
 */
export function generateReceipt(
  transactionId: string,
  storeName: string,
  kasirName: string,
  lineItems: ReceiptLineItem[],
  paymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO',
  storeLogoUrl?: string,
  taxRate: number = 0,
  discountAmount: string | number = 0,
  notes?: string
): Receipt {
  // Validate line items
  if (!validateLineItems(lineItems)) {
    throw new Error('Invalid line items: item totals do not match quantity * unitPrice');
  }

  const summary = calculateReceiptSummary(lineItems, taxRate, discountAmount);

  return {
    transactionId,
    storeName,
    storeLogoUrl,
    kasirName,
    transactionDate: new Date(),
    lineItems,
    subtotal: summary.subtotal,
    tax: summary.tax,
    discount: summary.discount,
    total: summary.total,
    paymentMethod,
    notes,
  };
}

/**
 * Format receipt for display/printing
 * 
 * @param receipt - Receipt object
 * @returns Formatted receipt string
 */
export function formatReceiptForPrint(receipt: Receipt): string {
  const lines: string[] = [];

  lines.push('================================');
  lines.push(receipt.storeName.padStart((32 + receipt.storeName.length) / 2));
  lines.push('================================');
  lines.push('');

  lines.push(`Transaction ID: ${receipt.transactionId}`);
  lines.push(`Date: ${receipt.transactionDate.toLocaleString()}`);
  lines.push(`Kasir: ${receipt.kasirName}`);
  lines.push('');

  // Line items
  lines.push('Item                 Qty    Price     Total');
  lines.push('--------------------------------');

  receipt.lineItems.forEach((item) => {
    const itemLine = `${item.productName.substring(0, 17).padEnd(18)} ${String(item.quantity).padStart(3)} ${String(item.unitPrice).padStart(7)} ${String(item.totalPrice).padStart(9)}`;
    lines.push(itemLine);
  });

  lines.push('--------------------------------');
  lines.push(`Subtotal: ${receipt.subtotal.padStart(25)}`);

  if (receipt.tax && receipt.tax !== '0') {
    lines.push(`Tax: ${receipt.tax.padStart(32)}`);
  }

  if (receipt.discount && receipt.discount !== '0') {
    lines.push(`Discount: ${receipt.discount.padStart(28)}`);
  }

  lines.push('================================');
  lines.push(`Total: ${receipt.total.padStart(30)}`);
  lines.push('================================');

  lines.push(`Payment Method: ${receipt.paymentMethod}`);

  if (receipt.notes) {
    lines.push('');
    lines.push(`Notes: ${receipt.notes}`);
  }

  lines.push('');
  lines.push('Thank you for your purchase!');

  return lines.join('\n');
}
