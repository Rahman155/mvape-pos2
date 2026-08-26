# CashPaymentForm Component Documentation

## Overview

The `CashPaymentForm` component is a specialized payment form for accepting cash transactions in the Vapestore POS system. It validates cash amounts, calculates change in real-time, and provides clear user feedback for error conditions.

**Validates:** Requirement 7.6 (Cash Payment Processing)

---

## Features

✅ **Amount Input** - Numeric input field for accepting cash amount
✅ **Real-Time Change Calculation** - Instantly shows change amount
✅ **Rp Currency Formatting** - Proper Indonesian Rupiah formatting
✅ **Comprehensive Validation** - Ensures amount >= cart total
✅ **Error Handling** - Clear error messages with retry capability
✅ **Loading States** - Shows processing indicator during submission
✅ **Dark Mode Support** - Full dark mode/light mode compatibility
✅ **Responsive Design** - Mobile-optimized with touch support
✅ **Accessibility** - ARIA labels and keyboard shortcuts (Enter to submit)
✅ **Localization** - Indonesian language support

---

## Installation & Setup

### Basic Usage

```typescript
import { CashPaymentForm } from '@/components/kasir/CashPaymentForm';

export function CheckoutPage() {
  const handlePaymentConfirm = (paymentData) => {
    console.log('Payment received:', paymentData);
    // Process payment...
  };

  return (
    <CashPaymentForm
      totalAmount={50000}
      onPaymentConfirm={handlePaymentConfirm}
      onCancel={() => console.log('Cancelled')}
    />
  );
}
```

### Props

```typescript
interface CashPaymentFormProps {
  /** Total amount to be paid (cart total in Rupiah) */
  totalAmount: number;
  
  /** Callback when payment is confirmed with valid data */
  onPaymentConfirm: (paymentData: CashPaymentData) => void;
  
  /** Callback to cancel payment */
  onCancel?: () => void;
  
  /** Show loading state (disables input, shows spinner) */
  isProcessing?: boolean;
  
  /** Custom CSS class name */
  className?: string;
}

interface CashPaymentData {
  amountReceived: number;    // Amount customer provided
  change: number;            // Calculated change amount
  totalAmount: number;       // Original total amount
}
```

---

## Usage Examples

### Example 1: Basic Payment Form

```tsx
import { CashPaymentForm } from '@/components/kasir/CashPaymentForm';
import { useState } from 'react';

export function PaymentDialog() {
  const [isProcessing, setIsProcessing] = useState(false);
  const cartTotal = 125000;

  const handlePaymentConfirm = async (paymentData) => {
    setIsProcessing(true);
    try {
      // Send to backend
      await submitTransaction(paymentData);
      console.log(`Payment confirmed. Change: Rp ${paymentData.change.toLocaleString('id-ID')}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <CashPaymentForm
      totalAmount={cartTotal}
      onPaymentConfirm={handlePaymentConfirm}
      onCancel={() => goBack()}
      isProcessing={isProcessing}
    />
  );
}
```

### Example 2: With Success Toast

```tsx
import { CashPaymentForm } from '@/components/kasir/CashPaymentForm';
import toast from 'react-hot-toast';

export function PaymentStep() {
  const handlePaymentConfirm = (paymentData) => {
    // Show success message with change amount
    toast.success(
      `Pembayaran diterima. Kembalian: Rp ${paymentData.change.toLocaleString('id-ID')}`
    );
    
    // Process transaction
    submitPayment(paymentData);
  };

  return (
    <CashPaymentForm
      totalAmount={75000}
      onPaymentConfirm={handlePaymentConfirm}
      onCancel={() => toast('Pembayaran dibatalkan')}
    />
  );
}
```

### Example 3: Custom Styling

```tsx
<CashPaymentForm
  totalAmount={50000}
  onPaymentConfirm={handlePayment}
  className="max-w-md mx-auto p-4 rounded-lg shadow-lg"
/>
```

---

## Component Behavior

### State Management

The component uses React hooks for state management:

- **amountReceived**: Current input value
- **error**: Validation error message
- **touched**: Tracks if user has interacted with input

### Validation Rules

The form validates that:

1. **Amount is provided** - Input cannot be empty
2. **Amount is numeric** - Only valid numbers accepted
3. **Amount is positive** - Must be > 0
4. **Amount is sufficient** - Must be >= cart total

### Change Calculation

Change is calculated in real-time as the user types:

```
Change = amountReceived - totalAmount
If Change > 0: Show "Kembalian" (Change) amount
If Change = 0: Show 0 change
If Change < 0: Show "Kurang" (Shortage) amount and error
```

### Input Validation

```
Input value: "75000"
Total: 50000
Change: 25000
Status: ✅ Valid - Button enabled

Input value: "30000"
Total: 50000
Shortage: 20000
Status: ❌ Invalid - Button disabled, error shown
```

---

## Visual States

### Success State (Valid Amount)

```
┌─────────────────────────────────┐
│ Total Pembelian                 │
│ Rp 50,000                       │
└─────────────────────────────────┘

Jumlah Uang Masuk (Rp) *
[75000]

┌─────────────────────────────────┐
│ Uang Masuk:        Rp 75,000    │
│ ─────────────────────────────    │
│ Kembalian:         Rp 25,000    │
│                                 │
│ ✅ Uang cukup                    │
└─────────────────────────────────┘

[Batal]  [Konfirmasi Pembayaran] ✓
```

### Error State (Insufficient Amount)

```
┌─────────────────────────────────┐
│ ❌ Kesalahan Validasi           │
│ Uang tidak cukup. Kurang:       │
│ Rp 20,000                       │
└─────────────────────────────────┘

Jumlah Uang Masuk (Rp) *
[30000] ⚠️

┌─────────────────────────────────┐
│ Uang Masuk:        Rp 30,000    │
│ ─────────────────────────────    │
│ Kurang:            Rp 20,000    │
│                                 │
│ ❌ Uang tidak cukup              │
└─────────────────────────────────┘

[Batal]  [Konfirmasi Pembayaran] ✗
```

### Processing State

```
┌─────────────────────────────────┐
│ Total Pembelian                 │
│ Rp 50,000                       │
└─────────────────────────────────┘

Jumlah Uang Masuk (Rp) * [disabled]
[75000]

┌─────────────────────────────────┐
│ Uang Masuk:        Rp 75,000    │
│ ─────────────────────────────    │
│ Kembalian:         Rp 25,000    │
└─────────────────────────────────┘

[Batal]  [⟳ Memproses...] ✗
```

---

## Keyboard Shortcuts

| Key | Behavior |
|-----|----------|
| **Enter** | Submit form (only if amount is valid) |
| **Escape** | Call onCancel (if provided) |

Example:

```
User types: 75000
User presses Enter
→ Form submits with valid data
```

---

## Currency Formatting

All currency values are formatted using Indonesian locale (id-ID):

```typescript
formatCurrency(50000)  // Returns: "Rp 50.000"
formatCurrency(1500)   // Returns: "Rp 1.500"
formatCurrency(100)    // Returns: "Rp 100"
```

The component uses `Number.toLocaleString('id-ID')` for display.

---

## Responsive Design

### Mobile (< 768px)

- Full width input fields
- Touch-optimized button size (44x44px minimum)
- Helper text: "Tekan Enter untuk konfirmasi cepat"
- Stacked layout for better legibility

### Tablet (768px - 1024px)

- Medium width container
- Horizontal button layout
- Side-by-side labels and values

### Desktop (> 1024px)

- Max-width container (centered)
- Spacious padding
- Full visibility of all elements

---

## Dark Mode

The component fully supports dark mode with automatic theme detection:

```tsx
// Light mode colors
- Text: gray-900 / gray-700
- Background: white / blue-50
- Borders: gray-200

// Dark mode colors (dark:* classes)
- Text: white / gray-300
- Background: gray-900 / blue-900
- Borders: gray-700
```

Enable dark mode in parent component or app-wide with:

```html
<html class="dark">
  <!-- Your app -->
</html>
```

---

## Accessibility

### ARIA Labels

All interactive elements have proper ARIA labels:

```typescript
aria-label="Jumlah uang masuk"               // Input field
aria-label="Batal pembayaran"                // Cancel button
aria-label="Konfirmasi pembayaran tunai"     // Confirm button
```

### Keyboard Navigation

- Tab through fields in order: Input → Cancel → Confirm
- Enter key on input to submit
- Escape key to cancel

### Screen Reader Support

- Form labels are properly associated with inputs
- Error messages are announced
- Loading state announced via button text change
- Status changes communicated via error alerts

---

## Error Messages

| Error | Message | Condition |
|-------|---------|-----------|
| Empty Input | "Jumlah uang masuk diperlukan" | No value entered |
| Invalid Format | "Jumlah uang harus berupa angka yang valid" | Non-numeric input |
| Negative/Zero | "Jumlah uang harus lebih dari 0" | Amount ≤ 0 |
| Insufficient | "Uang tidak cukup. Kurang: Rp X.XXX" | Amount < total |

---

## Testing

The component includes comprehensive unit tests covering:

### Test Coverage

- ✅ Component rendering
- ✅ Currency formatting
- ✅ Amount input handling
- ✅ Change calculation accuracy
- ✅ Validation logic
- ✅ Error message display
- ✅ Form submission
- ✅ Cancel functionality
- ✅ Keyboard shortcuts (Enter key)
- ✅ Loading states
- ✅ Edge cases (large amounts, decimals)
- ✅ Dark mode styling
- ✅ Accessibility attributes

### Running Tests

To set up and run tests:

```bash
# Install testing dependencies
pnpm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Add test script to frontend/package.json
"test": "jest --run"

# Run tests for this component
pnpm test -- CashPaymentForm.test.tsx

# Run with coverage
pnpm test -- --coverage CashPaymentForm
```

See `CashPaymentForm.test.tsx` for complete test suite.

---

## Integration with PaymentMethodSelector

The `CashPaymentForm` is designed to work seamlessly with the parent `PaymentMethodSelector`:

```tsx
// In PaymentMethodSelector.tsx
{selectedMethod === 'CASH' && (
  <Card>
    <CashPaymentForm
      totalAmount={cartTotal}
      onPaymentConfirm={(data) => {
        const paymentData: PaymentData = {
          method: 'CASH',
          cash: {
            amountReceived: data.amountReceived,
            change: data.change,
          },
        };
        onPaymentSelect(paymentData);
      }}
    />
  </Card>
)}
```

---

## Performance Considerations

- **Change calculation**: O(1) - Direct arithmetic
- **Rendering**: Optimized with React hooks
- **No external dependencies**: Uses only built-in utilities
- **Re-render optimization**: Only when state changes

---

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support (iOS Safari, Chrome Mobile)

---

## Common Issues & Solutions

### Issue: Change calculation shows wrong value

**Solution:** Ensure `totalAmount` prop is a valid number:

```tsx
// ❌ Wrong
<CashPaymentForm totalAmount="50000" ... />

// ✅ Correct
<CashPaymentForm totalAmount={50000} ... />
```

### Issue: Form doesn't submit with Enter key

**Solution:** Ensure component has focus and amount is valid:

```tsx
// Amount must be:
1. Non-empty
2. Numeric
3. > 0
4. >= totalAmount
```

### Issue: Dark mode classes not applied

**Solution:** Ensure dark mode context is set up in parent:

```tsx
// In your app root (layout.tsx)
<html className={isDarkMode ? 'dark' : ''}>
  {/* Your app */}
</html>
```

---

## API Reference

### Component Props

```typescript
interface CashPaymentFormProps {
  totalAmount: number;
  onPaymentConfirm: (paymentData: CashPaymentData) => void;
  onCancel?: () => void;
  isProcessing?: boolean;
  className?: string;
}
```

### Callback Data

```typescript
interface CashPaymentData {
  amountReceived: number;  // User's input amount
  change: number;          // Change to return (amountReceived - totalAmount)
  totalAmount: number;     // Original cart total
}
```

### Example Callback Handler

```typescript
const handlePaymentConfirm = (paymentData: CashPaymentData) => {
  const { amountReceived, change, totalAmount } = paymentData;
  
  // Validate on backend
  if (amountReceived < totalAmount) {
    console.error('Insufficient payment');
    return;
  }
  
  // Process transaction
  createTransaction({
    amount: totalAmount,
    paymentMethod: 'CASH',
    amountReceived,
    change,
  });
};
```

---

## File Structure

```
src/components/kasir/
├── CashPaymentForm.tsx              # Main component
├── CashPaymentForm.test.tsx         # Unit tests
└── CASH_PAYMENT_FORM_DOCUMENTATION.md  # This file
```

---

## Requirements Coverage

This component fully implements Requirement 7.6 from the specification:

> **7.6 Cash Payment Processing**
>
> IF pembayaran tunai, THEN THE POS_System SHALL menampilkan form untuk input jumlah uang masuk dan hitung kembalian

✅ Form for cash amount input
✅ Real-time change calculation
✅ Validation of sufficient amount
✅ Clear error display
✅ Mobile-optimized
✅ Dark mode support
✅ Responsive design
✅ Comprehensive testing

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial implementation |

---

## License

Part of Vapestore POS PWA System - All rights reserved.

---

## Support & Contribution

For issues or feature requests:
1. Check this documentation
2. Review test cases in `CashPaymentForm.test.tsx`
3. Contact development team

---

## Related Components

- `PaymentMethodSelector` - Parent component for payment method selection
- `Input` - Base input component used within
- `Button` - Action buttons
- `Card` - Container layout
- `Alert` - Error display

---

Last Updated: 2024
Documentation Version: 1.0
