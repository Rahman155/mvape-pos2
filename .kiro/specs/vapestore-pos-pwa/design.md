# Design Document: Vapestore POS PWA System

## Overview

The Vapestore POS PWA is a Progressive Web Application designed for managing multi-store vapor retail operations. The system provides cashiers with transaction management capabilities and owners with comprehensive business management features including inventory, finance, and operations. The application employs an offline-first architecture with automatic online synchronization, enabling uninterrupted operations.

### Key Characteristics

- **Progressive Web App**: Installable on home screen, works offline, auto-updates
- **Offline-First**: Local-first data storage with background synchronization
- **Multi-Store Support**: Centralized management for multiple outlets
- **Dual Role System**: Role-based access control (Kasir/Owner) with different feature sets
- **Real-Time Sync**: Conflict-free data synchronization across devices and backend

---

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (PWA)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  React UI    │  │ State Mgmt   │  │ Service      │               │
│  │  Components  │  │ (Redux/      │  │ Worker       │               │
│  │              │  │  Zustand)    │  │ (Sync/Cache) │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│         │                  │                  │                     │
│         └──────────────────┴──────────────────┘                     │
│                     │                                               │
│  ┌────────────────────────────────────────────┐                    │
│  │ Local Storage Layer                        │                    │
│  │  - IndexedDB (Primary: Transactions)       │                    │
│  │  - LocalStorage (Config, Auth)             │                    │
│  │  - Cache API (Static Assets)               │                    │
│  └────────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ Network (HTTP/HTTPS)
         │
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ API Server   │  │ Auth Service │  │ Sync Engine  │               │
│  │ (REST/       │  │ (JWT/OAuth)  │  │ (Conflict    │               │
│  │  GraphQL)    │  │              │  │  Resolution) │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│         │                  │                  │                     │
│         └──────────────────┴──────────────────┘                     │
│                     │                                               │
│  ┌────────────────────────────────────────────┐                    │
│  │ Database Layer                             │                    │
│  │  - PostgreSQL (Primary: Transactions)      │                    │
│  │  - Redis (Cache, Sessions)                 │                    │
│  │  - Elasticsearch (Search/Analytics)        │                    │
│  └────────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component-Level Architecture

```
Application Root
├── Auth Module
│   ├── Login Page
│   ├── Session Manager
│   └── Token Validator
├── Kasir Module
│   ├── Dashboard
│   ├── Transaction Module
│   │   ├── Point of Sale
│   │   ├── Payment Processor
│   │   └── Receipt Generator
│   ├── History Module
│   ├── Member Module
│   └── Offline State Manager
├── Owner Module
│   ├── Dashboard
│   ├── Management Module
│   │   ├── Store Management
│   │   ├── Inventory Management
│   │   └── Member Management
│   ├── Finance Module
│   │   ├── Reports Generator
│   │   ├── Revenue Analysis
│   │   └── Expense Tracking
│   ├── BOP Management
│   └── Supplier Module
└── Common Layer
    ├── UI Components
    ├── State Management
    ├── Service Worker
    └── Sync Engine
```

---

## Technology Stack

### Frontend

**Framework & Rendering:**
- **React 18+** with TypeScript for type safety
- **Next.js 14+** for SSG/SSR and built-in PWA support
- **TailwindCSS** for utility-first styling

**State Management:**
- **Zustand** for lightweight, global state management
- **React Query (TanStack Query)** for server state and cache management
- **LocalForage** for structured client-side storage

**UI Component Library:**
- **Headless UI** with custom component wrapping
- **Recharts** for charts and visualizations
- **React Hot Toast** for notifications

**Build & Tooling:**
- **Webpack 5+** with code splitting and lazy loading
- **SWC** for fast TypeScript/JSX compilation
- **Workbox** for Service Worker generation

**PWA & Offline:**
- **Service Worker API** with Workbox library
- **IndexedDB** for structured local data
- **Cache API** for offline asset serving
- **Background Sync API** for deferred sync

### Backend

**Runtime & Framework:**
- **Node.js 20+** with Express.js or **Fastify** for API server
- **TypeScript** for type safety
- **NestJS** (optional) for enterprise-grade structure

**Database:**
- **PostgreSQL 15+** as primary database
- **Redis 7+** for caching and sessions
- **Elasticsearch 8+** (optional) for full-text search and analytics

**Authentication & Security:**
- **JWT (jsonwebtoken)** for API authentication
- **bcrypt** for password hashing
- **helmet** for security headers
- **rate-limit** middleware for API protection

**File Storage:**
- **AWS S3** or **MinIO** for object storage (logos, images)
- **Multer** for file upload handling

**Synchronization:**
- **Conflict-free replicated data types (CRDTs)** or **OT (Operational Transformation)**
- **WebSocket** for real-time updates (optional)

### DevOps & Deployment

- **Docker** for containerization
- **Kubernetes** (optional) for orchestration
- **GitHub Actions** or **GitLab CI/CD** for automation
- **Vercel/Netlify** or **AWS EC2** for hosting
- **Sentry** for error tracking
- **CloudWatch/DataDog** for monitoring

---

## Database Schema

### Core Entities

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('KASIR', 'OWNER', 'ADMIN') NOT NULL,
    store_id UUID REFERENCES stores(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);
```

#### Stores Table
```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    logo_url VARCHAR(512),
    operating_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

#### Products Table
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url VARCHAR(512),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Inventory Table (Stock per Store)
```sql
CREATE TABLE inventory (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    quantity INT NOT NULL DEFAULT 0,
    reserved INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    last_restock_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, store_id)
);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id),
    kasir_id UUID NOT NULL REFERENCES users(id),
    transaction_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('CASH', 'MEMBER_CREDIT', 'TEMPO') NOT NULL,
    status ENUM('PENDING', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,
    edited_by UUID REFERENCES users(id),
    is_edited BOOLEAN DEFAULT false,
    version INT DEFAULT 1
);
```

#### Transaction Items Table
```sql
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Members Table
```sql
CREATE TABLE members (
    id UUID PRIMARY KEY,
    member_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    credit_balance DECIMAL(12, 2) DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### BOP (Biaya Operasional) Table
```sql
CREATE TABLE bop (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Supplier Table
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    payment_terms TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Purchase Orders Table
```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    order_date TIMESTAMP DEFAULT NOW(),
    payment_method ENUM('CASH', 'TRANSFER', 'TEMPO') NOT NULL,
    payment_status ENUM('PENDING', 'PAID', 'PARTIAL') DEFAULT 'PENDING',
    total_amount DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    status ENUM('PENDING', 'RECEIVED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### PO Items Table
```sql
CREATE TABLE po_items (
    id UUID PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    received_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Piutang (Payable/Receivable) Table
```sql
CREATE TABLE piutang (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    member_id UUID REFERENCES members(id),
    amount DECIMAL(12, 2) NOT NULL,
    remaining_balance DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    status ENUM('OPEN', 'PARTIAL', 'CLOSED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Stock Transfer Table
```sql
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY,
    from_location_id UUID NOT NULL,
    to_store_id UUID NOT NULL REFERENCES stores(id),
    transfer_date TIMESTAMP DEFAULT NOW(),
    status ENUM('PENDING', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Stock Transfer Items Table
```sql
CREATE TABLE stock_transfer_items (
    id UUID PRIMARY KEY,
    stock_transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    received_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Stock Opname Table
```sql
CREATE TABLE stock_opnames (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id),
    opname_date TIMESTAMP DEFAULT NOW(),
    status ENUM('ONGOING', 'COMPLETED', 'VERIFIED') DEFAULT 'ONGOING',
    conducted_by UUID NOT NULL REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Opname Details Table
```sql
CREATE TABLE opname_details (
    id UUID PRIMARY KEY,
    opname_id UUID NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    system_quantity INT NOT NULL,
    physical_quantity INT NOT NULL,
    difference INT,
    status ENUM('MATCH', 'SHORTAGE', 'EXCESS') DEFAULT 'MATCH',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Attendance Table
```sql
CREATE TABLE attendance (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    duration_minutes INT,
    date DATE NOT NULL,
    status ENUM('PRESENT', 'ABSENT', 'INCOMPLETE') DEFAULT 'PRESENT',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);
```

#### Change History Table
```sql
CREATE TABLE change_history (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    change_type ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## API Design

### Authentication Endpoints

```
POST /api/auth/login
  Body: { username: string, password: string }
  Response: { token: string, user: User, expiresIn: number }

POST /api/auth/logout
  Headers: { Authorization: Bearer <token> }
  Response: { success: boolean }

POST /api/auth/refresh
  Body: { refreshToken: string }
  Response: { token: string, expiresIn: number }
```

### Kasir Endpoints

```
GET /api/kasir/dashboard
  Response: {
    totalSales: number,
    transactionCount: number,
    bop: BOP,
    quickLinks: array
  }

POST /api/transactions
  Body: { items: TransactionItem[], paymentMethod: string, ... }
  Response: { transactionId: UUID, receipt: string }

GET /api/transactions
  Query: { page, limit, filter, sort }
  Response: { data: Transaction[], total: number, pages: number }

GET /api/transactions/:id
  Response: { transaction: Transaction }

PUT /api/transactions/:id
  Body: { items: TransactionItem[], ... }
  Response: { transaction: Transaction, changeHistory: array }

GET /api/products
  Query: { storeId: UUID, search: string, page, limit }
  Response: { data: Product[], total: number }

GET /api/members
  Query: { page, limit, search: string }
  Response: { data: Member[], total: number }

POST /api/members
  Body: { name: string, phone: string, email?: string }
  Response: { member: Member }

GET /api/inventory
  Query: { storeId: UUID }
  Response: { data: Inventory[] }
```

### Owner Endpoints

```
GET /api/owner/dashboard
  Response: {
    totalRevenue: number,
    totalProfit: number,
    totalCapital: number,
    stores: Store[],
    alerts: array
  }

GET /api/stores
  Response: { data: Store[] }

POST /api/stores
  Body: { name, address, phone, operatingHours }
  Response: { store: Store }

PUT /api/stores/:id
  Body: { ...storeData }
  Response: { store: Store }

POST /api/stores/:id/logo
  Headers: { Content-Type: multipart/form-data }
  Response: { logoUrl: string }

GET /api/inventory/distribution
  Response: { warehouse: Inventory[], stores: Store[] }

POST /api/stock-transfer
  Body: { fromLocation, toStore, items: array }
  Response: { transferId: UUID }

GET /api/suppliers
  Response: { data: Supplier[] }

POST /api/purchase-orders
  Body: { supplierId, items, paymentMethod, dueDays? }
  Response: { purchaseOrder: PO }

PUT /api/purchase-orders/:id/payment
  Body: { amountPaid: number }
  Response: { purchaseOrder: PO }

GET /api/stock-opname
  Query: { storeId: UUID, status: string }
  Response: { data: StockOpname[] }

POST /api/stock-opname
  Body: { storeId, details: array }
  Response: { opname: StockOpname }

GET /api/bop
  Query: { storeId?: UUID }
  Response: { data: BOP[] }

POST /api/bop
  Body: { storeId, name, amount, effectiveFrom }
  Response: { bop: BOP }

GET /api/members/:id
  Response: { member: Member, transactions: array }

PUT /api/members/:id/credit
  Body: { amount: number, type: 'TOPUP'|'DEDUCT' }
  Response: { member: Member }

GET /api/reports/daily
  Query: { date: string, storeId?: UUID }
  Response: { dailyReport: Report }

GET /api/reports/weekly
  Query: { week: number, storeId?: UUID }
  Response: { weeklyReport: Report }

GET /api/reports/monthly
  Query: { month: number, year: number, storeId?: UUID }
  Response: { monthlyReport: Report }

GET /api/reports/financial
  Query: { period: 'daily'|'weekly'|'monthly', storeId?: UUID }
  Response: { financialReport: Report }

GET /api/reports/capital
  Query: { storeId?: UUID }
  Response: { capitalReport: Report }

GET /api/reports/bop
  Query: { period: string, storeId?: UUID }
  Response: { bopReport: Report }

GET /api/reports/attendance
  Query: { userId?: UUID, period: string }
  Response: { attendanceReport: Report }

GET /api/piutang
  Response: { data: Piutang[] }

PUT /api/piutang/:id/payment
  Body: { amount: number }
  Response: { piutang: Piutang }
```

---

## Component Structure

### Directory Organization

```
src/
├── components/
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Navigation.tsx
│   │   └── ...
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Card.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   ├── kasir/
│   │   ├── Dashboard/
│   │   ├── PointOfSale/
│   │   ├── TransactionHistory/
│   │   ├── MemberManagement/
│   │   └── ...
│   └── owner/
│       ├── Dashboard/
│       ├── StoreManagement/
│       ├── InventoryManagement/
│       ├── ReportsPanel/
│       ├── BopManagement/
│       └── ...
├── services/
│   ├── api.ts
│   ├── auth.ts
│   ├── sync.ts
│   ├── storage.ts
│   └── ...
├── stores/
│   ├── auth.store.ts
│   ├── transaction.store.ts
│   ├── inventory.store.ts
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── useOnlineStatus.ts
│   ├── usePaginatio.ts
│   └── ...
├── types/
│   ├── index.ts
│   ├── api.ts
│   └── ...
├── utils/
│   ├── formatters.ts
│   ├── validators.ts
│   ├── date.ts
│   └── ...
├── workers/
│   └── sync.worker.ts
└── pages/
    ├── _app.tsx
    ├── index.tsx
    ├── login.tsx
    ├── kasir/
    │   ├── dashboard.tsx
    │   ├── pos.tsx
    │   └── ...
    └── owner/
        ├── dashboard.tsx
        ├── stores.tsx
        └── ...
```

---

## State Management

### Zustand Store Architecture

#### Auth Store
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  role: 'KASIR' | 'OWNER' | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}
```

#### Transaction Store (Kasir)
```typescript
interface TransactionState {
  items: CartItem[];
  total: number;
  paymentMethod: string;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: UUID) => void;
  updateItem: (productId: UUID, quantity: number) => void;
  clear: () => void;
  submit: () => Promise<Transaction>;
}
```

#### Inventory Store
```typescript
interface InventoryState {
  inventory: Map<UUID, StockLevel>;
  loading: boolean;
  fetch: (storeId: UUID) => Promise<void>;
  updateLocal: (productId: UUID, quantity: number) => void;
}
```

#### Sync Store
```typescript
interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'success';
  pendingChanges: Change[];
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
  retry: () => Promise<void>;
}
```

---

## Offline-First Strategy

### IndexedDB Schema

```typescript
// Database structure
const dbSchema = {
  stores: 'storeId, name',
  products: 'productId, sku',
  inventory: 'inventoryId, [storeId+productId]',
  transactions: 'transactionId, timestamp',
  transactionItems: 'itemId, transactionId',
  members: 'memberId, memberNumber',
  bop: 'bopId, storeId',
  pendingSync: 'changeId, timestamp'
};
```

### Sync Mechanism

**Flow:**
1. All data operations write to IndexedDB immediately
2. Changes are queued in `pendingSync` store
3. Service Worker detects connectivity status
4. When online, sync engine processes pending changes
5. Server applies changes and returns conflict resolutions
6. Client updates local data with server versions

**Conflict Resolution Strategy:**
- **Last-Write-Wins (LWW)**: Timestamp-based for simple updates
- **CRDT (Conflict-free Replicated Data Types)**: For complex data
- **Version Vector**: Track causality of changes
- **User Notification**: Display conflicts that require manual resolution

### Cache Strategy

```
Network Priority:
- Auth tokens: Always validate with server
- Transaction data: Network-first, fallback to cache
- Inventory: Stale-while-revalidate (cache while updating)
- Products: Cache-first with periodic updates
- Reports: Network-only (always fresh)

Service Worker Caching:
- Static assets: Cache-first
- API calls: Network-first with 30s timeout
- Images: Cache-first with 7-day expiry
```

---

## UI Component Library

### Design System

**Color Palette:**
- Primary: `#2563EB` (Blue)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Amber)
- Error: `#EF4444` (Red)
- Neutral: `#6B7280` (Gray)

**Typography:**
- Heading 1: `32px` bold
- Heading 2: `24px` bold
- Body: `16px` regular
- Small: `14px` regular
- Tiny: `12px` regular

**Spacing:**
- xs: `4px`
- sm: `8px`
- md: `16px`
- lg: `24px`
- xl: `32px`

### Core Components

```typescript
// Button variants
<Button variant="primary" size="md" disabled={false}>
  Action
</Button>

// Input with validation
<Input
  label="Username"
  type="text"
  error={errors.username}
  value={username}
  onChange={setUsername}
/>

// Modal dialog
<Modal isOpen={open} onClose={setOpen} title="Confirm">
  Are you sure?
</Modal>

// Data table with pagination
<Table
  columns={[...]}
  data={data}
  pageable={true}
  sortable={true}
  onSort={...}
/>

// Card layout
<Card>
  <Card.Header title="Title" />
  <Card.Body>Content</Card.Body>
</Card>

// Toast notifications
toast.success('Transaction saved');
toast.error('Error occurred');
```

---

## Security Considerations

### Authentication & Authorization

**Login Flow:**
1. User submits credentials
2. Backend validates and returns JWT token
3. Token stored in localStorage (remember) or sessionStorage (session-only)
4. JWT payload includes: `{ userId, role, store, exp }`
5. Token refreshed 5 minutes before expiry

**Authorization:**
- Role-based middleware checks on all endpoints
- Client-side route guards prevent unauthorized access
- API validates permissions server-side (never trust client)

**Session Management:**
```typescript
// Client-side session validation
if (token.exp < Date.now() / 1000) {
  // Token expired, redirect to login
}
```

### Data Encryption

**At Rest:**
- Sensitive fields encrypted in IndexedDB
- Master key derived from user password + device ID
- AES-256-GCM for encryption

**In Transit:**
- HTTPS only (no HTTP)
- TLS 1.3 minimum
- Certificate pinning (optional, for security)

**Password Security:**
- Bcrypt with cost factor 12
- Minimum 8 characters required
- Server-side validation only

### API Security

**Request/Response:**
```typescript
// CORS configuration
Access-Control-Allow-Origin: https://app.domain.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
```

**Rate Limiting:**
- 100 requests/minute for authenticated users
- 10 requests/minute for login endpoint
- IP-based rate limiting for failed logins

**Input Validation:**
- Server-side validation for all inputs
- SQL injection prevention with parameterized queries
- XSS protection with HTML escaping

---

## Performance Strategy

### Code Splitting

```typescript
// Route-based code splitting
const KasirDashboard = lazy(() => import('./pages/kasir/dashboard'));
const OwnerDashboard = lazy(() => import('./pages/owner/dashboard'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/kasir/dashboard" element={<KasirDashboard />} />
    <Route path="/owner/dashboard" element={<OwnerDashboard />} />
  </Routes>
</Suspense>
```

### Caching Strategy

**Browser Cache:**
- Static assets: 1 year
- API responses: 5 minutes
- Images: 7 days

**Service Worker Cache:**
- Pre-cache critical files on install
- Background sync for offline changes
- Cache versioning for updates

**API Response Caching:**
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
});
```

### Bundle Optimization

```javascript
// Webpack configuration
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

### Performance Metrics

- **First Contentful Paint (FCP)**: < 2s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3s
- **Bundle Size**: < 500KB (main bundle)
- **Image Optimization**: WebP format, lazy loading

---

## Deployment Architecture

### Infrastructure

```
┌─────────────────────────────────────────────┐
│  CDN (CloudFlare / AWS CloudFront)          │
│  - Static asset distribution                │
│  - Geographic caching                       │
│  - DDoS protection                          │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│  Load Balancer (NGINX / AWS ALB)            │
│  - SSL/TLS termination                      │
│  - Request routing                          │
│  - Health checks                            │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│  API Servers (Node.js)                      │
│  - 3 instances (redundancy)                 │
│  - Auto-scaling: 2-10 instances             │
│  - Container orchestration (Docker)         │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
   ┌────▼────┐      ┌──────▼──────┐
   │Database │      │ Cache Layer │
   │PostgreSQL
   │Replica: 2
   │          │      │ Redis       │
   └──────────┘      │ Master/Slave│
                     └─────────────┘
```

### CI/CD Pipeline

```yaml
name: Deploy Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm run test
      - name: Run linter
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t vapestore-pos:${{ github.sha }} .
      - name: Push to registry
        run: docker push registry.example.com/vapestore-pos:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: kubectl set image deployment/vapestore-pos vapestore-pos=registry.example.com/vapestore-pos:${{ github.sha }}
      - name: Verify deployment
        run: kubectl rollout status deployment/vapestore-pos
```

### Monitoring & Logging

**Error Tracking:**
- Sentry for JavaScript errors
- Custom error boundary components
- Server-side error logging

**Performance Monitoring:**
- Web Vitals tracking
- API response time monitoring
- Database query performance

**Logging:**
```typescript
// Structured logging
logger.info('Transaction created', {
  transactionId: txnId,
  storeId,
  total: totalAmount,
  timestamp: new Date()
});
```

---

## Correctness Considerations

### Assessment of Property-Based Testing Applicability

This feature is a **multi-module enterprise application** with the following characteristics:

- **Data transformation logic**: Transaction processing, inventory calculations, financial reporting
- **Calculation accuracy**: BOP tracking, revenue/profit calculations, modal reporting
- **State management**: Offline-first sync, conflict resolution
- **Pure functions**: Payment method handling, discount calculations, receipt generation

**PBT is APPLICABLE for:**
1. Transaction calculations (total, tax, change)
2. Inventory operations (stock transfers, opname reconciliation)
3. Financial report calculations (revenue aggregation, profit computation)
4. Member credit operations (add, deduct, verify balance)
5. Data sync and conflict resolution logic

**PBT is NOT APPLICABLE for:**
- UI rendering and component display (use snapshot tests)
- Infrastructure/deployment configuration (use integration tests)
- External service integration (AWS S3, payment gateways - use mocks)
- Report PDF generation (use visual regression tests)
- Database query execution (use integration tests with test DB)

---

## Next Steps

The design document is complete with all major architectural decisions documented. The system is ready for:

1. **Development phase**: Teams can begin implementation using this architecture
2. **Property-based testing prework**: Before implementation, acceptance criteria should be analyzed for PBT coverage
3. **Task planning**: Detailed task breakdown based on component dependencies
4. **Infrastructure setup**: DevOps team can provision the deployment infrastructure



---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection & Deduplication

Based on the prework analysis, the following properties have been identified as testable. Properties have been consolidated to eliminate redundancy:

- Properties testing display/rendering (e.g., "show dashboard", "display list") are consolidated into comprehensive UI component tests
- Properties testing data round-trips (e.g., save → reload → verify) are combined into single round-trip properties
- Properties testing conditional logic (e.g., "if payment method X then show form Y") are consolidated into universal quantification over payment methods

---

### Property 1: Invalid Credential Rejection

*For any* string pair representing invalid credentials, the authentication system SHALL reject the login attempt, return an error message, and maintain the unauthenticated state.

**Validates: Requirements 1.4**

---

### Property 2: Session Persistence and Restoration

*For any* authenticated session, when saved to local storage and the application is restarted, the session SHALL be restored and the user SHALL remain authenticated without requiring re-login.

**Validates: Requirements 1.6, 1.7**

---

### Property 3: Session Expiration Handling

*For any* expired JWT token with expiration time in the past, when the user attempts to access a protected resource while online, the system SHALL redirect to login and clear the session.

**Validates: Requirements 1.7**

---

### Property 4: Button Size Accessibility

*For any* interactive button element on mobile viewports, the clickable area SHALL measure at least 44×44 pixels to meet accessibility standards.

**Validates: Requirements 2.4**

---

### Property 5: Dark/Light Mode Preference Round-Trip

*For any* theme preference selection (dark or light), when saved to local storage and the application is restarted, the same theme preference SHALL be applied without user intervention.

**Validates: Requirements 3.4**

---

### Property 6: Menu Toggle State Persistence

*For any* menu open/closed state change, when saved to session storage within the same browser session, the menu state SHALL be preserved across page reloads.

**Validates: Requirements 5.3, 5.5**

---

### Property 7: Offline Operation Capability

*For any* application state with valid cached data, when internet connectivity is unavailable, the application SHALL continue to function with cached data while indicating offline status to the user.

**Validates: Requirements 4.2**

---

### Property 8: Automatic Synchronization on Connectivity

*For any* pending offline changes in the sync queue, when internet connectivity is restored, the system SHALL automatically initiate synchronization and process all pending changes.

**Validates: Requirements 4.3**

---

### Property 9: Sync Status Indicator Visibility

*For any* synchronization operation in progress, the sync status indicator SHALL be visible to the user; when synchronization completes or is idle, the indicator SHALL be hidden or updated to reflect completion status.

**Validates: Requirements 4.4**

---

### Property 10: Conflict-Free Synchronization

*For any* conflicting data changes from multiple clients, the sync engine SHALL resolve conflicts using timestamp-based or version-vector ordering and preserve data consistency without manual intervention.

**Validates: Requirements 4.5**

---

### Property 11: Sales Total Aggregation

*For any* set of transactions completed on a given date for a store, the dashboard aggregation SHALL sum all transaction amounts to produce the correct daily sales total.

**Validates: Requirements 6.2**

---

### Property 12: Transaction Count Accuracy

*For any* set of transactions on a given date, the dashboard SHALL correctly count the number of completed transactions without duplicates or omissions.

**Validates: Requirements 6.3**

---

### Property 13: Cart Item Addition and Total Update

*For any* product with quantity added to the cart, the system SHALL add the item to the cart state and recalculate the total price to include the new item's line total.

**Validates: Requirements 7.2**

---

### Property 14: Cart Item Quantity Recalculation

*For any* cart item with quantity changed, the system SHALL immediately recalculate the item's line total and update the cart grand total.

**Validates: Requirements 7.3**

---

### Property 15: Cart Item Removal and Total Update

*For any* item removed from the cart, the system SHALL remove the item from cart state and recalculate the total price excluding the removed item.

**Validates: Requirements 7.4**

---

### Property 16: Payment Method Form Conditional Display

*For any* payment method selection (cash, member credit, or tempo), the system SHALL display the appropriate payment form corresponding to the selected method and hide forms for other methods.

**Validates: Requirements 7.5, 12.4**

---

### Property 17: Credit Transaction Recording

*For any* transaction using member credit payment method, the system SHALL deduct the transaction amount from the member's credit balance and record the transaction with updated balance.

**Validates: Requirements 7.8, 14.4**

---

### Property 18: Insufficient Credit Prevention

*For any* member credit payment attempt where the member's available credit is less than the transaction total, the system SHALL reject the transaction, display an error message, and maintain the original member balance.

**Validates: Requirements 7.8**

---

### Property 19: Transaction Completion Workflow

*For any* complete and valid transaction submission, the system SHALL record the transaction, update inventory (decrement stock), generate a receipt, and persist all data atomically.

**Validates: Requirements 7.9, 7.10**

---

### Property 20: Receipt Generation with Logo

*For any* transaction receipt generated, the system SHALL include the store logo at the top, transaction details, and all product line items with correct formatting.

**Validates: Requirements 7.10, 20.5**

---

### Property 21: Transaction Date Filtering

*For any* date range filter applied to transaction history, the system SHALL return only transactions with transaction dates falling within the specified date range (inclusive).

**Validates: Requirements 8.2**

---

### Property 22: Transaction Payment Method Filtering

*For any* payment method filter applied, the system SHALL return only transactions matching the selected payment method.

**Validates: Requirements 8.3**

---

### Property 23: Transaction Edit Change Tracking

*For any* transaction edit operation with changes saved, the system SHALL create a change history record containing the timestamp, user ID, old values, and new values.

**Validates: Requirements 8.6, 19.3, 19.4**

---

### Property 24: BOP Temporal Recording

*For any* BOP entry created, the system SHALL record the BOP with an effective-from date timestamp, making it queryable by time period.

**Validates: Requirements 9.3**

---

### Property 25: BOP Exclusion from Revenue Calculation

*For any* financial report period, when calculating profit, the system SHALL NOT deduct BOP expenses from revenue; BOP SHALL remain separate accounting information.

**Validates: Requirements 9.5, 17.4**

---

### Property 26: Store Creation with Unique ID

*For any* store creation with valid store data, the system SHALL create a store record and assign a unique, non-reusable UUID that is returned to the user.

**Validates: Requirements 10.3**

---

### Property 27: Store Update Change History

*For any* store data modification, the system SHALL create a change history entry recording what changed, when it changed, and which user made the change.

**Validates: Requirements 10.4**

---

### Property 28: Store Logo Upload and Integration

*For any* uploaded store logo image (PNG/JPG), the system SHALL validate the file format and size (≤5MB), store the logo, and use it in receipts and reports without corruption.

**Validates: Requirements 10.5, 20.2, 20.5**

---

### Property 29: Store Deletion Protection

*For any* store with existing transactions or inventory, when deletion is attempted, the system SHALL prevent the deletion and return an error preventing any data loss.

**Validates: Requirements 10.6**

---

### Property 30: Stock Quantity Validation

*For any* stock distribution quantity input, the system SHALL validate that the input quantity does not exceed the available warehouse stock for that product.

**Validates: Requirements 11.3**

---

### Property 31: Stock Transfer Execution and History

*For any* confirmed stock transfer, the system SHALL decrement warehouse inventory, increment store inventory, and create a timestamped transfer record in the audit trail.

**Validates: Requirements 11.4, 11.5**

---

### Property 32: Purchase Order Confirmation Workflow

*For any* valid purchase order confirmation, the system SHALL add items to warehouse inventory and record supplier debt if payment method is tempo.

**Validates: Requirements 12.5**

---

### Property 33: Tempo Due Date Reminder Generation

*For any* supplier debt with due date in the past, the system SHALL generate a reminder notification for the owner.

**Validates: Requirements 12.6**

---

### Property 34: Debt Payment Recording

*For any* supplier debt payment, the system SHALL deduct the payment amount from the debt balance, record the payment transaction, and update debt status to paid if balance reaches zero.

**Validates: Requirements 12.7**

---

### Property 35: Stock Opname Variance Calculation

*For any* stock opname entry with system quantity and physical quantity recorded, the system SHALL correctly calculate the difference (physical - system) and classify as shortage or excess.

**Validates: Requirements 13.3, 13.4, 13.5**

---

### Property 36: Stock Opname Completion and Update

*For any* completed stock opname with all variances recorded and confirmed, the system SHALL update inventory to match physical quantities and create an audit report with variance details and rupiah values.

**Validates: Requirements 13.6, 13.7**

---

### Property 37: Member Creation with Unique ID

*For any* new member record creation with valid member data, the system SHALL generate a unique member number/ID and return it to the user.

**Validates: Requirements 14.3**

---

### Property 38: Member Credit Top-Up

*For any* member credit top-up operation (owner-only), the system SHALL increment the member's credit balance by the top-up amount and record the top-up transaction.

**Validates: Requirements 14.6**

---

### Property 39: Kasir Attendance Clock-In Recording

*For any* kasir login event, the system SHALL record a timestamp as clock-in time in the attendance record for that date.

**Validates: Requirements 15.1**

---

### Property 40: Kasir Attendance Clock-Out Recording

*For any* kasir logout event, the system SHALL record a timestamp as clock-out time and calculate the duration worked in minutes.

**Validates: Requirements 15.2, 15.5**

---

### Property 41: Incomplete Attendance Fallback

*For any* kasir with missing clock-out and a new clock-in on a subsequent login, the system SHALL calculate work duration as the time difference between previous clock-in and new clock-in.

**Validates: Requirements 15.6**

---

### Property 42: Financial Report Aggregation

*For any* selected period and store combination, financial reports SHALL correctly aggregate revenue, BOP expenses, and calculate profit (revenue - BOP) without BOP being deducted from revenue calculation.

**Validates: Requirements 16.2, 16.3, 16.4, 17.2, 17.3**

---

### Property 43: Report Filtering and Combination

*For any* combination of period, store, and expense category filters applied to a report, the system SHALL apply all filters cumulatively and return only matching records.

**Validates: Requirements 16.5**

---

### Property 44: Report Export Format Generation

*For any* report export request, the system SHALL generate a properly formatted PDF or Excel file with headers, data, and professional layout that can be opened by standard applications.

**Validates: Requirements 16.7, 17.5, 23.5**

---

### Property 45: Store Capital Calculation

*For any* store with inventory, the store's capital SHALL be calculated as: (sum of inventory quantities × cost price per product) + (cash in register).

**Validates: Requirements 21.2, 21.3**

---

### Property 46: Store Capital Trend Calculation

*For any* store over multiple months, the system SHALL calculate month-over-month capital change and the percentage change versus the previous month.

**Validates: Requirements 21.4, 21.5**

---

### Property 47: Aggregated Capital Calculation

*For any* multiple stores combined, total business capital SHALL be the sum of individual store capitals plus warehouse inventory valuation.

**Validates: Requirements 22.2**

---

### Property 48: Capital Trend Status Determination

*For any* capital trend over a period, the system SHALL correctly classify the trend as growing (positive change), stable (minimal change), or declining (negative change).

**Validates: Requirements 22.5**

---

### Property 49: Daily Sales Report Generation

*For any* selected date, the system SHALL aggregate sales data per store showing total revenue, transaction count, and average transaction value.

**Validates: Requirements 23.3**

---

### Property 50: Weekly Sales Aggregation

*For any* selected week (Monday-Sunday), the system SHALL correctly aggregate transactions for that week and produce daily breakdown visualization.

**Validates: Requirements 24.2, 24.3, 24.4**

---

### Property 51: Monthly Sales Summary

*For any* selected month, the system SHALL aggregate revenue and profit per store, rank products by sales quantity, and produce store performance comparison.

**Validates: Requirements 25.3, 25.4, 25.5**

---

### Property 52: Offline Transaction Persistence

*For any* transaction created while offline, the system SHALL store the transaction in IndexedDB and queue it for sync when connectivity is restored.

**Validates: Requirements 26.2**

---

### Property 53: Data Validation Dual-Layer

*For any* data input, the client SHALL perform validation, and when the data reaches the server, the server SHALL perform independent validation; if validation differs, server validation SHALL be authoritative.

**Validates: Requirements 28.2**

---

### Property 54: Sync Error Handling and Retry

*For any* sync operation that fails, the system SHALL display an error message, retain the failed changes in the sync queue, and retry when connectivity is restored.

**Validates: Requirements 26.5**

---

### Property 55: Graceful Degradation on Storage Failure

*For any* local storage failure or capacity limit, the system SHALL alert the user, allow transaction creation to proceed with pending sync, and attempt recovery on next connectivity.

**Validates: Requirements 26.6**

---

### Property 56: User Action Feedback

*For any* user action (button click, form submission, etc.), the system SHALL provide immediate visual feedback such as loading indicators, success messages, or error notifications.

**Validates: Requirements 27.3**

---

### Property 57: Form Validation Real-Time Feedback

*For any* form field with validation rules, as the user types or modifies the field, the system SHALL display validation feedback (error or success indicator) in real-time.

**Validates: Requirements 27.4**

---

### Property 58: Page Loading State Indication

*For any* page that requires data loading, the system SHALL display skeleton loaders or progress indicators while data is being fetched.

**Validates: Requirements 27.7**

---

## Testing Strategy

### Dual Testing Approach

The Vapestore POS PWA system employs a comprehensive testing strategy combining unit tests, property-based tests, and integration tests to ensure correctness:

#### Property-Based Tests (PBT)
- **Minimum 100 iterations** per property test to cover diverse input combinations
- Each test references the design property it validates
- Tests focus on **pure calculation and business logic functions**
- Examples: transaction calculations, inventory operations, financial aggregations, data sync logic
- Library: **fast-check** (TypeScript/JavaScript)

#### Unit Tests (Example-Based)
- Specific scenarios and edge cases
- Specific UI component behavior
- Authentication workflows
- Error condition handling
- Library: **Vitest** or **Jest**

#### Integration Tests
- Database operations with test PostgreSQL instance
- File upload and storage operations
- API endpoint behavior
- Offline/online sync mechanisms
- Library: **Supertest** (for API) + **Testcontainers** (for DB)

#### Smoke Tests
- Deployment configuration verification
- Environment setup validation
- Critical path workflows (login → transaction → report)

### Code Coverage Targets
- Critical business logic: **≥90%** coverage
- API endpoints: **≥85%** coverage
- React components: **≥80%** coverage
- Overall project: **≥75%** target

### PBT-Applicable Features

Based on the prework analysis, the following feature areas are suitable for property-based testing:

1. **Transaction Logic**: Price calculations, tax/discount, payment handling, change calculation
2. **Inventory Operations**: Stock transfers, opname reconciliation, variance calculation, cost valuation
3. **Financial Calculations**: Revenue aggregation, profit computation, capital calculation, trend analysis
4. **Member Credit**: Balance operations (add, deduct), transaction verification
5. **Data Sync**: Conflict resolution, change queuing, offline persistence
6. **Filtering & Aggregation**: Date range filtering, category filtering, data aggregation
7. **Attendance**: Duration calculation, missing clock-out scenarios

### Non-PBT Features (Use Alternative Testing)

The following areas should use example-based, integration, or smoke tests instead of PBT:

1. **UI Rendering**: Use snapshot tests and visual regression tests
2. **Authentication UI**: Use example-based unit tests
3. **Form Displays**: Use snapshot tests
4. **PWA Configuration**: Use smoke tests
5. **Database Integration**: Use integration tests with test DB
6. **File Upload**: Use integration tests with mock storage
7. **Report PDF Generation**: Use visual regression or snapshot tests
8. **Deployment Configuration**: Use smoke/integration tests

### Example PBT Test Structure

```typescript
describe('Transaction Calculations', () => {
  
  // Property 13: Cart Addition
  it('should add item to cart and update total (Property 13)', () => {
    fc.assert(
      fc.property(
        fc.record({
          product: productArb,
          quantity: fc.integer({ min: 1, max: 100 })
        }),
        ({ product, quantity }) => {
          const cart = new Cart();
          cart.addItem(product, quantity);
          
          const expectedTotal = product.price * quantity;
          expect(cart.total).toBe(expectedTotal);
          expect(cart.items.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 18: Insufficient Credit Prevention
  it('should prevent transaction if member credit insufficient (Property 18)', () => {
    fc.assert(
      fc.property(
        fc.record({
          memberCredit: fc.float({ min: 0, max: 1000000 }),
          transactionAmount: fc.float({ min: 1, max: 100000 })
        }),
        ({ memberCredit, transactionAmount }) => {
          const member = new Member({ creditBalance: memberCredit });
          
          if (transactionAmount > memberCredit) {
            expect(() => member.deductCredit(transactionAmount)).toThrow();
            expect(member.creditBalance).toBe(memberCredit);
          } else {
            member.deductCredit(transactionAmount);
            expect(member.creditBalance).toBe(memberCredit - transactionAmount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

---

## Implementation Readiness

The design document is complete with:

1. ✅ **System Architecture**: High-level and component-level architecture with data flow
2. ✅ **Technology Stack**: Frontend, backend, database, and DevOps technologies
3. ✅ **Database Schema**: Complete SQL schema for all entities
4. ✅ **API Design**: RESTful endpoints for all features
5. ✅ **Component Structure**: Detailed folder organization and component hierarchy
6. ✅ **State Management**: Zustand store patterns for kasir and owner modules
7. ✅ **Offline-First Strategy**: IndexedDB schema, sync mechanism, conflict resolution
8. ✅ **UI Component Library**: Design system with color palette, typography, spacing, and core components
9. ✅ **Security Considerations**: Authentication, authorization, encryption strategies
10. ✅ **Performance Strategy**: Code splitting, caching, bundle optimization, metrics
11. ✅ **Deployment Architecture**: Infrastructure, CI/CD pipeline, monitoring
12. ✅ **Correctness Properties**: 58 testable properties with comprehensive coverage

The system is ready for:
- **Development**: Teams can begin implementation following the architecture
- **Testing**: PBT framework can be set up and property tests implemented
- **Task Planning**: Detailed task breakdown can be derived from properties and components
- **Infrastructure**: DevOps team can provision production infrastructure

