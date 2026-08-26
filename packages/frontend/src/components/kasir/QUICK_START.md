# PaymentMethodSelector - Quick Start Guide

## 30-Second Setup

```typescript
import { PaymentMethodSelector, PaymentData } from '@/components/kasir/PaymentMethodSelector';

function Checkout() {
  const handlePaymentSelect = (paymentData: PaymentData) => {
    console.log('Payment:', paymentData);
    // Process payment
  };

  return (
    <PaymentMethodSelector
      cartTotal={150000}
      members={members}
      onPaymentSelect={handlePaymentSelect}
    />
  );
}
```

## Required Props

| Prop | Type | Example |
|------|------|---------|
| `cartTotal` | `number` | `150000` |
| `onPaymentSelect` | `function` | `(data) => { ... }` |

## Optional Props

| Prop | Type | Default |
|------|------|---------|
| `members` | `Member[]` | `[]` |
| `onCancel` | `function` | `undefined` |
| `isProcessing` | `boolean` | `false` |
| `showProceedButton` | `boolean` | `true` |

## Three Payment Methods

### 1. Cash (Tunai)
```typescript
{
  method: 'CASH',
  cash: {
    amountReceived: 200000,
    change: 50000
  }
}
```

### 2. Member Credit
```typescript
{
  method: 'MEMBER_CREDIT',
  memberCredit: {
    memberId: '123',
    memberName: 'John Doe',
    usedCredit: 150000
  }
}
```

### 3. Tempo (Credit)
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

## Common Tasks

### Load Members from API

```typescript
useEffect(() => {
  fetchMembers()
    .then(setMembers)
    .catch(err => console.error(err));
}, []);
```

### Process Payment

```typescript
const handlePaymentSelect = async (paymentData) => {
  try {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        cartTotal,
        paymentData,
        items: cartItems
      })
    });
    
    const transaction = await response.json();
    console.log('Transaction created:', transaction.id);
  } catch (error) {
    console.error('Payment failed:', error);
  }
};
```

### Show Loading State

```typescript
const [isProcessing, setIsProcessing] = useState(false);

const handlePaymentSelect = async (paymentData) => {
  setIsProcessing(true);
  try {
    await processPayment(paymentData);
  } finally {
    setIsProcessing(false);
  }
};

return (
  <PaymentMethodSelector
    cartTotal={total}
    onPaymentSelect={handlePaymentSelect}
    isProcessing={isProcessing}
  />
);
```

## Features at a Glance

✅ Three payment methods
✅ Real-time validation
✅ Change calculation
✅ Member filtering
✅ Responsive design
✅ Dark mode support
✅ Error handling
✅ Mobile optimized

## Import Locations

```typescript
// Component
import { PaymentMethodSelector } from '@/components/kasir/PaymentMethodSelector';

// Types
import { PaymentData, PaymentMethodSelectorProps } from '@/components/kasir/PaymentMethodSelector';

// Example
import { CheckoutFlowExample } from '@/components/kasir/PaymentMethodSelector.example';
```

## Validation Rules

**Cash**: Amount must be >= cart total

**Member**: 
- Must select a member
- Member credit >= cart total

**Tempo**:
- Customer name required
- Phone number required
- Duration required

## Styling

Component uses TailwindCSS:
- Dark mode: `.dark:` prefix classes
- Responsive: Mobile-first design
- Colors: Blue/green primary, red error states

## Accessibility

- Keyboard navigation ✅
- Screen reader support ✅
- WCAG AA contrast ✅
- Focus indicators ✅

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Members not showing | Pass `members` prop correctly |
| Change not calculating | Ensure `cartTotal` is number |
| Dark mode not working | Add `.dark` to parent |
| Type errors | Import `PaymentData` type |

## See Also

- Full documentation: `PAYMENT_SELECTOR_DOCUMENTATION.md`
- Examples: `PaymentMethodSelector.example.tsx`
- Tests: `__tests__/PaymentMethodSelector.test.tsx`
- Implementation: `TASK_23_IMPLEMENTATION_SUMMARY.md`
