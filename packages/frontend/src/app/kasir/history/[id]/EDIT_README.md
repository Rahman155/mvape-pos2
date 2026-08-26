# Transaction Edit Page Documentation

## Overview

The Transaction Edit Page (`/kasir/history/[id]/edit`) provides comprehensive functionality to edit transaction details after creation. This page integrates with the Transaction Detail View (Task 39) and enables kassir and owners to modify transaction information while maintaining full audit trails and validation.

**Requirements**: 
- Requirement 19: Receipt Editing
- Requirement 8.5: Transaction History - edit transactions

---

## Features

### 1. Editable Fields

#### Item Management
- **Quantity**: Edit the quantity of each item in the transaction
  - Validates: quantity must be > 0
  - Updates total price automatically: `quantity × unit price`
  
- **Unit Price**: Edit the price per unit
  - Validates: price must be ≥ 0
  - Updates item total automatically: `quantity × unit price`
  
- **Remove Item**: Delete items from the transaction
  - Validates: at least one item must remain

#### Payment Method
- Change the payment method between:
  - `CASH`: Cash payment
  - `MEMBER_CREDIT`: Member credit payment
  - `TEMPO`: Credit/installment payment

#### Notes
- Add or modify transaction notes
- Free-form text field
- Preserved in transaction history

### 2. Total Recalculation

The system automatically recalculates the total amount whenever:
- Item quantity changes: `new quantity × unit price`
- Unit price changes: `quantity × new unit price`
- Items are added or removed

**Formula**: 
```
New Total = Σ(quantity_i × unitPrice_i) for all items
```

### 3. Change Tracking & Validation

#### Real-Time Change Detection
- Detects modifications to items (quantities, prices)
- Tracks payment method changes
- Monitors notes modifications
- Displays unsaved changes indicator

#### Validation Rules
- **Empty items**: Transaction must have at least one item
- **Invalid quantities**: All quantities must be > 0
- **Invalid prices**: All prices must be ≥ 0
- **Payment method**: A valid payment method is required

### 4. Edit History Recording

All edits are recorded with:
- **Timestamp**: When the edit was made (`editedAt`)
- **User Information**: Who made the edit (`editedBy`)
- **Change Details**: What was changed (tracked on backend)
- **Version Number**: Incremented on each edit (`version`)

Example edit history record:
```json
{
  "id": "txn-123",
  "isEdited": true,
  "editedAt": "2024-01-15T10:30:00.000Z",
  "editedBy": "user-456",
  "version": 2,
  "items": [/* updated items */],
  "paymentMethod": "CASH",
  "notes": "Updated notes"
}
```

---

## UI Components

### Page Layout

```
┌─────────────────────────────────────────┐
│ Edit Transaction Header                 │
│ Original Transaction Info (read-only)   │
├─────────────────────────────────────────┤
│ Items Section                           │
│ ├─ Items Table (editable rows)         │
│ ├─ Total Summary                       │
│ └─ Remove buttons                      │
├─────────────────────────────────────────┤
│ Payment Method Section                  │
│ └─ Payment method selector              │
├─────────────────────────────────────────┤
│ Notes Section                           │
│ └─ Notes textarea                       │
├─────────────────────────────────────────┤
│ Change Summary (if changes exist)       │
├─────────────────────────────────────────┤
│ Action Buttons                          │
│ ├─ Save Changes                         │
│ ├─ Cancel                               │
│ └─ Back to History                      │
└─────────────────────────────────────────┘
```

### Key Components

**Items Table**: Displays each item with:
- Product ID
- Editable quantity input
- Editable unit price input
- Calculated total price
- Remove button

**Change Summary**: Shows:
- List of fields that have been modified
- Total amount change (original → new)
- Highlighted with warning color

**Action Buttons**:
- **Save Changes**: Disabled when no changes exist
- **Cancel**: Returns to detail view without saving
- **Back to History**: Returns to history list

---

## Integration Points

### With Transaction Detail View (Task 39)
```
Transaction Detail Page
  ├─ Display transaction information
  ├─ Show "Edit Transaction" button
  │  └─ Links to /kasir/history/[id]/edit
  ├─ Display "isEdited" indicator if edited
  └─ Link to this edit page
```

### With Transaction History (Task 36-38)
```
Transaction History List
  ├─ Displays transaction rows
  ├─ Shows "isEdited" indicator
  ├─ Links to detail page
  │  └─ Which links to edit page
  └─ Can filter by date/payment method
```

### With Receipt Reprint (Task 41)
```
Receipt uses current transaction data:
- If edited, shows updated items/prices
- Includes edit history in audit info
- Latest version is used for printing
```

---

## API Integration

### GET /api/transactions/:id
Retrieves full transaction details needed for editing:
```typescript
{
  id: string;
  items: TransactionItem[];
  paymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';
  notes?: string;
  isEdited: boolean;
  editedAt?: Date;
  editedBy?: string;
  version: number;
  // ... other fields
}
```

### PUT /api/transactions/:id
Updates transaction with changes:
```typescript
{
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  paymentMethod: string;
  notes?: string;
}
```

**Response** includes:
- Updated transaction with all fields
- `isEdited: true`
- `editedAt`: Current timestamp
- `editedBy`: Current user ID
- `version`: Incremented version

---

## State Management

### Local Component State

```typescript
// Original transaction data
const [transaction, setTransaction] = useState<Transaction | null>(null);

// Edited values
const [editedItems, setEditedItems] = useState<TransactionItem[]>([]);
const [editedPaymentMethod, setEditedPaymentMethod] = useState<string>('');
const [editedNotes, setEditedNotes] = useState<string>('');

// UI state
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
const [hasChanges, setHasChanges] = useState(false);
```

### Change Detection

```typescript
useEffect(() => {
  if (!transaction) return;

  const itemsChanged = 
    JSON.stringify(editedItems) !== JSON.stringify(transaction.items);
  const paymentMethodChanged = 
    editedPaymentMethod !== transaction.paymentMethod;
  const notesChanged = 
    editedNotes !== (transaction.notes || '');

  setHasChanges(itemsChanged || paymentMethodChanged || notesChanged);
}, [editedItems, editedPaymentMethod, editedNotes, transaction]);
```

---

## Validation Logic

### Item Validation
```typescript
const validateEdits = (): { valid: boolean; message?: string } => {
  // At least one item required
  if (editedItems.length === 0) {
    return { valid: false, message: 'Transaction must have at least one item' };
  }

  // Each item must be valid
  for (const item of editedItems) {
    if (item.quantity <= 0) {
      return { valid: false, message: 'All items must have quantity > 0' };
    }
    if (item.unitPrice < 0) {
      return { valid: false, message: 'All items must have valid prices' };
    }
  }

  // Payment method required
  if (!editedPaymentMethod) {
    return { valid: false, message: 'Payment method is required' };
  }

  return { valid: true };
};
```

---

## Total Recalculation Function

```typescript
const calculateTotal = (items: TransactionItem[]): number => {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
};
```

### When Recalculation Happens
1. **Quantity Edit**: 
   ```
   item.totalPrice = newQuantity × item.unitPrice
   total = Σ(all item.totalPrice)
   ```

2. **Price Edit**:
   ```
   item.totalPrice = item.quantity × newUnitPrice
   total = Σ(all item.totalPrice)
   ```

3. **Item Removal**:
   ```
   items = items.filter(item => item.id !== removedId)
   total = Σ(all remaining item.totalPrice)
   ```

---

## Change Tracking Display

### Unsaved Changes Indicator

Shows when `hasChanges === true`:
```
⚠️ Unsaved Changes
• Transaction items have been modified
• Payment method has been changed
• Total has changed from $100,000.00 to $150,000.00
```

### Individual Change Messages
- "Transaction items have been modified"
- "Payment method has been changed"
- "Notes have been modified"
- "Total has changed from X to Y"

---

## User Workflows

### Workflow 1: Edit Item Quantity
1. User navigates to transaction detail page
2. Clicks "Edit Transaction" button
3. Finds the item to edit
4. Changes the quantity in the input field
5. Total automatically recalculates
6. User clicks "Save Changes"
7. Redirected to detail page with success message

### Workflow 2: Change Payment Method
1. User opens edit page
2. Scrolls to "Payment Method" section
3. Selects new payment method from dropdown
4. Change is recorded in unsaved changes indicator
5. User clicks "Save Changes"
6. Backend records edit with timestamp and user info

### Workflow 3: Add Notes
1. User opens edit page
2. Scrolls to "Notes" section
3. Types notes in textarea
4. Change is detected
5. User saves
6. Edit history updated

---

## Error Handling

### Fetch Errors
- Display error alert with message
- Show retry button (via "Back to History" link)
- Backend error is logged to console

### Validation Errors
- Display specific error message
- Prevent save button submission
- Show which field has the issue

### Save Errors
- Display error alert with message
- Don't redirect user
- Allow retry after fixing

---

## Offline Support

### Behavior When Offline
1. Page loads with cached transaction data
2. Offline warning alert is displayed
3. User can make edits locally
4. Save button queues changes for later
5. When online, changes are synced to backend
6. Change history includes sync timestamp

---

## Testing

### Unit Tests Coverage
- ✅ Form displays correctly with original data
- ✅ Item quantity editing and recalculation
- ✅ Item price editing and recalculation
- ✅ Payment method change
- ✅ Notes editing
- ✅ Total recalculation with multiple items
- ✅ Validation: empty items prevention
- ✅ Validation: invalid quantities/prices
- ✅ Change tracking and history display
- ✅ Save success and redirect
- ✅ Error handling
- ✅ Offline warning display

### Property-Based Tests
- **Property 1**: Total Calculation Consistency (Req 19.3)
  - Tests that total always equals sum of all line items
  
- **Property 2**: Input Validation Consistency (Req 19.2)
  - Tests that invalid inputs are consistently rejected
  
- **Property 3**: Change Detection (Req 19.4)
  - Tests that all changes are properly detected
  
- **Property 4**: Form State Preservation (Req 19.1)
  - Tests that original state is preserved while editing
  
- **Property 5**: Edit History Recording (Req 19 and 8.5)
  - Tests that edit metadata is always recorded

---

## Requirements Mapping

| Requirement | Coverage | Status |
|------------|----------|--------|
| 19.1 - Edit button & form | ✅ | Implemented |
| 19.2 - Field validation | ✅ | Implemented |
| 19.3 - Recalculate totals | ✅ | Implemented |
| 19.4 - Track edit history | ✅ | Implemented |
| 8.5 - Edit transaction integration | ✅ | Implemented |

---

## File Structure

```
packages/frontend/src/app/kasir/history/[id]/
├── edit/
│   └── page.tsx                    # Main edit page component
└── __tests__/
    ├── edit.test.tsx              # Unit tests
    └── edit.property.test.ts       # Property-based tests
```

---

## Related Tasks

- **Task 39**: Transaction Detail View (display & link to edit)
- **Task 36-38**: Transaction History (filter & list)
- **Task 41**: Receipt Reprint (uses current edited data)

---

## Future Enhancements

1. **Undo/Redo**: Add undo/redo functionality for multiple edits
2. **Side-by-side Comparison**: Show original vs. edited values side-by-side
3. **Bulk Edit**: Edit multiple transactions at once
4. **Change Log**: Display full edit history timeline
5. **Export Changes**: Export audit trail of all edits
6. **Approval Workflow**: Require manager approval for large changes
7. **Edit Notifications**: Notify relevant users when transaction is edited
