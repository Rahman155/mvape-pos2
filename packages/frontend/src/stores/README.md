# State Management with Zustand

This directory contains all Zustand stores for state management.

## What is Zustand?

Zustand is a lightweight state management library that:
- Uses React hooks for state access
- Minimal boilerplate
- TypeScript support
- Devtools integration
- Immer middleware for immutable updates

## Store Structure

Each store file should:

```tsx
import { create } from 'zustand';

interface StoreState {
  // State properties
  count: number;
  
  // Actions
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

## Available Stores

### `auth.ts`
Authentication state and actions:
- Current user
- Authentication status
- Token management
- Login/Logout actions

### `transaction.ts`
Shopping cart and transaction state:
- Cart items
- Total calculations
- Payment method selection
- Transaction submission

### `sync.ts`
Offline synchronization state:
- Sync status
- Pending changes
- Last sync time
- Retry logic

### `ui.ts` (Optional)
UI state management:
- Theme (dark/light mode)
- Sidebar collapsed state
- Mobile menu state
- Modal states

### `inventory.ts` (Optional)
Inventory state:
- Product list
- Stock levels
- Filter/search state

## Usage

### In Components

```tsx
import { useCounterStore } from '@/stores/counter';

export function Counter() {
  const { count, increment, decrement } = useCounterStore();
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

### Selective Subscription

```tsx
const count = useCounterStore((state) => state.count);
const increment = useCounterStore((state) => state.increment);
```

This prevents unnecessary re-renders when other state changes.

## Best Practices

1. **Type Everything**: Always use TypeScript interfaces for state
2. **Actions First**: Group related actions with their state
3. **Keep It Simple**: Don't over-engineer, Zustand is simple by design
4. **Lazy Initialization**: Load data only when needed
5. **Selective Subscription**: Use selectors to prevent unnecessary re-renders
6. **Async Actions**: Handle async operations within actions

### Example with Async Actions

```tsx
import { create } from 'zustand';
import { apiService } from '@/lib/api';

interface User {
  id: string;
  name: string;
}

interface UserStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  
  fetchUser: (id: string) => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  loading: false,
  error: null,
  
  fetchUser: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.users.get(id);
      set({ user: response.data, loading: false });
    } catch (error) {
      set({ 
        error: 'Failed to fetch user', 
        loading: false 
      });
    }
  },
  
  clearUser: () => set({ user: null }),
}));
```

## Middleware (Advanced)

### Persist to localStorage

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create<AuthState>(
  persist(
    (set) => ({
      // ... store definition
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
);
```

### Immer Middleware (for immutable updates)

```tsx
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useStore = create<State>(
  immer((set) => ({
    // Can now mutate state directly
  }))
);
```

## Devtools Integration

For debugging in Redux DevTools:

```tsx
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useStore = create<State>(
  devtools((set) => ({
    // ... store definition
  }), { name: 'MyStore' })
);
```

## Testing

Example test for a store:

```tsx
import { useCounterStore } from '@/stores/counter';

describe('Counter Store', () => {
  it('should increment count', () => {
    const { getState } = useCounterStore;
    getState().increment();
    expect(getState().count).toBe(1);
  });
});
```

## Folder Structure

```
stores/
├── auth.ts            # Authentication state
├── transaction.ts     # Transaction/cart state
├── sync.ts           # Offline sync state
├── ui.ts             # UI state (theme, modals, etc.)
├── inventory.ts      # Inventory state (optional)
└── README.md         # This file
```

## Tips & Tricks

1. **Initialize from localStorage**:
```tsx
user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
```

2. **Reset entire store**:
```tsx
reset: () => set(initialState)
```

3. **Combine multiple stores**:
```tsx
const useAppStore = () => ({
  auth: useAuthStore(),
  transaction: useTransactionStore(),
});
```

## Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand vs Redux](https://github.com/pmndrs/zustand#comparison)
- [Example Projects](https://github.com/pmndrs/zustand/discussions/1265)
