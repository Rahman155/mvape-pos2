# Member List Feature Documentation

## Overview

The Member List feature provides kasir and owner users with the ability to view and search member information in the POS system.

**Requirements: 14.1 (Member Management)**

## Features

### 1. Member List Display
- **Pagination**: Members are displayed in a paginated table with 20 items per page by default
- **Columns Displayed**:
  - Member Number: Unique identifier for each member
  - Name: Full name of the member
  - Phone: Contact phone number
  - Credit Balance: Current member credit balance in IDR
  - Total Spent: Cumulative total spent by member
  - Actions: Button to view member details

### 2. Search Functionality
- **Search by Name**: Find members by their full name (case-insensitive)
- **Search by Phone**: Find members by phone number
- **Search by Member Number**: Find members by their unique member number
- **Real-time Search**: Results update automatically with 300ms debounce
- **Search Reset**: Pagination resets to page 1 when search query changes

### 3. Member Detail Modal
When a member is clicked, a modal displays:
- Member Information:
  - Member Number
  - Phone Number
  - Email Address
  - Member Since Date
- Account Balance:
  - Credit Balance (highlighted in green)
  - Total Spent (highlighted in blue)
- Recent Transactions:
  - List of up to 10 recent transactions
  - Shows date, payment method, and amount
  - Scrollable for viewing more transactions

### 4. Pagination Controls
- **Navigation**: Previous/Next buttons and page number display
- **Default Limit**: 20 items per page
- **Page Info**: Shows "Showing X to Y of Z" format
- **Dynamic Pages**: Calculates total pages based on member count

## Component Structure

### Pages
- **`/packages/frontend/src/app/kasir/members/page.tsx`**: Main member list page

### Components
- **`/packages/frontend/src/components/kasir/MemberList/MemberList.tsx`**: Reusable member list component

### API Endpoints
- **GET `/api/members`**: List members with pagination and search
- **GET `/api/members/:id`**: Get member details with transaction history

## API Response Format

### List Members Response
```json
{
  "data": [
    {
      "id": "uuid",
      "memberNumber": "MBR-123456",
      "name": "John Doe",
      "phone": "081234567890",
      "email": "john@example.com",
      "creditBalance": 500000,
      "totalSpent": 5000000,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "pages": 8
}
```

### Member Detail Response
```json
{
  "member": {
    "id": "uuid",
    "memberNumber": "MBR-123456",
    "name": "John Doe",
    ...
  },
  "transactions": [
    {
      "id": "txn-id",
      "totalAmount": 100000,
      "paymentMethod": "MEMBER_CREDIT",
      "transactionDate": "2024-01-15T10:30:00Z",
      "status": "COMPLETED"
    }
  ]
}
```

## Usage

### Using the Member List Page
1. Navigate to `/kasir/members` from the kasir dashboard
2. The page will load and display all active members
3. Use the search box to filter members
4. Click "View" to see member details
5. Use pagination buttons to navigate through pages

### Using the Reusable Component
```tsx
import { MemberList } from '@/components/kasir/MemberList';

// Basic usage
<MemberList />

// With callbacks
<MemberList 
  onMemberSelect={(member) => console.log(member)}
  showActions={true}
  limit={20}
/>

// Custom configuration
<MemberList
  searchPlaceholder="Find member..."
  emptyStateTitle="No members"
  emptyStateDescription="Create a member first"
/>
```

## Styling & Responsive Design

### Breakpoints
- **Mobile** (<640px): Single column layout, stacked components
- **Tablet** (640px-1024px): Two column layout
- **Desktop** (>1024px): Full multi-column layout

### Color Usage
- **Credit Balance**: Green text (#10B981) to indicate available credit
- **Total Spent**: Blue text (primary) to indicate spending history
- **Error States**: Red alert background
- **Loading**: Gray skeleton placeholders

## Error Handling

### Network Errors
- Displays error message at top of page
- "Dismiss" button to close error
- Retry functionality available
- Error details logged to console

### Empty States
- "No members found" when search returns no results
- Suggestion to adjust search criteria
- Icon representation for visual clarity

### Validation
- Invalid page numbers handled gracefully
- Invalid limits treated as defaults
- Missing fields display as "-"

## Performance Optimization

### Search Debouncing
- 300ms debounce on search input
- Reduces API calls during typing
- Improves responsiveness

### Pagination
- Only loads requested page
- No pre-loading of adjacent pages
- Efficient database queries with LIMIT/OFFSET

### Table Rendering
- Responsive table with horizontal scroll on mobile
- Lazy loading of member details modal
- Efficient column rendering

## Mobile Considerations

- **Responsive Table**: Horizontal scrolling for data on small screens
- **Touch-Friendly Buttons**: Minimum 44x44px touch targets
- **Simplified Modal**: Modal adjusts to screen size
- **Optimized Columns**: Important info prioritized on mobile

## Security

- Authentication required via JWT token
- All API calls include Bearer token
- Only active members displayed
- User role-based access control (KASIR/OWNER)

## Testing

### Unit Tests
- Member list rendering
- Search functionality
- Pagination controls
- Modal interactions
- Error states
- Empty states

### Integration Tests
- API endpoint pagination
- Search query parameter handling
- Response data validation
- Pagination calculations
- Error responses

## Future Enhancements

- [ ] Member creation from list page
- [ ] Member credit top-up from detail modal
- [ ] Bulk member operations
- [ ] Member filtering by credit range
- [ ] Export member list as CSV/PDF
- [ ] Advanced search filters
- [ ] Member activity timeline
