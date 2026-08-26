# Offline Detection & Status Indicator Guide

This guide covers the implementation and usage of offline detection and the connectivity status indicator component.

## Overview

The offline detection system consists of three main parts:

1. **useOnlineStatus Hook** - Custom React hook for detecting network status
2. **OfflineIndicator Component** - UI component to display connectivity status
3. **Types & Interfaces** - TypeScript definitions for type safety

## Features

- ✅ Real-time network connectivity detection
- ✅ Automatic sync queue triggering when coming back online
- ✅ Sync status tracking (idle, syncing, error)
- ✅ Pending changes counter
- ✅ Error handling and retry functionality
- ✅ Responsive design (mobile and desktop)
- ✅ Dark mode support
- ✅ Accessibility compliant (WCAG 2.1)
- ✅ Server-side rendering safe
- ✅ Auto-dismiss notifications

## Installation

The components are already integrated into the application. No additional installation is required.

## Quick Start

### Basic Setup

Add the OfflineIndicator to your app layout (typically in `app/layout.tsx` or a root component):

```tsx
import { OfflineIndicator } from '@/components/OfflineIndicator';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}
```

### Using the Hook

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function MyComponent() {
  const { isOnline, isOffline, status, pendingChanges } = useOnlineStatus();

  return (
    <div>
      {isOffline && <p>No internet connection</p>}
      {status === 'syncing' && <p>Syncing {pendingChanges} changes...</p>}
    </div>
  );
}
```

## Component API

### OfflineIndicator Props

```typescript
interface OfflineIndicatorProps {
  // Position on screen ('top' or 'bottom')
  // @default 'top'
  position?: 'top' | 'bottom';

  // Only show indicator when offline
  // @default true
  onlyShowOffline?: boolean;

  // Custom CSS class name
  className?: string;

  // Show detailed sync status
  // @default false
  showSyncStatus?: boolean;

  // Custom offline message
  // @default 'You are offline'
  offlineText?: string;

  // Custom syncing message
  // @default 'Syncing changes...'
  syncingText?: string;

  // Custom sync error message
  // @default 'Sync failed'
  syncErrorText?: string;

  // Auto-dismiss timeout in ms (0 to disable)
  // @default 0
  autoDismissTimeout?: number;

  // Show pending changes count
  // @default false
  showPendingCount?: boolean;
}
```

### useOnlineStatus Hook Return

```typescript
interface UseOnlineStatusReturn {
  // Current online status ('online', 'offline', 'syncing', 'syncError')
  status: OnlineStatus;

  // Is currently online
  isOnline: boolean;

  // Is currently offline or in error state
  isOffline: boolean;

  // Is currently syncing
  isSyncing: boolean;

  // Last successful sync time
  lastSyncTime: Date | null;

  // Number of pending changes waiting to sync
  pendingChanges: number;

  // Last error message from sync
  lastError: string | null;

  // Manually trigger sync queue processing
  triggerSync: () => Promise<void>;

  // Clear the last error
  clearError: () => void;
}
```

## Usage Examples

### Example 1: Basic Offline Indicator

```tsx
<OfflineIndicator />
```

Shows:
- "You are offline" when no connection
- "Back online" when connection restored

### Example 2: Always Visible with Sync Status

```tsx
<OfflineIndicator
  onlyShowOffline={false}
  showSyncStatus={true}
  showPendingCount={true}
/>
```

Shows:
- Status even when online
- "Syncing 3 changes..." during sync
- Pending changes count

### Example 3: Bottom Position with Auto-Dismiss

```tsx
<OfflineIndicator
  position="bottom"
  autoDismissTimeout={5000}
  showPendingCount={true}
/>
```

Shows indicator at bottom, auto-closes after 5 seconds for errors/success.

### Example 4: Custom Messages

```tsx
<OfflineIndicator
  offlineText="No internet - some features unavailable"
  syncingText="Uploading data..."
  syncErrorText="Upload failed - click retry"
/>
```

### Example 5: Conditional Rendering

```tsx
function MyForm() {
  const { isOffline, pendingChanges } = useOnlineStatus();

  return (
    <form>
      <input type="text" />
      {isOffline && (
        <p className="text-yellow-600">
          Offline - {pendingChanges} changes saved locally
        </p>
      )}
      <button disabled={isOffline}>
        Submit
      </button>
    </form>
  );
}
```

### Example 6: Manual Sync Trigger

```tsx
function DataSync() {
  const { triggerSync, isSyncing, lastError } = useOnlineStatus();

  return (
    <div>
      <button
        onClick={() => triggerSync()}
        disabled={isSyncing}
      >
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
      {lastError && <p className="text-red-600">{lastError}</p>}
    </div>
  );
}
```

### Example 7: Status-Based UI Updates

```tsx
function TransactionsList() {
  const { status, pendingChanges } = useOnlineStatus();
  const OnlineStatus = OnlineStatus;

  return (
    <div>
      {status === OnlineStatus.Syncing && (
        <div className="bg-blue-100 p-4">
          Syncing {pendingChanges} transactions...
        </div>
      )}
      {status === OnlineStatus.Offline && (
        <div className="bg-red-100 p-4">
          You are offline. Transactions will sync when you're back online.
        </div>
      )}
      {status === OnlineStatus.SyncError && (
        <div className="bg-orange-100 p-4">
          Failed to sync. <button onClick={() => triggerSync()}>Retry</button>
        </div>
      )}
      {/* Transaction list */}
    </div>
  );
}
```

### Example 8: Layout Integration

```tsx
// app/layout.tsx
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OfflineIndicator position="top" showSyncStatus={true} />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
```

## OnlineStatus Enum

```typescript
enum OnlineStatus {
  Online = 'online',       // Connected to internet
  Offline = 'offline',     // No connection
  Syncing = 'syncing',     // Currently syncing changes
  SyncError = 'syncError', // Last sync failed
}
```

## Status Transitions

```
                    ┌─────────────────────┐
                    │      Online         │
                    └──────────┬──────────┘
                               │
                       Connection lost
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Offline        │
                    └──────────┬──────────┘
                               │
                    Connection restored +
                    Sync triggered
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Syncing        │
                    └──────────┬──────────┘
                               │
                         ┌─────┴──────┐
                         │            │
                    Success       Failure
                         │            │
                         ▼            ▼
                    ┌─────────┐  ┌─────────────┐
                    │ Online  │  │ SyncError   │
                    └─────────┘  └─────────────┘
                                       │
                                 User clicks
                                   Retry
                                       │
                                       ▼
                                  Back to Syncing
```

## Integration with Service Worker

The hook automatically integrates with the service worker's background sync:

1. **On Online Event**: Automatically triggers `triggerSyncQueue()` to process pending changes
2. **Sync Events**: Listens for custom events:
   - `sync:start` - Sync operation begins
   - `sync:end` - Sync operation completes
   - `sync:progress` - Sync progress updates

Send these events from your service worker:

```typescript
// In service worker
self.postMessage({
  type: 'sync:start'
});

// Later...
self.postMessage({
  type: 'sync:end',
  detail: {
    success: true,
    pendingChanges: 0,
    error: null
  }
});
```

## Styling & Customization

### CSS Classes Applied

The component uses Tailwind CSS with dark mode support:

- **Offline**: Red theme (bg-red-50, border-red-200)
- **Syncing**: Blue theme (bg-blue-50, border-blue-200)
- **SyncError**: Orange theme (bg-orange-50, border-orange-200)
- **Online**: Green theme (bg-green-50, border-green-200)

### Custom Styling Example

```tsx
<OfflineIndicator
  className="shadow-2xl border-2"
  position="bottom"
/>
```

## Accessibility

The component is fully accessible:

- ✅ `role="status"` for status announcements
- ✅ `aria-live="polite"` for dynamic updates
- ✅ `aria-atomic="true"` for complete message reads
- ✅ Semantic HTML buttons with proper labels
- ✅ Keyboard navigation support
- ✅ Screen reader friendly

## Testing

### Testing useOnlineStatus Hook

```typescript
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

test('transitions from offline to online', () => {
  const { result } = renderHook(() => useOnlineStatus());

  // Initially online
  expect(result.current.isOnline).toBe(true);

  // Simulate going offline
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });

  expect(result.current.isOffline).toBe(true);
});
```

### Testing OfflineIndicator Component

```typescript
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import * as useOnlineStatusHook from '@/hooks/useOnlineStatus';

jest.mock('@/hooks/useOnlineStatus');

test('displays offline message', () => {
  jest.spyOn(useOnlineStatusHook, 'useOnlineStatus').mockReturnValue({
    status: 'offline',
    isOffline: true,
    isOnline: false,
    // ... other props
  });

  render(<OfflineIndicator />);
  expect(screen.getByText('You are offline')).toBeInTheDocument();
});
```

## Performance Considerations

- **Minimal Re-renders**: Hook only re-renders on status changes
- **Event Delegation**: Uses browser native online/offline events
- **Cleanup**: Proper event listener cleanup on unmount
- **SSR Safe**: Gracefully handles server-side rendering
- **Mobile Optimized**: Responsive layout with minimal DOM

## Browser Support

- ✅ Chrome/Edge 26+
- ✅ Firefox 3+
- ✅ Safari 4+
- ✅ iOS Safari 5+
- ✅ Android Browser 4+

## Error Handling

The indicator handles various error scenarios:

1. **Network Errors**: Shows error message with retry button
2. **Sync Failures**: Displays reason and allows manual retry
3. **Service Worker Errors**: Gracefully falls back to online status
4. **Missing Window Object**: Safe for SSR

## Best Practices

1. **Always include in root layout** for app-wide coverage
2. **Use `onlyShowOffline={true}`** to reduce UI clutter
3. **Enable `showPendingCount`** for transparency
4. **Set `autoDismissTimeout`** for transient errors
5. **Handle errors gracefully** in forms and critical operations
6. **Test offline behavior** during development

## Troubleshooting

### Indicator not showing

1. Check if `OfflineIndicator` is rendered in app layout
2. Verify `onlyShowOffline` prop setting
3. Check browser DevTools Network tab to simulate offline

### Sync not triggering

1. Verify service worker is registered
2. Check `triggerSyncQueue()` implementation in service worker
3. Confirm background sync event listeners are attached

### Hook returning wrong status

1. Check if hook is inside client component (use 'use client')
2. Verify service worker is active
3. Test with browser DevTools Network throttling

## Related Files

- `/hooks/useOnlineStatus.ts` - Main hook implementation
- `/components/OfflineIndicator.tsx` - UI component
- `/lib/serviceWorker.ts` - Service worker utilities
- `/types/index.ts` - Type definitions
- `/__tests__/hooks/useOnlineStatus.test.ts` - Hook tests
- `/__tests__/components/OfflineIndicator.test.tsx` - Component tests

## Future Enhancements

- [ ] Sound notifications for state changes
- [ ] Toast-based notifications variant
- [ ] Bandwidth estimation
- [ ] Sync queue visualization
- [ ] Analytics integration
- [ ] Custom animation options
