# Payment Method Filter Component Documentation

## Overview

The `PaymentMethodFilter` component provides a flexible, reusable filter interface for selecting payment methods in the transaction history view. It implements Requirement 8.3 of the Vapestore POS specification, allowing kasir users to filter transactions by payment method(s).

## Requirement Coverage

**Requirement 8.3: Payment Method Filtering**
- WHEN kasir memilih filter berdasarkan metode pembayaran
- THE POS_System SHALL menampilkan hanya transaksi dengan metode tersebut

### Acceptance Criteria Met
- ✅ Filter component displays all available payment methods (CASH, MEMBER_CREDIT, TEMPO)
- ✅ Users can select one or multiple payment methods
- ✅ Selected filters are visually indicated
- ✅ Clear functionality removes all selections
- ✅ Supports integration with other filters (date range)

## Payment Methods

The component supports three payment methods:

1. **CASH** - Direct cash payment
   - ID: `CASH`
   - Color: Blue

2. **MEMBER_CREDIT** - Payment using member credit balance
   - ID: `MEMBER_CREDIT`
   - Color: Green

3. **TEMPO** - Deferred payment (credit terms)
   - ID: `TEMPO`
   - Color: Purple

## Component Props

```typescript
interface PaymentMethodFilterProps {
  /**
   * Selected payment methods (array of method IDs)
   */
  selectedMethods: string[];

  /**
   * Callback when filter selection changes
   */
  onChange: (methods: string[]) => void;

  /**
   * Callback to clear all selections
   */
  onClear?: () => void;

  /**
   * Whether component is in loading state
   */
  disabled?: boolean;

  /**
   * Whether to allow multiple selections (default: true)
   */
  allowMultiple?: boolean;

  /**
   * Display variant: 'compact' or 'expanded' (default: 'expanded')
   */
  variant?: 'compact' | 'expanded';
}
```

## Usage Examples

### Basic Usage (Multiple Selection)

```tsx
import PaymentMethodFilter from '@/components/kasir/PaymentMethodFilter';
import { useState } from 'react';

export function TransactionFilter() {
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  return (
    <PaymentMethodFilter
      selectedMethods={selectedMethods}
      onChange={setSelectedMethods}
      allowMultiple={true}
      variant="expanded"
    />
  );
}
```

### Single Selection Mode

```tsx
const [selectedMethod, setSelectedMethod] = useState<string[]>([]);

return (
  <PaymentMethodFilter
    selectedMethods={selectedMethod}
    onChange={setSelectedMethod}
    allowMultiple={false}
    variant="compact"
  />
);
```

### With Clear Functionality

```tsx
const handleClear = () => {
  setSelectedMethods([]);
};

return (
  <PaymentMethodFilter
    selectedMethods={selectedMethods}
    onChange={setSelectedMethods}
    onClear={handleClear}
    disabled={isLoading}
    variant="expanded"
  />
);
```

## Display Variants

### Expanded Variant
- Shows checkboxes with descriptions
- Displays payment method details
- Shows selection count
- Best for desktop and tablet views
- Default variant

```tsx
<PaymentMethodFilter
  selectedMethods={selectedMethods}
  onChange={setSelectedMethods}
  variant="expanded"
/>
```

### Compact Variant
- Shows methods as inline buttons
- Minimal styling
- Ideal for mobile and space-constrained layouts
- Quick toggle interaction

```tsx
<PaymentMethodFilter
  selectedMethods={selectedMethods}
  onChange={setSelectedMethods}
  variant="compact"
/>
```

## API Integration

The component itself is UI-only. Integration with the transaction list API follows this pattern:

### Single Payment Method
```typescript
const params = {
  paymentMethods: 'CASH' // or 'MEMBER_CREDIT' or 'TEMPO'
};
```

### Multiple Payment Methods
```typescript
const params = {
  paymentMethods: 'CASH,MEMBER_CREDIT' // Comma-separated
};
```

### Combined with Other Filters
```typescript
const params = {
  paymentMethods: 'CASH,TEMPO',
  startDate: '2024-01-15',
  endDate: '2024-01-31',
  page: 1,
  limit: 20
};
```

## Accessibility Features

- ✅ Semantic HTML with proper labels
- ✅ Checkbox elements with clear labels
- ✅ Keyboard navigable
- ✅ Proper contrast ratios in light and dark modes
- ✅ Disabled state clearly indicated
- ✅ Descriptions for each payment method

## Styling

The component uses TailwindCSS and integrates with:
- Light and dark mode support
- Responsive design
- Consistent color palette with the application
- Hover and active states for interactivity

### Color Classes Used
- **Selected items**: `bg-blue-600`, `text-white`
- **Unselected items**: `bg-gray-200` (light), `bg-gray-700` (dark)
- **Hover states**: `hover:bg-gray-300` (light), `hover:bg-gray-600` (dark)
- **Clear button**: Red accent colors

## Testing

Comprehensive test coverage includes:

### Unit Tests
- Component rendering (both variants)
- Single and multiple selection modes
- Clear functionality
- Disabled state handling
- Selection persistence
- Empty state messages

### Integration Tests
- Filter integration with transaction history
- Combination with date range filters
- Pagination reset on filter change
- API parameter formatting
- Multiple method filtering

### Test Files
- `PaymentMethodFilter.test.tsx` - Component unit tests
- `paymentMethodFiltering.test.tsx` - Integration tests

## Event Flow

```
User Interaction
    ↓
Component onChange callback
    ↓
Parent updates selectedMethods state
    ↓
Parent calls API with new filter
    ↓
Transaction list updates
    ↓
Component re-renders with new selections
```

## State Management

The component is **presentation-only** and relies on parent component state management:

```tsx
// In parent component (e.g., TransactionHistoryPage)
const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

// When user interacts with filter
const handlePaymentMethodsChange = (methods: string[]) => {
  setPaymentMethods(methods);
  // Update API call with new filter
  fetchTransactions(1, limit);
};
```

## Performance Considerations

- Component uses `useMemo` for payment method definitions
- No unnecessary re-renders
- Efficient event handling
- Lazy evaluation of descriptions
- No external API calls (parent responsibility)

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## Known Limitations

1. **Single vs Multiple Mode**: Once set, cannot be changed dynamically. Choose mode at instantiation.
2. **No Async Validation**: Component doesn't validate against available methods in the database.
3. **No Search/Filter**: Cannot search within payment methods (only 3 fixed options).
4. **No Custom Colors**: Payment method colors are hardcoded based on type.

## Future Enhancements

- [ ] Add search functionality for payment methods (future extensibility)
- [ ] Support for additional payment methods beyond the current three
- [ ] Custom color configuration per payment method
- [ ] Animated transitions between selected/unselected states
- [ ] Keyboard shortcuts for selection (e.g., C for CASH, M for MEMBER_CREDIT, T for TEMPO)

## Maintenance Notes

### Adding New Payment Methods

To support additional payment methods in the future:

1. Update `paymentMethods` array in component
2. Add new payment method ID to the enum or types
3. Update backend API to support new method
4. Add tests for new method combinations
5. Update this documentation

### Updating UI Design

The component uses TailwindCSS classes. To update styling:

1. Modify the className strings in the component
2. Ensure dark mode variants are applied
3. Test accessibility and contrast ratios
4. Update snapshots in tests if appearance changes

## Related Components

- `TransactionHistoryList` - Displays filtered transactions
- `DateRangePicker` - Complementary date filtering
- `PaymentMethodSelector` - Used in POS for payment selection (different use case)

## References

- Requirement 8.3: Transaction History - Payment Method Filtering
- Design Document: Transaction History Module
- Backend API: `GET /api/transactions` with `paymentMethods` parameter
