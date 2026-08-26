/**
 * Receipt generation utility
 * Handles formatting, logo integration, and currency display
 */

import { Transaction, TransactionItem, Store, User } from '@/types';

export interface ReceiptConfig {
  width?: number; // in characters, default 40
  dateFormat?: 'short' | 'long'; // default 'short'
  includeItemCost?: boolean; // show cost price, default false
  logoMaxHeight?: number; // in lines, default 5
}

export interface Receipt {
  lines: string[];
  html: string;
  text: string;
}

/**
 * Format currency to IDR with proper localization
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date for receipt display
 */
export const formatReceiptDate = (date: Date | string, format: 'short' | 'long' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'long') {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(dateObj);
  }

  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Pad string to center it
 */
const centerText = (text: string, width: number): string => {
  const padding = Math.max(0, width - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
};

/**
 * Pad string to right align it
 */
const rightAlignText = (text: string, width: number): string => {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text;
};

/**
 * Create a separator line
 */
const createSeparator = (width: number, char: string = '-'): string => {
  return char.repeat(width);
};

/**
 * Format item line with quantity, price, and total
 */
const formatItemLine = (
  name: string,
  quantity: number,
  unitPrice: number,
  total: number,
  width: number = 40
): string[] => {
  const lines: string[] = [];
  const nameWidth = width - 20;
  const qtyWidth = 4;
  const priceWidth = 8;
  const totalWidth = 8;

  // Wrap product name if needed
  const nameLines = name.length > nameWidth ? wrapText(name, nameWidth) : [name];

  nameLines.forEach((nameLine, index) => {
    if (index === 0) {
      // First line with quantity and price
      const qtyStr = quantity.toString();
      const priceStr = formatCurrency(unitPrice).substring(0, priceWidth);
      const totalStr = formatCurrency(total).substring(0, totalWidth);

      lines.push(
        nameLine.padEnd(nameWidth) +
          qtyStr.padStart(qtyWidth) +
          priceStr.padStart(priceWidth) +
          totalStr.padStart(totalWidth)
      );
    } else {
      // Subsequent lines with just name
      lines.push(nameLine.padEnd(width));
    }
  });

  return lines;
};

/**
 * Wrap text to a specific width
 */
export const wrapText = (text: string, width: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + word).length > width) {
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  });

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines;
};

/**
 * Generate receipt text
 */
export function generateReceiptText(
  transaction: Transaction,
  store: Store,
  kasir: User,
  config: ReceiptConfig = {}
): string {
  const width = config.width || 40;
  const dateFormat = config.dateFormat || 'short';
  const lines: string[] = [];

  // Header
  lines.push(createSeparator(width, '='));
  lines.push(centerText(store.name, width));
  if (store.address) {
    const addressLines = wrapText(store.address, width - 4);
    addressLines.forEach((line) => lines.push(centerText(line, width)));
  }
  if (store.phone) {
    lines.push(centerText(`Tel: ${store.phone}`, width));
  }
  lines.push(createSeparator(width, '='));

  // Receipt info
  lines.push(`Receipt ID: ${transaction.id.substring(0, 12)}`);
  lines.push(`Date: ${formatReceiptDate(transaction.transactionDate, dateFormat)}`);
  lines.push(`Kasir: ${kasir.username}`);
  lines.push(`Payment: ${transaction.paymentMethod}`);
  lines.push(createSeparator(width));

  // Items header
  const itemHeaderLeft = 'Item';
  const itemHeaderQty = 'Qty';
  const itemHeaderPrice = 'Price';
  const itemHeaderTotal = 'Total';
  const nameWidth = width - 20;

  lines.push(itemHeaderLeft.padEnd(nameWidth) + itemHeaderQty.padStart(4) + itemHeaderPrice.padStart(8) + itemHeaderTotal.padStart(8));
  lines.push(createSeparator(width, '-'));

  // Items
  transaction.items.forEach((item) => {
    const itemLines = formatItemLine(item.productId, item.quantity, item.unitPrice, item.totalPrice, width);
    lines.push(...itemLines);
  });

  // Totals
  lines.push(createSeparator(width, '-'));
  const totalLabel = 'TOTAL';
  const totalAmount = formatCurrency(transaction.totalAmount);
  const totalLine = totalLabel + rightAlignText(totalAmount, width - totalLabel.length);
  lines.push(totalLine);
  lines.push(createSeparator(width, '='));

  // Footer
  lines.push(centerText('Thank you for your purchase!', width));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate receipt HTML
 */
export function generateReceiptHTML(
  transaction: Transaction,
  store: Store,
  kasir: User,
  config: ReceiptConfig = {}
): string {
  const dateFormat = config.dateFormat || 'short';

  let html = `
    <div class="receipt" style="font-family: monospace; padding: 20px; max-width: 400px;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <h2 style="margin: 0 0 5px 0;">${escapeHtml(store.name)}</h2>
  `;

  if (store.address) {
    html += `<p style="margin: 0; font-size: 12px;">${escapeHtml(store.address)}</p>`;
  }

  if (store.phone) {
    html += `<p style="margin: 0; font-size: 12px;">Tel: ${escapeHtml(store.phone)}</p>`;
  }

  html += `
      </div>
      
      <div style="margin-top: 10px; font-size: 12px;">
        <p><strong>Receipt ID:</strong> ${escapeHtml(transaction.id.substring(0, 12))}</p>
        <p><strong>Date:</strong> ${formatReceiptDate(transaction.transactionDate, dateFormat)}</p>
        <p><strong>Kasir:</strong> ${escapeHtml(kasir.username)}</p>
        <p><strong>Payment:</strong> ${escapeHtml(transaction.paymentMethod)}</p>
      </div>
      
      <table style="width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left; padding: 5px 0;">Item</th>
            <th style="text-align: right; padding: 5px 0;">Qty</th>
            <th style="text-align: right; padding: 5px 0;">Price</th>
            <th style="text-align: right; padding: 5px 0;">Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  transaction.items.forEach((item) => {
    html += `
          <tr>
            <td style="padding: 5px 0;">${escapeHtml(item.productId)}</td>
            <td style="text-align: right; padding: 5px 0;">${item.quantity}</td>
            <td style="text-align: right; padding: 5px 0;">${formatCurrency(item.unitPrice)}</td>
            <td style="text-align: right; padding: 5px 0;">${formatCurrency(item.totalPrice)}</td>
          </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      
      <div style="margin-top: 10px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0;">
        <p style="margin: 0; font-size: 14px; font-weight: bold;">
          <span>TOTAL:</span>
          <span style="float: right;">${formatCurrency(transaction.totalAmount)}</span>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 10px;">
        <p style="margin: 0; font-size: 12px;">Thank you for your purchase!</p>
      </div>
    </div>
  `;

  return html;
}

/**
 * Generate complete receipt object
 */
export function generateReceipt(
  transaction: Transaction,
  store: Store,
  kasir: User,
  config: ReceiptConfig = {}
): Receipt {
  const text = generateReceiptText(transaction, store, kasir, config);
  const html = generateReceiptHTML(transaction, store, kasir, config);
  const lines = text.split('\n');

  return {
    lines,
    text,
    html,
  };
}

/**
 * Helper: escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Calculate receipt dimensions
 */
export function calculateReceiptDimensions(receipt: Receipt, fontSizePixels: number = 12): {
  width: number;
  height: number;
} {
  const avgCharWidth = fontSizePixels * 0.6; // Approximate for monospace
  const lineHeight = fontSizePixels * 1.5;

  const width = Math.max(...receipt.lines.map((line) => line.length)) * avgCharWidth;
  const height = receipt.lines.length * lineHeight;

  return { width, height };
}

/**
 * Scale logo for receipt display
 */
export function scaleLogoForReceipt(
  logoUrl: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    maintainAspectRatio?: boolean;
  } = {}
): {
  url: string;
  width: number;
  height: number;
  style: string;
} {
  const maxWidth = options.maxWidth || 300;
  const maxHeight = options.maxHeight || 150;
  const maintainAspectRatio = options.maintainAspectRatio !== false;

  return {
    url: logoUrl,
    width: maxWidth,
    height: maxHeight,
    style: `
      max-width: ${maxWidth}px;
      max-height: ${maxHeight}px;
      ${maintainAspectRatio ? 'object-fit: contain;' : ''}
      display: block;
      margin: 0 auto;
    `,
  };
}

/**
 * Format receipt for printing
 */
export function formatForPrinting(receipt: Receipt): string {
  return receipt.text;
}

/**
 * Validate receipt data
 */
export function validateReceiptData(transaction: Transaction, store: Store): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate transaction
  if (!transaction.id) {
    errors.push('Transaction ID is required');
  }
  if (!transaction.items || transaction.items.length === 0) {
    errors.push('Transaction must have at least one item');
  }
  if (transaction.totalAmount <= 0) {
    errors.push('Transaction total must be greater than 0');
  }

  // Validate items
  transaction.items.forEach((item, index) => {
    if (!item.productId) {
      errors.push(`Item ${index + 1}: Product ID is required`);
    }
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    }
    if (item.unitPrice < 0) {
      errors.push(`Item ${index + 1}: Unit price cannot be negative`);
    }
    if (item.totalPrice <= 0) {
      errors.push(`Item ${index + 1}: Total price must be greater than 0`);
    }
  });

  // Validate store
  if (!store.id) {
    errors.push('Store ID is required');
  }
  if (!store.name) {
    errors.push('Store name is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
