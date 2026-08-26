# Payment Method Selector Component Documentation

## Overview

The `PaymentMethodSelector` component is a comprehensive payment method selection interface for the POS system. It allows cashiers to choose between three payment methods:
- **Tunai (Cash)**: Direct payment with change calculation
- **Member Credit**: Payment using a member's prepaid credit balance
- **Tempo (Credit)**: Deferred payment with due date tracking

The component provides method-specific forms that validate input and ensure data integrity before payment processing.

## Features

✅ Three payment methods (Cash, Member Credit, Tempo)
✅ Real-time change calculation for cash payments
✅ Member credit balance validation
✅ Due date calculation for tempo payments
✅ Comprehensive input validation
✅ Dark mode support
✅ Responsive mobile-first design
✅ Indonesian localization
✅ Error handling and user feedback

## Installation & Import

```typescript
import { PaymentMethodSelector, PaymentData } from '@/components/kasir/PaymentMethodSelector';
```

## Basic Usage

```typescript
import React, { useState } from 'react';
import { PaymentMethodSelector, PaymentData } from '@/components/kasir/PaymentMethodSelector';

function CheckoutPage() {
  const cartTotal = 150000; // Rp 150,000
  const members = []; // Load from API

  const handlePaymentSelect = (paymentData: PaymentData) => {
    console.log('Payment selected:', paymentData);
    // Process payment based on method
    // Proceed to transaction confirmation
  };

  return (
    <div>
      <PaymentMethodSelector
        cartTotal={cartTotal}
        members={members}
        onPaymentSelect={handlePaymentSelect}
        onCancel={() => console.log('Cancelled')}
      />
    </div>
  );
}
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `cartTotal` | `number` | Total amount of the current transaction in Rupiah (without decimals) |
| `onPaymentSelect` | `(paymentData: PaymentData) => void` | Callback function when user confirms payment selection |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `members` | `Member[]` | `[]` | Array of available members for credit payment |
| `onCancel` | `() => void` | `undefined` | Callback when user cancels the payment process |
| `isProcessing` | `boolean` | `false` | Show loading state while processing payment |
| `showProceedButton` | `boolean` | `true` | Show/hide action buttons |

## PaymentData Interface

The component returns a `PaymentData` object when a valid payment is confirmed:

```typescript
interface PaymentData {
  method: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';
  
  // For CASH method
  cash?: {
    amountReceived: number;    // Amount customer provided in Rupiah
    change: number;             // Change to be returned in Rupiah
  };
  
  // For MEMBER_CREDIT method
  memberCredit?: {
    memberId: string;           // ID of selected member
    memberName: string;         // Name of member
    usedCredit: number;         // Amount deducted from member's credit
  };
  
  // For TEMPO method
  tempo?: {
    customerName: string;       // Name of customer
    customerPhone: string;      // Phone number of customer
    durationDays: number;       // Number of days for payment term
    dueDate: string;           // Due date in YYYY-MM-DD format
  };
}
```

## Component Structure

### Cash Payment Form

Displays when "Tunai (Cash)" is selected:

- **Jumlah Uang Masuk (Amount Received)** - Numeric input field
- **Kembalian (Change)** - Calculated and displayed automatically
- Real-time validation showing error if amount is insufficient

**Validation Rules:**
- Amount received is required
- Amount must be >= cart total
- Change is automatically calculated

**Example Payment:**
```typescript
{
  method: 'CASH',
  cash: {
    amountReceived: 200000,
    change: 50000  // If cart total is 150000
  }
}
```

### Member Credit Payment Form

Displays when "Member Credit" is selected:

- **Member Search** - Search by name, member number, or phone
- **Member Selection** - Dropdown showing available members with their credit balance
- **Member Info Card** - Shows selected member details and credit validation

**Validation Rules:**
- Member must be selected
- Member's credit balance must be >= cart total
- Search filters members in real-time

**Example Payment:**
```typescript
{
  method: 'MEMBER_CREDIT',
  memberCredit: {
    memberId: 'member-123',
    memberName: 'John Doe',
    usedCredit: 150000
  }
}
```

**Member Search Features:**
- Search by full name: "John Doe" or "john"
- Search by member number: "M001"
- Search by phone: "081234567890" or "234567"
- Case-insensitive matching
- Real-time filtering

### Tempo Payment Form

Displays when "Tempo (Credit)" is selected:

- **Nama Pelanggan (Customer Name)** - Text input for customer name
- **Nomor Telepon Pelanggan (Customer Phone)** - Phone number input
- **Durasi Pembayaran (Payment Duration)** - Select from predefined options:
  - 3 Hari (3 Days)
  - 7 Hari (1 Week)
  - 14 Hari (2 Weeks)
  - 30 Hari (1 Month)
  - 60 Hari (2 Months)
  - 90 Hari (3 Months)
- **Due Date Display** - Shows calculated due date

**Validation Rules:**
- Customer name is required and must be non-empty
- Customer phone is required and must be non-empty
- Payment duration must be selected and be a positive number
- Whitespace is automatically trimmed

**Example Payment:**
```typescript
{
  method: 'TEMPO',
  tempo: {
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    durationDays: 14,
    dueDate: '2024-01-15'
  }
}
```

## Styling & Customization

### CSS Classes

The component uses TailwindCSS utility classes for styling. Key class patterns:

- **Dark mode**: Uses `dark:` prefixed classes
- **Responsive**: Mobile-first design with responsive padding/sizing
- **Accessibility**: Proper focus states and contrast ratios

### Dark Mode Support

Dark mode is automatically applied when:
1. The component is within a `.dark` class parent
2. Dark mode is configured in your theme provider

The component automatically adjusts:
- Background colors
- Text colors
- Border colors
- Interactive element colors

### Customization Example

```typescript
import { PaymentMethodSelector } from '@/components/kasir/PaymentMethodSelector';
import { cn } from '@/lib/utils';

function CustomPaymentSelector() {
  return (
    <div className="custom-theme">
      <PaymentMethodSelector
        cartTotal={150000}
        members={members}
        onPaymentSelect={handlePayment}
      />
    </div>
  );
}
```

## Integration with Cart Store

### With Zustand Cart Store

```typescript
import { useCartStore } from '@/stores/cart.store';
import { PaymentMethodSelector, PaymentData } from '@/components/kasir/PaymentMethodSelector';

function Checkout() {
  const { total } = useCartStore();
  const [members, setMembers] = useState([]);

  useEffect(() => {
    // Load members from API
    fetchMembers().then(setMembers);
  }, []);

  const handlePaymentSelect = (paymentData: PaymentData) => {
    // Proceed to transaction confirmation/processing
    console.log('Processing payment:', paymentData);
  };

  return (
    <PaymentMethodSelector
      cartTotal={total}
      members={members}
      onPaymentSelect={handlePaymentSelect}
    />
  );
}
```

## Error Handling

The component provides comprehensive error handling:

### Built-in Validations

1. **Cash Payment**
   - "Amount received is required for cash payment"
   - "Amount received is less than cart total"

2. **Member Credit Payment**
   - "Please select a member"
   - "Member has insufficient credit balance. Available: Rp X | Required: Rp Y"

3. **Tempo Payment**
   - "Customer name is required for tempo payment"
   - "Customer phone is required for tempo payment"
   - "Payment duration is required for tempo payment"
   - "Payment duration must be a positive number"

### Error Display

- Errors appear in a dismissible Alert component
- Errors are cleared when user modifies form fields
- Validation error state applied to invalid inputs

```typescript
// Handle errors in parent component
<PaymentMethodSelector
  cartTotal={total}
  onPaymentSelect={(paymentData) => {
    try {
      processPayment(paymentData);
    } catch (error) {
      // Show error to user
      console.error('Payment processing failed:', error);
    }
  }}
/>
```

## Mobile Optimization

The component is fully responsive with mobile-first design:

- **Mobile Layout**: Stacked card layout with full-width inputs
- **Tablet Layout**: Optimized spacing and touch targets (min 44x44px)
- **Desktop Layout**: Additional information density

### Mobile Features

- Touch-friendly buttons and inputs
- Appropriate text sizing for readability
- Keyboard-friendly form navigation
- Virtual keyboard space consideration

## Performance Considerations

### Optimization Tips

1. **Memoization**: Wrap parent component with React.memo if payment data doesn't change
2. **Member Filtering**: Pre-filter large member lists if needed
3. **Lazy Loading**: Load members asynchronously

```typescript
// Example with memoization
const MemoizedPaymentSelector = React.memo(PaymentMethodSelector);
```

## Accessibility

The component follows WCAG 2.1 Level AA standards:

- ✅ Semantic HTML with proper labels
- ✅ Keyboard navigation support
- ✅ ARIA attributes for screen readers
- ✅ Color contrast meets WCAG standards
- ✅ Focus indicators visible in all states

## Testing

### Unit Tests

Comprehensive tests are provided in `PaymentMethodSelector.test.tsx`:

```bash
npm run test -- PaymentMethodSelector.test.tsx
```

**Test Coverage:**
- Payment method selection
- Form rendering for each method
- Validation logic
- Error handling
- User interactions
- Change calculation
- Member credit validation
- Tempo date calculation
- Dark mode support

### Example Test

```typescript
it('should calculate change correctly for cash payment', async () => {
  const { getByPlaceholderText, getByText } = render(
    <PaymentMethodSelector
      cartTotal={100000}
      onPaymentSelect={jest.fn()}
    />
  );

  const input = getByPlaceholderText('0');
  await userEvent.type(input, '150000');

  expect(getByText(/Rp 50.000/)).toBeInTheDocument();
});
```

## Common Use Cases

### Complete Checkout Flow

```typescript
function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const handlePaymentSelect = (paymentData: PaymentData) => {
    setSelectedPayment(paymentData);
    // Navigate to confirmation or process transaction
  };

  if (selectedPayment) {
    return <TransactionConfirmation paymentData={selectedPayment} />;
  }

  return (
    <div className="checkout-container">
      <div className="cart-section">
        <CartSummary items={items} />
      </div>
      
      <div className="payment-section">
        <PaymentMethodSelector
          cartTotal={total}
          members={members}
          onPaymentSelect={handlePaymentSelect}
          onCancel={() => clearCart()}
        />
      </div>
    </div>
  );
}
```

### With API Integration

```typescript
async function processPayment(paymentData: PaymentData) {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cartItems,
      paymentData,
      storeId: currentStore.id,
      kasirId: currentUser.id,
    }),
  });

  const transaction = await response.json();
  return transaction;
}
```

## Troubleshooting

### Common Issues

**1. Members not showing in dropdown**
- Ensure `members` prop is properly passed
- Check member array is not empty
- Verify Member interface matches expected shape

**2. Change calculation not working**
- Verify `cartTotal` is a number (not string)
- Check Input component accepts numeric values
- Ensure onChange handlers are properly connected

**3. Dark mode not applying**
- Add `.dark` class to parent element
- Check theme configuration
- Verify TailwindCSS dark mode is enabled

### Debug Mode

```typescript
// Add logging to track payment flow
<PaymentMethodSelector
  cartTotal={total}
  members={members}
  onPaymentSelect={(data) => {
    console.log('Payment selected:', data);
    handlePayment(data);
  }}
/>
```

## Requirements Coverage

This component implements **Requirement 7.5** from the specification:

**Requirement 7.5:** "WHEN kasir memilih metode pembayaran (tunai, tempo, atau member), THE POS_System SHALL menampilkan form pembayaran yang sesuai"

✅ Supports all three payment methods (Cash, Tempo, Member Credit)
✅ Shows appropriate form for each method
✅ Displays cart total
✅ Integrates with member data
✅ Validates input per payment type
✅ Supports dark mode
✅ Mobile-optimized design
✅ Includes comprehensive documentation

## API Reference

See the TypeScript interfaces for complete API documentation:
- `PaymentMethodSelector` - Main component
- `PaymentData` - Return value interface
- `PaymentMethodSelectorProps` - Component props interface

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

## License

Part of the Vapestore POS PWA system.

## Version

Current: 1.0.0
Last Updated: 2024
