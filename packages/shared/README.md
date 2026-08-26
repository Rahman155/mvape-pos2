# Shared - Vapestore POS

Shared types, interfaces, dan utilities untuk frontend dan backend.

## Purpose

Centralized location untuk:
- Type definitions yang digunakan di multiple packages
- Utility functions yang shared
- Constants dan enums
- API response types

## Quick Start

```bash
# Install dependencies (from root)
pnpm install

# Build shared package
pnpm build --filter=@vapestore-pos/shared
```

## Project Structure

```
src/
├── types/             # Type definitions
│   ├── index.ts
│   ├── api.ts         # API types
│   ├── models.ts      # Domain models
│   └── common.ts      # Common types
├── utils/             # Utility functions
├── constants/         # Constants & enums
└── index.ts           # Main export
```

## Available Types

### API Response

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
```

### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier' | 'manager';
}
```

### Product

```typescript
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category: string;
}
```

### Transaction

```typescript
interface Transaction {
  id: string;
  userId: string;
  items: TransactionItem[];
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

interface TransactionItem {
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
}
```

## Usage

### Frontend

```typescript
// src/services/api.ts
import type { ApiResponse, User } from '@shared/types';

const fetchUsers = async (): Promise<ApiResponse<User[]>> => {
  const response = await fetch('/api/v1/users');
  return response.json();
};
```

### Backend

```typescript
// src/controllers/userController.ts
import type { User } from '@vapestore-pos/shared';

export const getUsers = async (req: Request, res: Response<ApiResponse<User[]>>) => {
  const users: User[] = [];
  res.json({ success: true, data: users, timestamp: new Date().toISOString() });
};
```

## Adding New Types

### 1. Create Type File

```typescript
// src/types/inventory.ts
export interface Inventory {
  productId: string;
  quantity: number;
  warehouse: string;
  lastUpdated: Date;
}
```

### 2. Export from Index

```typescript
// src/types/index.ts
export * from './api';
export * from './models';
export * from './common';
export * from './inventory'; // Add this
```

### 3. Use in Packages

```typescript
import { Inventory } from '@vapestore-pos/shared';
```

## Utilities

### Common Functions

```typescript
// src/utils/formatters.ts
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount);
};
```

## Constants

```typescript
// src/constants/index.ts
export const API_VERSION = 'v1';
export const APP_NAME = 'Vapestore POS';

export const ROLES = {
  ADMIN: 'admin',
  CASHIER: 'cashier',
  MANAGER: 'manager',
} as const;

export const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
} as const;
```

## Scripts

```bash
pnpm build            # Compile TypeScript
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Format code
pnpm type-check       # Check types
```

## Build Output

Compiled types tersimpan di `dist/`:

```
dist/
├── types/
├── utils/
├── constants/
├── index.d.ts         # Type definitions
└── index.js           # JavaScript
```

## Usage in package.json

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

## Import Paths

Packages dapat import dengan:

```typescript
// Full import
import { User, Product } from '@vapestore-pos/shared';

// Namespaced import
import * as Shared from '@vapestore-pos/shared';

const user: Shared.User = {};
```

## Best Practices

1. **Keep types pure** - Jangan ada runtime logic
2. **Use interfaces** - Untuk object shapes yang extensible
3. **Document types** - Add JSDoc comments
4. **Avoid circular dependencies** - Keep dependency tree clean
5. **Version carefully** - Breaking changes ke patch/minor/major

### Example with JSDoc

```typescript
/**
 * Represents a product in the inventory system
 *
 * @interface Product
 * @property {string} id - Unique product identifier
 * @property {string} name - Product display name
 * @property {number} price - Product price in IDR
 */
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category: string;
}
```

## Versioning

Update version di `package.json` saat ada changes:

```json
{
  "version": "1.0.0"
}
```

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** - Breaking changes
- **MINOR** - Backward-compatible features
- **PATCH** - Backward-compatible fixes

## Publishing (Optional)

```bash
# Login to npm
npm login

# Publish to npm registry
npm publish
```

## Troubleshooting

### Types not found

```bash
# Rebuild the package
pnpm build --filter=@vapestore-pos/shared

# Check dist/ folder exists
ls -la dist/
```

### Circular dependencies

Check imports chain:
- A imports from B
- B imports from A ❌

Solution: Extract common types ke separate file

## Contributing

Lihat [CONTRIBUTING.md](../../CONTRIBUTING.md) untuk guidelines.
