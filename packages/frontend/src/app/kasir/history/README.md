# Transaction History Page

This document describes the Transaction History feature implementation for Kasir users.

## Overview

The Transaction History page allows kasir users to view, search, filter, and navigate through their transaction history. It implements pagination, payment method filtering, and offline support.

## Features

### 1. **Transaction Listing with Pagination** (Requirement 8.1)
- Displays all transactions for the current store
- Supports pagination with configurable page size (default: 20 items per page)
- Shows results summary (e.g., "Showing 1 to 20 of 150 transactions")
- Responsive pagination controls (Previous/Next buttons, page indicators)

### 2. **Payment Method Filtering** (Requirement 8.3)
- Filter transactions by payment method:
  - **CASH**: Cash payments
  - **MEMBER_CREDIT**: Member credit payments
  - **TEMPO**: Tempo (credit) payments
- Filter dropdown in the page header
- Automatically resets pagination when filter changes

### 3. **Date Range Filtering** (Requirement 8.2)
- Note: Date range picker is implemented in the requirements phase
- Backend supports `startDate` and `endDate` query parameters
- Can be combined with payment method filtering

### 4. **Transaction Details View**
- Click "View" button on any transaction to see details
- Displays complete transaction information including items
- Shows edit status and history

### 5. **Offline Support**
- Caches transactions in IndexedDB
- Shows warning when offline
- Continues to show cached data while offline
- Automatically syncs when connection is restored

## Component Structure

### `/app/kasir/history/page.tsx`
Main page component that:
- Manages page state (current page, filters, etc.)
- Fetches transactions from the API
- Handles filter changes and pagination
- Displays error messages and status indicators

### `/components/kasir/TransactionHistoryList.tsx`
Reusable component for displaying transaction list:
- Renders table with transaction data
- Handles pagination controls
- Shows transaction details (date, amount, payment method, status)
- Edit indicator for modified transactions
- Responsive design for mobile devices

## Usage

### Basic Usage

```tsx
import TransactionHistoryPage from '@/app/kasir/history/page';

// The page is automatically available at /kasir/history
```

### Using the TransactionHistoryList Component

```tsx
import TransactionHistoryList from '@/components/kasir/TransactionHistoryList';
import { Transaction } from '@/types';

const MyComponent = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  return (
    <TransactionHistoryList
      transactions={transactions}
      loading={false}
      page={page}
      limit={20}
      total={total}
      totalPages={Math.ceil(total / 20)}
      onPageChange={setPage}
      onViewDetails={(txnId) => console.log(`View transaction ${txnId}`)}
    />
  );
};
```

## API Integration

### Transaction List Endpoint
```
GET /api/transactions
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20)
  - storeId: string (optional, auto-filled for kasir)
  - paymentMethod: string (optional) - CASH | MEMBER_CREDIT | TEMPO
  - startDate: ISO string (optional)
  - endDate: ISO string (optional)

Response:
{
  data: Transaction[],
  total: number,
  page: number,
  limit: number,
  pages: number
}
```

### Transaction Detail Endpoint
```
GET /api/transactions/:id

Response:
{
  id: string,
  storeId: string,
  kasirId: string,
  transactionDate: Date,
  totalAmount: number,
  paymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO',
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED',
  isEdited: boolean,
  items: TransactionItem[],
  ...
}
```

## Testing

### Unit Tests
File: `/components/kasir/__tests__/TransactionHistoryList.test.tsx`

Tests include:
- Rendering of transaction list with correct columns
- Display of transaction amounts in currency format
- Edit indicator for modified transactions
- Results summary display
- Empty state handling
- Pagination controls behavior
- Payment method filtering
- View details functionality
- Loading state

### Integration Tests
File: `/__tests__/integration/transactionHistory.test.ts`

Tests include:
- Requirement 8.1: Transaction history listing with pagination
- Requirement 8.2: Date range filtering
- Requirement 8.3: Payment method filtering
- Transaction detail retrieval
- Transaction statistics calculation
- Offline support
- Edge cases (empty lists, invalid pages, etc.)

### Running Tests

```bash
# Run all tests
npm test

# Run only transaction history tests
npm test -- --testNamePattern="Transaction"

# Run in watch mode
npm run test:watch
```

## Data Types

### Transaction
```typescript
interface Transaction {
  id: string;
  storeId: string;
  kasirId: string;
  transactionDate: Date;
  totalAmount: number;
  paymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  editedBy?: string;
  isEdited: boolean;
  version: number;
  items: TransactionItem[];
}
```

### TransactionItem
```typescript
interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
}
```

## Styling

The components use TailwindCSS for styling with:
- Dark mode support
- Mobile-responsive design
- Accessible color schemes
- Consistent with the design system

### Key Classes
- `.bg-gray-50 dark:bg-gray-900`: Page background
- `.text-3xl font-bold`: Page title
- `.inline-flex ... px-2.5 py-0.5`: Status badges
- `.hover:bg-gray-100 dark:hover:bg-gray-700`: Interactive elements

## Performance Considerations

### Pagination
- Default page size: 20 transactions
- Reduces initial load time
- Improves UI responsiveness
- Backend handles pagination

### Caching
- React Query caches API responses
- Stale-while-revalidate strategy
- Reduces unnecessary API calls

### Code Splitting
- Transaction history page is lazy-loaded
- Component splitting for better bundle size

## Accessibility

### WCAG Compliance
- Semantic HTML structure
- Proper heading hierarchy
- Color contrast ratios meet WCAG AA standards
- Keyboard navigation support
- ARIA labels for interactive elements

### Screen Reader Support
- Transaction status indicators have descriptive text
- Payment method badges have clear labels
- Pagination controls are properly labeled

## Future Enhancements

1. **Date Range Picker**: Add date range selection UI
2. **Advanced Sorting**: Add column sorting (by amount, date, etc.)
3. **Search**: Add transaction ID or description search
4. **Export**: Export filtered transactions to CSV/PDF
5. **Transaction Actions**: Quick actions (edit, print, refund)
6. **Analytics**: Show transaction statistics and trends
7. **Bulk Actions**: Select multiple transactions for batch operations

## Troubleshooting

### Transactions Not Loading
1. Check if API is running
2. Verify authentication token is present
3. Check browser console for errors
4. Verify store ID is correctly set

### Pagination Not Working
1. Verify `onPageChange` callback is implemented
2. Check if `totalPages` is calculated correctly
3. Ensure page state is updated when filter changes

### Offline Issues
1. Verify Service Worker is installed
2. Check IndexedDB in browser DevTools
3. Ensure sync engine is running
4. Check network status indicator

## Related Documents

- [API Documentation](../../../../../backend/README.md)
- [Component Library Documentation](../../../../components/ui/README.md)
- [Testing Guidelines](../../../../../__tests__/README.md)
- [Requirement 8.1: Transaction History](../../../../../specifications/requirements.md#requirement-8-transaction-history)

## Migration Guide

If replacing an existing transaction history implementation:

1. **Update imports**: Replace old components with new imports
2. **Update state management**: Migrate to use the new API integration
3. **Update styles**: Apply new TailwindCSS styling
4. **Update tests**: Replace old test files with new ones
5. **Update navigation**: Update links to point to `/kasir/history`

## Contributing

When modifying this component:

1. Follow the existing code style
2. Add unit tests for new functionality
3. Update integration tests if adding new features
4. Update this README with any changes
5. Ensure dark mode compatibility
6. Test on mobile devices
7. Verify accessibility with screen readers

## License

This component is part of the Vapestore POS system and is subject to the same license as the parent project.
