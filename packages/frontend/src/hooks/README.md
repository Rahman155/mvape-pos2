# Custom Hooks

This directory contains custom React hooks for the Vapestore POS application.

## Hook Guidelines

Custom hooks should:
- Start with `use` prefix
- Be pure functions
- Follow React hooks rules
- Have clear, single responsibility
- Include JSDoc documentation

## Available Hooks

### `useAuth.ts`
Authentication state and methods
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

### `useOnlineStatus.ts` ⭐ NEW
Track network connectivity and sync status
```typescript
const { isOnline, isOffline, status, pendingChanges, triggerSync } = useOnlineStatus();
```
See [Offline Detection Guide](../components/OFFLINE_INDICATOR_GUIDE.md) for details.

### `useCart.ts`
Shopping cart state management
```typescript
const { items, addItem, removeItem, total } = useCart();
```

### `useProducts.ts`
Product fetching and filtering
```typescript
const { products, loading, error } = useProducts();
```

### `useTransaction.ts`
Transaction state and operations
```typescript
const { transaction, saveTransaction, updateItem } = useTransaction();
```

### `useForm.ts`
Form state management
```typescript
const { values, errors, setValue, validate } = useForm(initialValues);
```

### `usePermission.ts`
Permission checking
```typescript
const hasPermission = usePermission('ACTION_NAME');
```

## New Hook: useOnlineStatus ⭐

Detects network connectivity and manages sync state.

**Features:**
- ✅ Real-time online/offline detection
- ✅ Sync status tracking (Online, Offline, Syncing, SyncError)
- ✅ Pending changes counter
- ✅ Last sync time tracking
- ✅ Error message management
- ✅ Manual sync triggering
- ✅ SSR safe
- ✅ 25+ unit tests

**Basic Usage:**
```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function MyComponent() {
  const { 
    status,           // 'online' | 'offline' | 'syncing' | 'syncError'
    isOnline,         // boolean
    isOffline,        // boolean
    isSyncing,        // boolean
    pendingChanges,   // number
    lastSyncTime,     // Date | null
    lastError,        // string | null
    triggerSync,      // () => Promise<void>
    clearError        // () => void
  } = useOnlineStatus();

  return (
    <div>
      {isOffline && <p>No connection - {pendingChanges} changes pending</p>}
      <button onClick={triggerSync} disabled={isSyncing}>
        Sync
      </button>
    </div>
  );
}
```

**Related Components:**
- `OfflineIndicator.tsx` - UI component to display status
- See [OFFLINE_INDICATOR_GUIDE.md](../components/OFFLINE_INDICATOR_GUIDE.md) for complete documentation

## Testing Custom Hooks

Using `@testing-library/react`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

## Hooks Organization

```
hooks/
├── useAuth.ts                # Authentication logic
├── useCart.ts                # Shopping cart state
├── useForm.ts                # Form state and validation
├── useOnlineStatus.ts        # Online/offline detection ⭐
├── usePermission.ts          # Permission checking
├── useProducts.ts            # Product fetching
├── useTransaction.ts         # Transaction state
├── README.md                 # This file
└── ../

__tests__/
└── hooks/
    ├── useAuth.test.ts
    ├── useOnlineStatus.test.ts  # 25+ tests ⭐
    ├── useProducts.test.ts
    └── ...
```

## Best Practices

1. **Keep hooks focused**: Each hook should do one thing
2. **Handle cleanup**: Remove listeners and timers in cleanup functions
3. **Use TypeScript**: Type inputs and return values
4. **Memoize callbacks**: Use `useCallback` for stable function references
5. **Document parameters**: Use JSDoc for API documentation
6. **Handle edge cases**: Consider null/undefined values
7. **Test thoroughly**: Write tests for hook behavior
8. **SSR safe**: Check for `typeof window` before using browser APIs

## Anti-Patterns to Avoid

❌ **Don't call hooks conditionally**
```typescript
if (condition) {
  const result = useMyHook(); // WRONG!
}
```

✅ **Do call hooks at top level**
```typescript
const result = useMyHook(); // CORRECT
```

❌ **Don't use hooks from non-hook functions**
```typescript
function notAHook() {
  const state = useState(0); // WRONG!
}
```

✅ **Create a hook if you need state**
```typescript
function useMyState() {
  const [state, setState] = useState(0);
  return [state, setState];
}
```

## Performance Optimization

### Use useCallback for event handlers
```typescript
const handleClick = useCallback(() => {
  // Handle click
}, [dependencies]);
```

### Use useMemo for expensive calculations
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);
```

### Use useRef for mutable values
```typescript
const timerRef = useRef<NodeJS.Timeout | null>(null);
```

## Custom Hook Template

```typescript
import { useCallback, useEffect, useState } from 'react';

interface UseMyHookReturn {
  state: unknown;
  action: () => void;
}

/**
 * Brief description of what the hook does
 * @param initialValue - Initial value for the state
 * @returns Object with state and actions
 */
export function useMyHook(initialValue: unknown): UseMyHookReturn {
  const [state, setState] = useState(initialValue);

  const action = useCallback(() => {
    // Perform action
    setState(/* new value */);
  }, []);

  useEffect(() => {
    // Side effects
    
    return () => {
      // Cleanup
    };
  }, []);

  return { state, action };
}
```

## SSR-Safe Hook Template

For use with Next.js Server Components:

```typescript
'use client'; // Must be client component

import { useCallback, useEffect, useState } from 'react';

export function useMyHook() {
  const [state, setState] = useState<unknown>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Only run on client
    setIsHydrated(true);
    // Initialize state
    setState(/* value */);
  }, []);

  // Return safe defaults during SSR
  if (!isHydrated) {
    return { state: null };
  }

  return { state };
}
```

## Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [useHooks.com](https://usehooks.com) - Collection of custom hooks
- [Offline Indicator Guide](../components/OFFLINE_INDICATOR_GUIDE.md)
- [Integration Guide](../../INTEGRATION_GUIDE.md)
- [Task 31 Implementation](../../OFFLINE_DETECTION_IMPLEMENTATION.md)
