# TypeScript Service Migration Status

## Overview

This document tracks the progress of migrating backend service files from JavaScript to TypeScript in the OrgTree project.

## Completed Services ✅

### 1. auth.service.ts

- **Status**: Fully typed
- **Key Changes**:
  - Added imports from `../types/index.js`
  - All function parameters typed
  - All return types explicitly defined
  - Database query results typed as `DatabaseUser`, `DatabaseRefreshToken`
  - SQLite boolean conversion with `Boolean()`
  - Error objects typed as `AppError`

### 2. csrf.service.ts

- **Status**: Fully typed
- **Key Changes**:
  - All functions have explicit return types
  - Parameters fully typed
  - Proper type guards for string validation

### 3. email.service.ts

- **Status**: Fully typed
- **Key Changes**:
  - Interface for `SendInvitationEmailParams`
  - Interface for `EmailResult`
  - Resend client typed as `Resend | null`

### 4. socket-events.service.ts

- **Status**: Fully typed
- **Key Changes**:
  - `Actor` interface defined
  - `EventPayload<T>` generic interface
  - All emit functions properly typed

### 5. audit.service.ts

- **Status**: Fully typed
- **Key Changes**:
  - `Actor` interface for user objects
  - `GetAuditLogsOptions` interface
  - `ParsedAuditLog` interface
  - Database results typed as `DatabaseAuditLog[]`
  - Explicit return type interfaces

## In Progress Services 🚧

### 6. org.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Import `DatabaseOrganization`, type DB queries

### 7. department.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Import `DatabaseDepartment`, type recursive functions

### 8. people.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Import `DatabasePerson`, type DB queries

### 9. member.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Import `DatabaseOrgMember`, define `OrgAccessCheck` interface

### 10. invitation.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Import `DatabaseInvitation`, type async functions

### 11. search.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Define search result interfaces, type FTS5 queries

### 12. bulk.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Define bulk operation result interfaces

### 13. backup.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Import `BackupMetadata`, `BackupStats` from types

### 14. users.service.ts

- **Needs**: Type all function parameters and returns
- **Pattern**: Type password generation, role validation

## Migration Pattern

### Standard TypeScript Service Template

```typescript

import db from '../db.js';
import type {
  DatabaseUser, // or DatabaseOrganization, DatabaseDepartment, etc.
  AppError,
} from '../types/index.js';

// Define interfaces for function parameters
interface CreateItemParams {
  name: string;
  description?: string;
}

// Define interfaces for return values
interface ItemResult {
  id: string;
  name: string;
  createdAt: string;
}

// Type all function parameters and return values
export async function createItem(params: CreateItemParams, userId: string): Promise<ItemResult> {
  // Type database query results
  const existing = db.prepare('SELECT * FROM items WHERE name = ?').get(params.name) as
    | DatabaseItem
    | undefined;

  if (existing) {
    const error = new Error('Item already exists') as AppError;
    error.status = 400;
    throw error;
  }

  // ... rest of implementation

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as DatabaseItem;

  return {
    id: item.id,
    name: item.name,
    createdAt: item.created_at,
  };
}

```

### Key TypeScript Rules for Services

1. **All imports must include `.js` extension**:

   ```typescript

   import db from '../db.js';
   import { someFunction } from './other.service.js';
   import type { DatabaseUser } from '../types/index.js';

   ```

2. **Type all function parameters**:

   ```typescript

   export function myFunction(id: string, options: MyOptions): Promise<Result> {
     // ...
   }

   ```

3. **Type all database queries**:

   ```typescript

   const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DatabaseUser | undefined;
   const users = db.prepare('SELECT * FROM users').all() as DatabaseUser[];

   ```

4. **Convert SQLite booleans**:

   ```typescript

   mustChangePassword: Boolean(user.must_change_password); // 0/1 -> boolean

   ```

5. **Type errors properly**:

   ```typescript

   const error = new Error('Message') as AppError;
   error.status = 404;
   throw error;

   ```

6. **Define interfaces for complex return types**:

   ```typescript

   interface SearchResult {
     total: number;
     results: SearchItem[];
     hasMore: boolean;
   }

   export function search(query: string): SearchResult {
     // ...
   }

   ```

## Current Status Summary

- **Total Services**: 14
- **Completed**: 5 (36%)
- **In Progress**: 9 (64%)
- **TypeScript Errors**: 553 total
- **Service Errors**: ~200+ in service files

## Next Steps

1. Complete org.service.ts
2. Complete department.service.ts
3. Complete people.service.ts
4. Complete member.service.ts
5. Complete invitation.service.ts
6. Complete search.service.ts
7. Complete bulk.service.ts
8. Complete backup.service.ts
9. Complete users.service.ts

## Testing After Migration

After completing each service, run:

```bash

cd server
npx tsc --noEmit  # Check for TypeScript errors
npm test          # Run all tests to ensure functionality

```

## Common Issues and Solutions

### Issue: "implicitly has 'any' type"

**Solution**: Add explicit type annotations to all parameters

### Issue: "Property does not exist on type '{}'"

**Solution**: Define interface for options parameter

### Issue: "Type 'unknown' is not assignable"

**Solution**: Add type assertion with `as TypeName`

### Issue: "Cannot find module './file' or its corresponding type declarations"

**Solution**: Add `.js` extension to import path

### Issue: "Object is of type 'unknown'"

**Solution**: Add explicit type to database query result

## Files Modified

- ✅ server/src/services/auth.service.ts
- ✅ server/src/services/csrf.service.ts
- ✅ server/src/services/email.service.ts
- ✅ server/src/services/socket-events.service.ts
- ✅ server/src/services/audit.service.ts
- 🚧 server/src/services/org.service.ts
- 🚧 server/src/services/department.service.ts
- 🚧 server/src/services/people.service.ts
- 🚧 server/src/services/member.service.ts
- 🚧 server/src/services/invitation.service.ts
- 🚧 server/src/services/search.service.ts
- 🚧 server/src/services/bulk.service.ts
- 🚧 server/src/services/backup.service.ts
- 🚧 server/src/services/users.service.ts

## Type Definitions Reference

All type definitions are located in:

- `/Users/ojdavis/Claude Code/OrgTree/server/src/types/index.ts`

Key types available:

- `DatabaseUser`
- `DatabaseOrganization`
- `DatabaseOrgMember`
- `DatabaseDepartment`
- `DatabasePerson`
- `DatabaseInvitation`
- `DatabaseRefreshToken`
- `DatabaseAuditLog`
- `AppError`
- `OrgAccessCheck`
- `CreateUserResult`
- `LoginResult`
- `RefreshResult`
- `JWTPayload`
- `BackupMetadata`
- `BackupStats`

---

**Date**: January 7, 2026
**Status**: Active Development
**Completion**: 36%
