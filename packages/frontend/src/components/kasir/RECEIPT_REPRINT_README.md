# Receipt Reprint Functionality

This document describes the receipt reprint feature, which allows users to reprint transaction receipts with current details (including any edits).

## Overview

The receipt reprint functionality provides a complete solution for reprinting receipts from transaction history. Key features include:

- **Receipt Preview**: View the receipt before printing
- **Print Functionality**: Open browser print dialog for thermal or regular printers
- **PDF Export**: Export receipt as PDF file for archival or email
- **Clipboard Copy**: Copy receipt text to clipboard for manual sharing
- **Current Details**: Receipt always shows the latest transaction details (after any edits)
- **Edit Indicator**: Visual indicator showing when a transaction has been modified

## Components

### ReceiptReprintModal
Main modal component that displays receipt preview and action buttons.

```typescript
import { ReceiptReprintModal } from '@/components/kasir/ReceiptReprintModal';

<ReceiptReprintModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  transaction={transaction}
  store={store}
  kasir={kasir}
  showEditedIndicator={true}
/>
```

**Props:**
- `isOpen` (boolean): Whether modal is visible
- `onClose` (function): Callback when modal should close
- `transaction` (Transaction): Transaction object with current details
- `store` (Store): Store information for receipt header
- `kasir` (User): Cashier information
- `showEditedIndicator` (boolean, optional): Show indicator if transaction was edited

### ReprintButton
Standalone button component for triggering receipt reprint.

```typescript
import { ReprintButton } from '@/components/kasir/ReprintButton';

<ReprintButton
  transaction={transaction}
  store={store}
  kasir={kasir}
  variant="secondary"
  showEditedBadge={true}
/>
```

**Props:**
- `transaction` (Transaction): Transaction to reprint
- `store` (Store): Store information
- `kasir` (User): Cashier information
- `size` (string, optional): Button size - 'sm' | 'md' | 'lg'
- `variant` (string, optional): Button style - 'primary' | 'secondary' | 'ghost' | 'danger'
- `showEditedBadge` (boolean, optional): Show "Edited" badge on button

## Utilities

### receiptPrinting.ts
Core printing utilities for various output formats.

#### printReceipt()
Opens browser print dialog.

```typescript
import { printReceipt } from '@/lib/receiptPrinting';

const receipt = generateReceipt(transaction, store, kasir);
printReceipt(receipt, 'Receipt Title');
```

#### exportReceiptAsPDF()
Exports receipt as PDF file (optimized for thermal printers - 80mm width).

```typescript
import { exportReceiptAsPDF } from '@/lib/receiptPrinting';

const receipt = generateReceipt(transaction, store, kasir);
exportReceiptAsPDF(receipt, 'receipt-file-name');
```

#### previewReceipt()
Opens receipt in new window for preview before printing.

```typescript
import { previewReceipt } from '@/lib/receiptPrinting';

const receipt = generateReceipt(transaction, store, kasir);
previewReceipt(receipt, 'Preview Title');
```

#### copyReceiptToClipboard()
Copies receipt text to clipboard.

```typescript
import { copyReceiptToClipboard } from '@/lib/receiptPrinting';

const receipt = generateReceipt(transaction, store, kasir);
await copyReceiptToClipboard(receipt);
```

#### getPrintCapabilities()
Detects browser capabilities for printing.

```typescript
import { getPrintCapabilities } from '@/lib/receiptPrinting';

const caps = getPrintCapabilities();
if (caps.canPrint) {
  // Show print button
}
if (caps.canExportPDF) {
  // Show PDF export button
}
```

## Integration in Transaction History

To add receipt reprint functionality to transaction history/detail views:

```typescript
import { ReprintButton } from '@/components/kasir/ReprintButton';

function TransactionDetailView({ transaction, store, kasir }) {
  return (
    <div>
      {/* Transaction details */}
      <div>
        <h2>Transaction {transaction.id}</h2>
        <p>Total: {formatCurrency(transaction.totalAmount)}</p>
        {transaction.isEdited && <span>✏️ Edited</span>}
      </div>

      {/* Action buttons including reprint */}
      <div className="flex gap-2">
        <ReprintButton
          transaction={transaction}
          store={store}
          kasir={kasir}
          variant="secondary"
        />
        <button onClick={handleEditClick}>Edit</button>
      </div>
    </div>
  );
}
```

## Receipt with Current Details

The receipt reprint feature ensures that the printed receipt always reflects the current state of the transaction, including any edits made:

1. **Original Transaction**: User completes a transaction
2. **User Edits**: User or authorized person edits transaction details (price, quantity, etc.)
3. **Reprint**: When user clicks reprint, the receipt shows:
   - ✓ Current total amount (after edits)
   - ✓ Current items and quantities (after edits)
   - ✓ Edit indicator showing when/who edited
   - ✓ Original transaction ID (unchanged)

### Example: Receipt After Price Edit

Original receipt:
```
Transaction ID: TXN-123
Item: Vape Mod - Qty: 1 - Price: 450,000
Total: 450,000
```

After price edit to 400,000 and reprint:
```
Transaction ID: TXN-123
Item: Vape Mod - Qty: 1 - Price: 400,000
Total: 400,000
[Edited indicator shown in modal]
```

## Print Capabilities

The system automatically detects browser capabilities and shows/disables buttons accordingly:

- **Print**: Browser's native print dialog (most reliable)
- **Preview**: Opens receipt in new window before printing
- **PDF Export**: Downloads as PDF (optimized for 80mm thermal printers)
- **Copy**: Copies text to clipboard (fallback option)

## Testing

### Unit Tests
- `receiptGenerator.test.ts`: Tests receipt generation and formatting
- `receiptPrinting.test.ts`: Tests print dialog, PDF export, and clipboard operations
- `transactionEditing.test.ts`: Tests transaction editing and data integrity

### Component Tests
- `ReceiptReprintModal.test.tsx`: Tests modal rendering, interactions, and capabilities

Run tests:
```bash
npm test
```

## Browser Support

Receipt reprint functionality works across modern browsers:

- ✓ Chrome/Chromium (all features)
- ✓ Firefox (all features)
- ✓ Safari (all features)
- ✓ Edge (all features)

**Note**: Print functionality may be limited in Electron or wrapped browser environments. The system automatically detects and shows available features.

## Thermal Printer Optimization

The PDF export is optimized for thermal receipt printers (80mm width):

- **Paper Width**: 80mm (standard thermal printer)
- **Paper Height**: Auto-calculated based on content
- **Font Size**: 8pt (readable on thermal printers)
- **Margins**: 5mm on all sides
- **Line Wrapping**: Automatic for long product names

## Security Considerations

- Receipt content is generated client-side (no PII sent to print services)
- Print dialogs are browser-native (secure)
- PDF generation uses jsPDF library (no external services)
- Clipboard operations use modern Clipboard API (user permission required)

## Error Handling

The system handles various error scenarios:

- **Receipt Generation Errors**: Shows error message in modal
- **Print Window Blocked**: Alerts user to check browser popup settings
- **Clipboard Denied**: Shows error message (user may need to grant clipboard permissions)
- **PDF Generation Errors**: Shows error message and falls back to other options

## Performance

- Receipt generation: < 100ms
- PDF export: < 500ms
- Print dialog: instant (browser-native)
- Clipboard copy: instant

## Future Enhancements

Possible future improvements:
- Email receipt directly from modal
- QR code for receipt verification
- Receipt template customization
- Multi-language receipt support
- Automatic receipt archival
