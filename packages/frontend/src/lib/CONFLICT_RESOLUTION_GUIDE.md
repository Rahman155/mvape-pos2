# Conflict Resolution Strategy Implementation Guide

## Overview

This guide documents the implementation of conflict resolution strategies for the Vapestore POS PWA system. The system uses **Last-Write-Wins (LWW)** as the primary conflict resolution strategy, with support for **MERGE** and **MANUAL** strategies for more complex scenarios.

**Requirements Addressed:**
- Requirement 4.5: PWA conflict handling
- Requirement 26.5: Data sync conflicts

## Architecture

### Three-Layer Conflict Resolution

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (Frontend)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Sync Engine (syncEngine.ts)                            │   │
│  │  - Receives batch sync response from server             │   │
│  │  - Detects conflict flag in response                    │   │
│  │  - Notifies user and conflict resolver                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Conflict Resolver (conflictResolution.ts)              │   │
│  │  - Implements LWW, MERGE, MANUAL strategies             │   │
│  │  - Maintains conflict history                           │   │
│  │  - Provides audit trail                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Notification Handler (conflictNotificationHandler.ts)  │   │
│  │  - Shows user notifications about conflicts             │   │
│  │  - Tracks conflict resolution state                     │   │
│  │  - Provides conflict UI hooks                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HTTP POST /sync/batch
         │ with clientTimestamp
         │
┌─────────────────────────────────────────────────────────────────┐
│                    Server (Backend)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Sync Service (sync.ts)                                 │   │
│  │  - processBatchSync(): Main entry point                 │   │
│  │  - processSyncItem(): Individual item processing        │   │
│  │  - detectConflict(): Timestamp-based detection          │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Database                                               │   │
│  │  - Queries existing entity timestamps                   │   │
│  │  - Applies LWW resolution (keeps server version)        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Conflict Resolution Strategies

### 1. Last-Write-Wins (LWW) - Default Strategy

**When Used:** All UPDATE and DELETE operations

**How It Works:**
```
Compare timestamps:
- clientTimestamp: When user made the change (offline)
- serverTimestamp: When server last updated entity

If serverTimestamp > clientTimestamp:
  → Conflict detected: Server version is newer
  → Resolution: Keep server version, reject client update
  → User Notification: "Conflict resolved - server version kept"

If clientTimestamp > serverTimestamp:
  → No conflict: Client version is newer
  → Resolution: Apply client update
  → User Notification: No notification (expected case)
```

**Example:**
```typescript
// Client offline, modifies transaction at 10:00 AM
clientTimestamp = 1700000000

// Server updated same transaction at 10:05 AM
serverTimestamp = 1700000300

// Result: serverTimestamp > clientTimestamp
// → Conflict detected and resolved using LWW
// → Server version kept
// → User notified
```

**Idempotency Property:**
Applying LWW resolution multiple times produces the same result because:
- Each application compares the same timestamps
- Always selects the same "winner" (newer timestamp)
- Result is identical whether applied once or multiple times

### 2. MERGE Strategy - For Compatible Changes

**When Used:** When objects have non-overlapping field changes

**How It Works:**
```
Compare field-level changes:
- Identify which fields changed locally
- Identify which fields changed on server
- If changes are to different fields → Merge them
- If changes are to same field → Use LWW

Example:
Local changes:  { name: "John Updated", phone: "081234567890" }
Server changes: { name: "John", email: "john@example.com" }

Result: { 
  name: "John Updated",    // From local (local changed this)
  phone: "081234567890",   // From local (new field)
  email: "john@example.com" // From server (server changed this)
}
```

**Benefits:**
- Preserves more information when possible
- Reduces data loss compared to pure LWW
- Still deterministic and idempotent

### 3. MANUAL Strategy - For Critical Decisions

**When Used:** When conflicts require human judgment (not implemented in automatic sync)

**How It Works:**
```
1. Detect conflict
2. Flag as requiring manual review
3. Present UI showing both versions
4. User chooses which version to keep
5. Apply chosen version
```

**Use Cases:**
- Conflicting transaction amounts
- Contradictory inventory levels
- Incompatible payment information

## Server-Side Conflict Detection

### Timestamp-Based Detection

The server detects conflicts during the batch sync operation:

```typescript
// Client sends sync request with timestamps
{
  items: [
    {
      id: "txn-123",
      entityType: "transaction",
      changeType: "UPDATE",
      data: { amount: 100000 },
      clientTimestamp: 1700000000
    }
  ]
}

// Server processes:
1. Check if entity exists (SELECT updated_at FROM transactions WHERE id = 'txn-123')
2. Compare serverTimestamp with clientTimestamp
3. If conflict detected:
   - Add conflict info to response
   - Keep server version (LWW strategy)
   - Include conflict details for client

// Server response:
{
  success: true,
  results: [
    {
      id: "txn-123",
      success: true,
      conflict: {
        detected: true,
        strategy: "LWW",
        reason: "Server version (1700000300) is newer than client version (1700000000)",
        serverVersion: 1700000300,
        resolutionApplied: "LWW - Server version kept"
      }
    }
  ],
  conflictsDetected: 1
}
```

### Conflict Prevention

**CREATE Operations:** No conflicts possible (new entities)

**DELETE Operations:** Timestamp comparison still applies

**UPDATE Operations:** Full timestamp-based conflict detection

## Client-Side Conflict Handling

### Sync Engine Integration

The sync engine automatically handles server conflict responses:

```typescript
// processSingleBatch() method
1. Send batch sync request to server
2. Receive response with conflict info
3. For each item with detected conflict:
   a. Notify conflict notification handler
   b. Show user notification
   c. Dispatch event for logging
   d. Mark item as synced (server version kept)
4. Dispatch sync:conflicts event with statistics
```

### User Notifications

Conflicts trigger multiple notification channels:

1. **Toast Notification** (via SyncNotificationManager)
   - "Conflict detected: Transaction txn-123"
   - Shows resolution strategy applied

2. **Detailed Notification** (via ConflictNotificationHandler)
   - Tracked in memory
   - Accessible via React hooks
   - Included in statistics

3. **Audit Events** (sync:conflict-resolved)
   - Dispatched for logging
   - Includes strategy and reason

## Usage Examples

### Using the Conflict Notification Hook

```typescript
import { useConflictNotifications } from '@/hooks/useConflictNotifications';

function ConflictPanel() {
  const { notifications, clearNotification, count } = useConflictNotifications();

  return (
    <div>
      <h3>Conflicts Detected: {count}</h3>
      {notifications.map(notification => (
        <div key={notification.id}>
          <p>{notification.entityType}: {notification.reason}</p>
          <p>Strategy: {notification.strategy}</p>
          <button onClick={() => clearNotification(notification.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Getting Entity-Specific Conflicts

```typescript
import { useEntityConflicts } from '@/hooks/useConflictNotifications';

function TransactionDetail({ transactionId }) {
  const conflicts = useEntityConflicts('transaction', transactionId);

  if (conflicts.length > 0) {
    return <WarningBanner conflicts={conflicts} />;
  }

  return <TransactionInfo />;
}
```

### Programmatic Conflict Handling

```typescript
import { getConflictResolver } from '@/lib/conflictResolution';

const resolver = getConflictResolver('LWW');

// Detect conflict
const conflict = resolver.detectConflicts(
  localVersion,
  serverVersion,
  localTimestamp,
  serverTimestamp,
  'txn-123',
  'transaction'
);

// Resolve if conflict exists
if (conflict) {
  const resolution = resolver.resolveConflict(conflict);
  console.log(`Resolved using: ${resolution.strategy}`);
  console.log(`Winner: ${resolution.winner}`);
  console.log(`Value: ${resolution.resolvedValue}`);
}

// Get audit trail
const history = resolver.getHistory();
const stats = resolver.getStats();
```

## Idempotency Property Testing

### What is Idempotency?

An operation is idempotent if applying it multiple times produces the same result as applying it once.

**Critical Importance:**
- Network may retry sync operations
- Same batch might be processed twice
- Client and server may independently apply conflict resolution
- Must guarantee consistent results

### Test Examples

```typescript
// Property 2: LWW Idempotency
// Applying LWW resolution multiple times → Same result

const resolver = getConflictResolver('LWW');
const resolution1 = resolver.resolveConflict(conflict);
const resolution2 = resolver.resolveConflict(conflict);
const resolution3 = resolver.resolveConflict(conflict);

// All three must be identical
expect(resolution1.resolvedValue).toEqual(resolution2.resolvedValue);
expect(resolution2.resolvedValue).toEqual(resolution3.resolvedValue);
```

### Property-Based Testing

Uses property-based testing to verify idempotency across many inputs:

```typescript
// Generate random conflicts
for (let i = 0; i < 100; i++) {
  const conflict = generateRandomConflict();
  
  // Apply resolution multiple times
  const r1 = resolver.resolveConflict(conflict);
  const r2 = resolver.resolveConflict(conflict);
  
  // Should always be identical
  assert(r1.winner === r2.winner);
  assert(JSON.stringify(r1.resolvedValue) === JSON.stringify(r2.resolvedValue));
}
```

## Merge Strategy Details

### Field-Level Merging

When both local and server versions modify different fields:

```typescript
function mergeObjects(
  local: Record<string, any>,
  remote: Record<string, any>
): Record<string, any> {
  const merged = { ...remote }; // Start with server
  
  // Apply local changes for new/modified fields
  for (const key in local) {
    if (!(key in remote)) {
      // New field from local
      merged[key] = local[key];
    } else if (local[key] !== remote[key]) {
      // Field modified both places - use local (treated as more recent)
      merged[key] = local[key];
    }
  }
  
  return merged;
}
```

### Merge Limitations

Merge strategy cannot resolve:
- Same field modified differently on both sides
- Contradictory data (e.g., inventory quantity)
- Transactions with incompatible changes

→ Falls back to LWW for these cases

## Conflict History and Audit Trail

### What Gets Logged

```typescript
ConflictHistoryItem {
  id: string;                    // Entity ID
  entityType: string;            // 'transaction', 'member', etc.
  localValue: unknown;           // Client's version
  remoteValue: unknown;          // Server's version
  resolution: ConflictResolution; // How it was resolved
  timestamp: number;             // When resolved
}
```

### Accessing History

```typescript
const resolver = getConflictResolver();

// All conflicts
const allHistory = resolver.getHistory();

// For specific entity
const txnConflicts = resolver.getHistoryForEntity('txn-123');

// Statistics
const stats = resolver.getStats();
// { totalConflicts, lwwResolutions, mergeResolutions, manualResolutions }
```

## Testing Conflict Resolution

### Unit Tests

Test individual strategy behavior:
```bash
npm test -- conflictResolution.test.ts
```

### Integration Tests

Test sync engine + conflict resolution:
```bash
npm test -- syncEngineConflictResolution.test.ts
```

### Backend Tests

Test server-side detection:
```bash
npm test -- sync.conflicts.test.ts
```

### Property-Based Tests

Verify idempotency properties:
```bash
npm test -- --run conflictResolution.test.ts
```

## Best Practices

1. **Always Include Timestamps**
   - Client must send `clientTimestamp` with sync items
   - Server always records `updated_at` on entities

2. **Monitor Conflicts**
   - Track conflict statistics
   - Alert if conflict rate is high
   - Investigate patterns

3. **User Communication**
   - Clearly explain what happened
   - Show which version was kept
   - Explain why (LWW strategy)

4. **Audit Trail**
   - Maintain detailed conflict history
   - Log all resolutions
   - Allow admins to review conflicts

5. **Prevent Data Loss**
   - Merge when possible (compatible changes)
   - Use LWW for safety (last update wins)
   - Manual review for critical decisions

## Related Files

- `packages/frontend/src/lib/conflictResolution.ts` - Core resolver
- `packages/frontend/src/lib/syncEngine.ts` - Sync integration
- `packages/frontend/src/lib/conflictNotificationHandler.ts` - Notifications
- `packages/backend/src/services/sync.ts` - Server detection
- `packages/frontend/src/__tests__/lib/conflictResolution.test.ts` - Tests
- `packages/backend/src/services/sync.conflicts.test.ts` - Backend tests

## Requirements Compliance

### Requirement 4.5: PWA Conflict Handling
✅ Timestamps used for conflict resolution
✅ Server-side conflict detection implemented
✅ User notification system for conflicts
✅ Merge strategy for compatible changes

### Requirement 26.5: Data Sync Conflicts
✅ Automatic conflict detection during sync
✅ Last-Write-Wins strategy applied
✅ Conflict history maintained
✅ Idempotent operations verified

## Future Enhancements

1. **CRDT Integration** - For more complex data types
2. **Vector Clocks** - Track causality more precisely
3. **Operational Transformation** - For collaborative editing
4. **Conflict Resolution UI** - Allow users to manually resolve complex conflicts
5. **Conflict Analytics** - Dashboard showing conflict patterns
