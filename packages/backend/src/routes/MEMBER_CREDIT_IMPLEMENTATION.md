# Member Credit Payment Processing Implementation

## Overview

This document describes the implementation of member credit payment processing for the Vapestore POS PWA system, fulfilling Requirement 7.8: "Member credit payment with validation and deduction."

## Features Implemented

### 1. Member Management API (Member Routes)

**Location:** `packages/backend/src/routes/members.ts`

#### Endpoints

**GET /api/members**
- List all active members with pagination
- Search by name, member number, or phone
- Returns paginated results with member details including credit balance

**GET /api/members/:id**
- Retrieve member details by ID
- Includes transaction history
- Shows member's total spent and credit balance

**POST /api/members**
- Create new member
- Generates unique member number
- Initializes credit balance to 0

**PUT /api/members/:id/credit**
- Update member credit balance
- Supports TOPUP (add credit) and DEDUCT (reduce credit) operations
- TOPUP restricted to OWNER role
- Returns error if deduction would result in negative balance

### 2. Transaction Processing Service (Transaction Service)

**Location:** `packages/backend/src/services/transaction.ts`

#### Key Functions

**validateMemberCredit(memberId, amount)**
```typescript
Returns: {
  valid: boolean;
  currentBalance?: number;
  error?: string;
}
```
- Validates member exists and is active
- Checks if credit balance >= required amount
- Provides detailed error messages
- Returns current balance for UI display

**deductMemberCredit(memberId, amount)**
```typescript
Returns: {
  success: boolean;
  newBalance?: number;
  error?: string;
}
```
- Atomically deducts credit from member account
- Uses database transactions (BEGIN/COMMIT/ROLLBACK)
- Prevents race conditions with FOR UPDATE lock
- Returns new balance on success
- Rolls back on failure

**createTransaction(request)**
- Creates transaction with payment processing
- Validates payment method requirements
- For MEMBER_CREDIT:
  - Validates sufficient credit
  - Deducts credit atomically
  - Updates member credit balance
- Creates transaction items
- Deducts inventory
- Creates piutang record for TEMPO payments

### 3. Transaction Routes

**Location:** `packages/backend/src/routes/transactions.ts`

#### Endpoints

**POST /api/transactions**
- Create new transaction with payment processing
- Validates cash, member credit, and tempo payment data
- For member credit:
  - Checks member exists
  - Validates credit balance
  - Returns error if insufficient
- Creates transaction atomically

**GET /api/transactions**
- List transactions with filtering
- Filter by store, payment method, date range
- Paginated results

**GET /api/transactions/:id**
- Get transaction details with line items

**PUT /api/transactions/:id**
- Edit transaction (kasir can edit own, owner can edit any)
- Recalculates totals
- Tracks edit history

## Validation Flow

### Member Selection/Search
1. User enters search term (name, member number, phone)
2. Frontend calls `GET /api/members?search=<term>`
3. Backend returns filtered member list with credit balances
4. User selects member from results

### Credit Balance Display
1. Frontend displays selected member's name and number
2. Shows current credit balance (formatted as currency)
3. Shows transaction total
4. Indicates if balance is sufficient ✓ or insufficient ✗

### Payment Validation
1. User initiates payment with member credit method
2. Frontend validates locally (optional, for UX)
3. Backend validates at transaction creation:
   - Member exists and is active
   - Credit balance >= transaction total
4. If validation fails:
   - Returns error with current balance and required amount
   - Transaction NOT created
   - No credit deducted

### Credit Deduction
1. After validation passes
2. Credit is deducted atomically:
   - Lock member record (FOR UPDATE)
   - Verify balance again
   - Subtract amount
   - Commit transaction
3. If any step fails:
   - ROLLBACK entire transaction
   - No changes to database
   - Return error

## Database Design

### Members Table
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY,
  member_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  credit_balance DECIMAL(12, 2) DEFAULT 0,  -- Current available credit
  total_spent DECIMAL(12, 2) DEFAULT 0,     -- Cumulative total spent
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Key Features
- `credit_balance`: Current available credit for member
- `total_spent`: Historical total amount spent by member
- `is_active`: Soft delete flag (prevent inactive member payments)
- Decimal type for precise currency calculations

## Error Handling

### Validation Errors
- Member not found: "Member not found or inactive"
- Insufficient credit: "Insufficient credit balance. Available: Rp X, Required: Rp Y"
- Inactive member: "Member is inactive"

### Transaction Errors
- Database lock timeout (rare): Service returns error, transaction rolled back
- Concurrent modification: Atomic operations ensure consistency

## Security Considerations

### Authorization
- TOPUP endpoint restricted to OWNER role
- Kasir can deduct credit as part of transaction (automatic)
- All endpoints require authentication

### Data Integrity
- Atomic transactions prevent partial updates
- Database locks prevent race conditions
- Credit balance never goes negative

### Audit Trail
- All credit deductions recorded in transactions
- Transaction items track what was purchased
- Change history records member credit updates

## Implementation Details

### Atomic Operations
The `deductMemberCredit` function uses database transactions:
```typescript
BEGIN;
SELECT credit_balance FROM members WHERE id = $1 FOR UPDATE;
// Verify balance
UPDATE members SET credit_balance = ...;
COMMIT;
// Or ROLLBACK on error
```

The `FOR UPDATE` clause locks the member record, preventing concurrent modifications.

### Payment Data Structure
```typescript
export interface PaymentData {
  memberCredit?: {
    memberId: string;
    memberName: string;
    usedCredit: number;
  };
}
```

### Transaction Recording
When member credit payment is processed:
1. Transaction record created with `payment_method = 'MEMBER_CREDIT'`
2. Transaction items record what was purchased
3. Member's `credit_balance` decreased
4. Member's `total_spent` increased
5. Inventory adjusted

## Testing

### Unit Tests
- **members.test.ts**: Member CRUD, credit operations, balance calculations
- **transaction.test.ts**: Credit validation, deduction, atomic operations

### Integration Tests
- **memberCreditPayment.test.ts**: Complete payment flow, search, validation, deduction

### Test Coverage
- ✓ Member search by name, number, phone
- ✓ Sufficient credit validation
- ✓ Insufficient credit detection
- ✓ Credit deduction
- ✓ Transaction creation
- ✓ Error handling
- ✓ Concurrent payment protection
- ✓ Credit never goes negative (property-based)
- ✓ Atomic operations (all-or-nothing)

## Frontend Integration

### PaymentMethodSelector Component
The existing PaymentMethodSelector component already includes:
- Member search field
- Member selection dropdown
- Credit balance display
- Validation feedback
- Error messages

### User Flow
1. User adds products to cart
2. Selects "Member Credit" payment method
3. Searches for member (name, number, phone)
4. Selects member from results
5. Component displays member name and credit balance
6. Shows ✓ or ✗ for balance sufficiency
7. User confirms payment
8. Frontend sends payment request to backend
9. Backend validates and deducts credit
10. Transaction completed
11. Receipt generated with member credit indication

## API Integration Example

### Request
```bash
POST /api/transactions
{
  "storeId": "store-123",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 2,
      "unitPrice": 150000,
      "totalPrice": 300000
    }
  ],
  "paymentMethod": "MEMBER_CREDIT",
  "paymentData": {
    "memberCredit": {
      "memberId": "member-001",
      "memberName": "John Doe",
      "usedCredit": 300000
    }
  }
}
```

### Response (Success)
```json
{
  "id": "txn-789",
  "storeId": "store-123",
  "kasirId": "kasir-001",
  "transactionDate": "2024-01-15T14:30:00Z",
  "totalAmount": 300000,
  "paymentMethod": "MEMBER_CREDIT",
  "status": "COMPLETED",
  "items": [...]
}
```

### Response (Insufficient Credit)
```json
{
  "error": "Insufficient credit balance. Available: Rp 200.000, Required: Rp 300.000",
  "availableBalance": 200000
}
```

## Compliance

### Requirement 7.8
- ✓ Member selection/search functionality
- ✓ Display member credit balance
- ✓ Validate sufficient member credit before transaction
- ✓ Prevent transaction if insufficient credit
- ✓ Deduct member credit on transaction completion

### Related Requirements
- Requirement 14 (Member Management): Supported
- Requirement 7 (Transaction Processing): Integrated
- Requirement 26 (Data Persistence): Database design ensures persistence

## Future Enhancements

1. **Credit History Report**: Show member's credit top-ups and deductions
2. **Member Credit Statements**: Monthly statement of credit activity
3. **Credit Expiration**: Option to set credit validity period
4. **Tiered Benefits**: Bonus credit for reaching spending milestones
5. **Batch Credit Update**: Owner can update multiple members' credit at once
