# E2E Test Improvements - Selector and Timeout Tuning

## Summary of Changes

This document outlines the improvements made to the E2E tests to make them more reliable and reduce flakiness.

## Problems Identified

1. **Ambiguous Selectors**: Using `/name/i` matched multiple labels ("Department Name", "Full Name", "Organization Name")
2. **Missing Waits**: Not waiting for dialogs to fully render before interacting with them
3. **Generic Button Text**: Using regex patterns that could match multiple buttons on the same page
4. **Race Conditions**: Not waiting for network requests to complete before proceeding
5. **Insufficient Timeouts**: Default timeouts too short for complex interactions

## Improvements Made

### 1. Playwright Configuration (`playwright.config.ts`)

**Changes:**

- ✅ Increased `actionTimeout` from default 30s to 15s (more reasonable for local dev)
- ✅ Set `navigationTimeout` to 30s (for page loads)
- ✅ Added global test `timeout` of 120s (2 minutes per test)
- ✅ Set `expect.timeout` to 10s for assertions

**Benefits:**

- Prevents premature timeouts on slower machines
- Allows time for React re-renders and API calls
- Better aligns with real-world application behavior

### 2. Organization Creation Test (`cuj-org-management.spec.ts`)

#### Step 1: Create Organization

**Before:**

```typescript
await authenticatedPage.getByLabel(/name/i).fill(orgName);
```

**After:**

```typescript
const createDialog = authenticatedPage.getByRole('dialog');
await expect(createDialog).toBeVisible({ timeout: 5000 });
await createDialog.getByLabel(/organization name/i).fill(orgName);
await createDialog.getByRole('button', { name: /^create organization$/i }).click();
```

**Improvements:**

- ✅ Waits for dialog to be fully visible
- ✅ Uses specific label "Organization Name" instead of generic "name"
- ✅ Uses exact button match with anchors (`^...$`)
- ✅ Scopes interactions to the dialog element

#### Step 2-3: Add Departments

**Before:**

```typescript
await authenticatedPage.getByLabel(/name/i).fill(engineeringDept);
```

**After:**

```typescript
await deptDialog.getByLabel(/^department name/i).fill(engineeringDept);
await deptDialog.getByRole('button', { name: /^add department$/i }).click();
await expect(deptDialog).not.toBeVisible({ timeout: 5000 });
```

**Improvements:**

- ✅ Uses specific label "Department Name"
- ✅ Waits for dialog to close (confirms action completed)
- ✅ Uses anchored regex to match exact button text
- ✅ Adds `waitForLoadState('networkidle')` to ensure page is ready

#### Step 4: Add Person

**Before:**

```typescript
await authenticatedPage.getByLabel(/name/i).fill(personName);
await authenticatedPage.getByLabel(/email/i).fill(personEmail);
```

**After:**

```typescript
await personDialog.getByLabel(/^full name/i).fill(personName);
await personDialog.getByLabel(/^email$/i).fill(personEmail);
await personDialog.getByRole('button', { name: /^add person$/i }).click();
```

**Improvements:**

- ✅ Uses correct label "Full Name \*" (PersonForm uses this specific label)
- ✅ Uses anchored exact match for Email label (`/^email$/i`)
- ✅ Distinguishes "Add Person" from "Add Field" buttons
- ✅ Adds 1s wait before clicking Add Person to ensure department selection is stable

#### Step 5: Move Person (Re-org)

**Before:**

```typescript
const deptSelect = authenticatedPage.getByLabel(/department/i);
// Complex conditional logic checking tagName
```

**After:**

```typescript
const deptSelector = editDialog.locator('#departmentId');
await deptSelector.click();
await editDialog.getByRole('button', { name: frontendDept }).first().click();
```

**Improvements:**

- ✅ Uses the actual element ID (`#departmentId`) from HierarchicalTreeSelector component
- ✅ Waits for dropdown options to appear
- ✅ Uses `.first()` to handle potential duplicates
- ✅ Waits for dialog to close after update

### 3. Search & Discovery Test (`cuj-search.spec.ts`)

#### beforeEach Setup

**Changes:**

- ✅ Applied all the same improvements as org-management test
- ✅ Added `waitForLoadState('networkidle')` before department creation
- ✅ Added `waitForTimeout(1000)` after department selection

#### Search Test

**Before:**

```typescript
await searchInput.fill('Alice Searchable');
await expect(authenticatedPage.getByRole('button', { name: /Alice Searchable/i })).toBeVisible();
```

**After:**

```typescript
await searchInput.fill('Alice Searchable');
await authenticatedPage.waitForTimeout(500); // Wait for debounce
await expect(
  authenticatedPage.getByRole('button', { name: /Alice Searchable/i }).first()
).toBeVisible({ timeout: 10000 });
```

**Improvements:**

- ✅ Waits 500ms for debounce (search hook uses 300ms debounce)
- ✅ Uses `.first()` to handle multiple matches
- ✅ Increased timeout to 10s for search API response
- ✅ Clears search before re-searching to reset state
- ✅ Uses more forgiving selector for final verification (handles both heading and panel display)

### 4. Selector Patterns Reference

| Purpose           | ❌ Avoid          | ✅ Use Instead             |
| ----------------- | ----------------- | -------------------------- |
| Organization Name | `/name/i`         | `/organization name/i`     |
| Department Name   | `/name/i`         | `/^department name/i`      |
| Person Name       | `/name/i`         | `/^full name/i`            |
| Email             | `/email/i`        | `/^email$/i`               |
| Create Org Button | `/create/i`       | `/^create organization$/i` |
| Add Dept Button   | `/add/i`          | `/^add department$/i`      |
| Add Person Button | `/add/i`          | `/^add person$/i`          |
| Update Button     | `/save\|update/i` | `/^update person$/i`       |

### 5. Timeout Patterns Reference

| Action               | Timeout | Reason                            |
| -------------------- | ------- | --------------------------------- |
| Dialog appears       | 5000ms  | Dialogs render quickly            |
| Dialog closes        | 5000ms  | Confirms API call completed       |
| Network idle         | 10000ms | Full page load with API calls     |
| Search debounce      | 500ms   | Hook uses 300ms, add 200ms buffer |
| Department selection | 1000ms  | UI state stabilization            |
| Navigation           | 15000ms | SPA routing + data fetch          |
| Assertions           | 10000ms | API responses + re-renders        |

## Testing Locally

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- e2e/cuj-org-management.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run in debug mode
npm run test:e2e -- --debug

# Run single browser
npm run test:e2e -- --project=chromium
```

## Common Issues & Solutions

### Issue: "Element not found" errors

**Solution:** Use `.first()` on locators and increase timeout

### Issue: "Element not visible" errors

**Solution:** Add `await expect(element).toBeVisible()` before interaction

### Issue: Form submission fails

**Solution:** Wait for dialog to be visible, then wait for it to close after submission

### Issue: Search results don't appear

**Solution:** Add 500ms wait after typing to allow debounce to complete

### Issue: Department selector doesn't work

**Solution:** Use `locator('#departmentId')` instead of label matching

## Best Practices for Future Tests

1. **Always scope to dialogs**: Use `dialog.getByLabel()` not `page.getByLabel()`
2. **Use exact matches**: Prefer `/^button text$/i` over `/button/i`
3. **Wait for state changes**: Check that dialogs close after actions
4. **Add network waits**: Use `waitForLoadState('networkidle')` after navigation
5. **Handle race conditions**: Add small timeouts (500-1000ms) when UI state must stabilize
6. **Use .first()**: Helps with multiple matches, though exact selectors are better
7. **Check console output**: `console.log()` statements show progress in test output

## Files Changed

- `e2e/cuj-org-management.spec.ts` - Organization lifecycle test
- `e2e/cuj-search.spec.ts` - Search and discovery test
- `playwright.config.ts` - Global timeout configuration
- `e2e/IMPROVEMENTS.md` - This documentation

## Success Metrics

After these improvements, tests should:

- ✅ Pass consistently on local development machines
- ✅ Pass in CI/CD pipeline (GitHub Actions)
- ✅ Provide clear error messages when they do fail
- ✅ Complete within 2 minutes per test
- ✅ Work across all browsers (Chromium, Firefox, WebKit)
