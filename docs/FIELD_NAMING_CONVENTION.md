# Field Naming Convention

## CRITICAL: Database Field Naming Rules

**⚠️ WARNING: Violating these rules will break the OrgMap visualization!**

This document establishes the **mandatory** field naming convention for OrgTree. Failure to follow these rules will cause the organization chart to fail rendering department connections.

---

## The Problem

The OrgMap component (`src/components/OrgMap.tsx`) depends on specific field names to create edges (connection lines) between departments:

```typescript
// Line 110 in OrgMap.tsx
if (dept.parent_id) {
  edges.push({
    id: `e-${dept.parent_id}-${dept.id}`,
    source: dept.parent_id, // ← Requires parent_id in snake_case
    target: dept.id,
    type: 'smoothstep',
  });
}
```

**If `parent_id` is returned as `parentId` (camelCase), this check fails silently and no edges are created.**

---

## The Solution: ALWAYS Use snake_case

### Database Schema

- SQLite columns use `snake_case` (e.g., `parent_id`, `organization_id`, `sort_order`)
- This is the source of truth

### Backend Services

- SQL queries MUST return column names without aliasing (snake_case)
- TypeScript interfaces MUST use snake_case to match database schema
- **DO NOT** use `AS` aliases to convert to camelCase

### Frontend Types

- TypeScript interfaces use snake_case (see `src/types/index.ts`)
- React components expect snake_case field names
- Data flows from backend → frontend without transformation

---

## Examples

### ✅ CORRECT Backend Query

```typescript
// org.service.ts
const departments = db
  .prepare(
    `
  SELECT
    d.id,
    d.organization_id,    -- NO aliasing
    d.parent_id,          -- NO aliasing
    d.name,
    d.description,
    d.sort_order,         -- NO aliasing
    d.created_at,         -- NO aliasing
    d.updated_at          -- NO aliasing
  FROM departments d
  WHERE d.organization_id = ? AND d.deleted_at IS NULL
  ORDER BY d.sort_order ASC
`
  )
  .all(id) as Department[];
```

### ❌ WRONG Backend Query (WILL BREAK EDGES!)

```typescript
// DON'T DO THIS!
const departments = db
  .prepare(
    `
  SELECT
    d.id,
    d.organization_id as organizationId,  -- ❌ WRONG!
    d.parent_id as parentId,              -- ❌ BREAKS EDGES!
    d.name,
    d.description,
    d.sort_order as sortOrder,            -- ❌ WRONG!
    d.created_at as createdAt,            -- ❌ WRONG!
    d.updated_at as updatedAt             -- ❌ WRONG!
  FROM departments d
  WHERE d.organization_id = ? AND d.deleted_at IS NULL
  ORDER BY d.sort_order ASC
`
  )
  .all(id) as Department[];
```

### ✅ CORRECT TypeScript Interface

```typescript
// Backend service interface
interface Department {
  id: string;
  organization_id: string; // snake_case
  parent_id: string | null; // snake_case
  name: string;
  description: string | null;
  sort_order: number; // snake_case
  created_at: string; // snake_case
  updated_at: string; // snake_case
}
```

### ❌ WRONG TypeScript Interface

```typescript
// DON'T DO THIS!
interface Department {
  id: string;
  organizationId: string; // ❌ WRONG!
  parentId: string | null; // ❌ BREAKS EDGES!
  name: string;
  description: string | null;
  sortOrder: number; // ❌ WRONG!
  createdAt: string; // ❌ WRONG!
  updatedAt: string; // ❌ WRONG!
}
```

---

## Affected Fields

### Department Fields

- `organization_id` (NOT organizationId)
- `parent_id` (NOT parentId) **← CRITICAL FOR EDGES**
- `sort_order` (NOT sortOrder)
- `created_at` (NOT createdAt)
- `updated_at` (NOT updatedAt)
- `deleted_at` (NOT deletedAt)

### Person Fields

- `department_id` (NOT departmentId)
- `sort_order` (NOT sortOrder)
- `created_at` (NOT createdAt)
- `updated_at` (NOT updatedAt)
- `deleted_at` (NOT deletedAt)

### Organization Fields

- `created_by_id` (NOT createdById)
- `created_at` (NOT createdAt)
- `updated_at` (NOT updatedAt)

---

## Prevention: Automated Testing

A validation test suite ensures compliance:

**File:** `server/src/services/__field-naming-validation.test.ts`

This test:

- ✅ Verifies `parent_id` exists in snake_case (critical for edges)
- ✅ Verifies `organization_id`, `sort_order`, timestamps are snake_case
- ✅ Verifies camelCase variants DO NOT exist
- ❌ FAILS if any field is in camelCase

**If this test fails, DO NOT ignore it. Fix the field names immediately.**

---

## History: Why This Matters

This bug has occurred **multiple times** during development:

1. **Session 25 (Jan 8, 2026)**: Initial occurrence after TypeScript migration
2. **Session 37 (Jan 10, 2026)**: Regression during refactoring
3. **Session 46+ (Jan 11, 2026)**: Regression again, validation tests added

Each time, the symptoms were:

- Department nodes displayed correctly
- **Connection lines between departments disappeared**
- No errors in console (silent failure)
- Users reported: "The org chart is broken!"

---

## When Modifying Code

Before changing any backend service that returns departments, people, or organizations:

1. **Check the frontend type definitions** in `src/types/index.ts`
2. **Match the field names exactly** (snake_case)
3. **Run the validation test**: `npm test -- __field-naming-validation`
4. **Verify edges render** by viewing the org chart in the browser

---

## Questions?

If you're unsure whether to use snake_case or camelCase:

**ALWAYS use snake_case for database-backed fields.**

This is not a style preference. It's a **functional requirement** for the org chart to work.

---

**Last Updated:** January 11, 2026
**Maintained By:** Development Team
**Related Files:**

- `src/components/OrgMap.tsx` (edge creation logic)
- `src/types/index.ts` (frontend type definitions)
- `server/src/services/org.service.ts` (backend queries)
- `server/src/services/__field-naming-validation.test.ts` (validation tests)
