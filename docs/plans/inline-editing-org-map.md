# Inline Editing on Org Map Person Cards

> **Status**: Planned  
> **Created**: January 22, 2026  
> **Priority**: High  
> **Complexity**: Medium-High

## Overview

Enable quick, inline editing of person details directly on the Org Map without opening the full PersonForm dialog. This will significantly improve the user experience by allowing rapid updates to key fields while viewing the organizational structure.

## User Story

**As a** user managing people on the Org Map  
**I want** to edit person details directly on their card  
**So that** I can make quick updates without losing context or navigating away from the org chart

## Current Behavior

- Clicking a person card opens a full-screen modal (`PersonForm`) with all fields
- Users must navigate away from the org map context to make simple edits
- The modal contains: name, title, email, phone, department, starred status, and custom fields
- Changes require clicking through the full form workflow

## Proposed Behavior

### Two-Mode Editing System

#### 1. **Quick Edit Mode** (Inline on Card)

- **Trigger**: Double-click or click an "Edit" icon on the person card
- **Editable Fields** (inline):
  - Name (text input)
  - Title (text input)
  - Email (text input)
  - Phone (text input)
  - Starred status (toggle button)
- **UI Behavior**:
  - Card expands slightly to accommodate input fields
  - Fields become editable in-place
  - Save/Cancel buttons appear
  - Real-time validation with error messages
  - Auto-save on blur (optional) or explicit save button
  - Escape key to cancel, Enter to save (for text fields)

#### 2. **Full Edit Mode** (Existing Modal)

- **Trigger**: Click "More Options" or "Advanced Edit" button in quick edit mode
- **Purpose**: For complex edits requiring:
  - Department changes (requires dropdown with hierarchy)
  - Custom field management
  - Adding/editing custom field definitions
  - Bulk operations

### Visual Design

**Normal State (PersonRowCard)**:

```
┌─────────────────────────────────────┐
│ [JD] John Doe ⭐          →         │
│      Senior Engineer                │
└─────────────────────────────────────┘
```

**Quick Edit State**:

```
┌─────────────────────────────────────────────┐
│ [JD] [John Doe____________] ⭐              │
│      [Senior Engineer_____]                 │
│      [john.doe@example.com]                 │
│      [(555) 123-4567______]                 │
│                                              │
│      [Save] [Cancel] [More Options...]      │
└─────────────────────────────────────────────┘
```

**Design Specifications**:

- **Expanded Height**: ~180px (from ~60px)
- **Input Styling**:
  - Border: 1px solid blue-400 (focus state)
  - Background: white/slate-700 (theme-aware)
  - Padding: 2px 8px (compact)
  - Font size: 14px (readable but compact)
- **Buttons**:
  - Save: Blue primary button with shadow
  - Cancel: Gray secondary button
  - More Options: Link-style button
- **Animations**:
  - Smooth height transition (200ms ease-in-out)
  - Fade-in for buttons
  - Slide-down for additional fields

## Technical Implementation

### Architecture Changes

#### 1. New Component: `PersonRowCardEditable.tsx`

Create a new component that wraps `PersonRowCard` with editing capabilities:

```typescript
interface PersonRowCardEditableProps {
  person: Person;
  onSelect?: (person: Person) => void;
  onUpdate?: (personId: string, updates: Partial<PersonFormData>) => Promise<void>;
  onOpenFullEdit?: (person: Person) => void;
  isLast?: boolean;
  isEditing?: boolean;
  onEditStart?: (personId: string) => void;
  onEditEnd?: () => void;
}

interface EditState {
  isEditing: boolean;
  formData: {
    name: string;
    title: string;
    email: string;
    phone: string;
    isStarred: boolean;
  };
  errors: {
    name?: string;
    email?: string;
    phone?: string;
  };
  isSaving: boolean;
}
```

**Key Features**:

- Toggle between view and edit modes
- Local state management for form data
- Validation (name required, email format)
- Optimistic updates with rollback on error
- Keyboard shortcuts (Enter to save, Escape to cancel)
- Click-outside to cancel (with confirmation if dirty)

#### 2. Update `DepartmentNode.tsx`

Modify to use `PersonRowCardEditable` instead of `PersonRowCard`:

```typescript
// In DepartmentNode.tsx
import PersonRowCardEditable from './PersonRowCardEditable';

// Add editing state
const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

// Add update handler
const handlePersonUpdate = async (personId: string, updates: Partial<PersonFormData>) => {
  try {
    await api.updatePerson(orgId, personId, updates);
    // Refresh data or update local state
    if (onPersonUpdated) {
      onPersonUpdated(personId, updates);
    }
  } catch (error) {
    throw error; // Let component handle error display
  }
};

// In render
{people.map((person, index) => (
  <PersonRowCardEditable
    key={person.id}
    person={person}
    onSelect={onSelectPerson}
    onUpdate={handlePersonUpdate}
    onOpenFullEdit={onSelectPerson} // Opens full modal
    isLast={index === people.length - 1}
    isEditing={editingPersonId === person.id}
    onEditStart={(id) => setEditingPersonId(id)}
    onEditEnd={() => setEditingPersonId(null)}
  />
))}
```

#### 3. Update `OrgMap.tsx`

Add callback to handle person updates and refresh data:

```typescript
// In OrgMap.tsx
const handlePersonUpdated = useCallback((personId: string, updates: Partial<PersonFormData>) => {
  // Update local state optimistically
  setNodes(prevNodes =>
    prevNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        people: node.data.people?.map(p =>
          p.id === personId ? { ...p, ...updates } : p
        ),
      },
    }))
  );
}, []);

// Pass to department nodes
data: {
  // ... existing data
  onPersonUpdated: handlePersonUpdated,
}
```

#### 4. Validation Logic

Reuse validation from `PersonForm.tsx`:

```typescript
// utils/personValidation.ts
export interface PersonValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export function validatePersonQuickEdit(data: {
  name: string;
  email: string;
  phone: string;
}): PersonValidationErrors {
  const errors: PersonValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Name is required';
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Phone validation (optional, basic format check)
  if (data.phone && !/^[\d\s\-\(\)\+]+$/.test(data.phone)) {
    errors.phone = 'Invalid phone format';
  }

  return errors;
}
```

#### 5. API Integration

Leverage existing API client:

```typescript
// In PersonRowCardEditable.tsx
const handleSave = async () => {
  const errors = validatePersonQuickEdit(formData);
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }

  setIsSaving(true);
  try {
    await onUpdate(person.id, {
      name: formData.name,
      title: formData.title,
      email: formData.email,
      phone: formData.phone,
      isStarred: formData.isStarred,
    });
    onEditEnd();
  } catch (error) {
    alert((error as Error).message || 'Failed to save changes');
  } finally {
    setIsSaving(false);
  }
};
```

### UX Enhancements

#### 1. **Keyboard Shortcuts**

- `Enter`: Save changes (when focused on text input)
- `Escape`: Cancel editing
- `Tab`: Navigate between fields
- `Ctrl/Cmd + Enter`: Save from any field

#### 2. **Unsaved Changes Warning**

- Show confirmation dialog if user clicks outside with unsaved changes
- Visual indicator (asterisk or dot) next to Save button when dirty

#### 3. **Optimistic Updates**

- Update UI immediately on save
- Rollback if API call fails
- Show subtle loading indicator during save

#### 4. **Error Handling**

- Inline error messages below each field
- Red border on invalid fields
- Toast notification for save failures
- Retry mechanism for network errors

#### 5. **Mobile Considerations**

- Larger touch targets for edit button
- Full-width inputs on mobile
- Sticky save/cancel buttons at bottom
- Virtual keyboard handling (scroll into view)

### Accessibility

- **ARIA Labels**:
  - `aria-label="Edit person details"` on edit button
  - `aria-live="polite"` for error messages
  - `aria-invalid="true"` on fields with errors
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader**: Announce edit mode entry/exit
- **Focus Management**:
  - Auto-focus first field on edit mode entry
  - Return focus to edit button on cancel
  - Trap focus within edit mode

### Performance Considerations

1. **Debouncing**: Debounce validation on keystroke (300ms)
2. **Memoization**: Memo component to prevent unnecessary re-renders
3. **Lazy Loading**: Only load edit UI when entering edit mode
4. **Optimistic Updates**: Update UI before API response
5. **Cancel Pending Requests**: Abort API calls if user cancels

## Testing Strategy

### Unit Tests

**File**: `src/components/PersonRowCardEditable.test.tsx`

```typescript
describe('PersonRowCardEditable', () => {
  it('should render in view mode by default', () => {
    // Test normal card display
  });

  it('should enter edit mode on double-click', () => {
    // Test edit mode activation
  });

  it('should validate name field', () => {
    // Test required name validation
  });

  it('should validate email format', () => {
    // Test email regex validation
  });

  it('should save changes on Enter key', () => {
    // Test keyboard shortcut
  });

  it('should cancel on Escape key', () => {
    // Test keyboard shortcut
  });

  it('should show unsaved changes warning', () => {
    // Test dirty state detection
  });

  it('should handle save errors gracefully', () => {
    // Test error handling
  });

  it('should toggle starred status', () => {
    // Test star button functionality
  });
});
```

**File**: `src/utils/personValidation.test.ts`

```typescript
describe('validatePersonQuickEdit', () => {
  it('should require name', () => {
    const errors = validatePersonQuickEdit({ name: '', email: '', phone: '' });
    expect(errors.name).toBe('Name is required');
  });

  it('should validate email format', () => {
    const errors = validatePersonQuickEdit({
      name: 'John',
      email: 'invalid-email',
      phone: '',
    });
    expect(errors.email).toBe('Invalid email format');
  });

  it('should allow empty email', () => {
    const errors = validatePersonQuickEdit({ name: 'John', email: '', phone: '' });
    expect(errors.email).toBeUndefined();
  });
});
```

### Integration Tests

**File**: `e2e/org-map-inline-edit.spec.ts` (Playwright)

```typescript
test.describe('Org Map Inline Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to org map
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/organizations');
    await page.click('text=Test Organization');
    await page.click('text=Org Map');
  });

  test('should edit person name inline', async ({ page }) => {
    // Expand a department
    await page.click('[data-testid="department-node-1"]');

    // Double-click person card to edit
    await page.dblclick('[data-testid="person-card-1"]');

    // Edit name
    await page.fill('[data-testid="edit-name-input"]', 'Jane Smith');

    // Save
    await page.click('[data-testid="save-button"]');

    // Verify update
    await expect(page.locator('[data-testid="person-card-1"]')).toContainText('Jane Smith');
  });

  test('should show validation errors', async ({ page }) => {
    await page.click('[data-testid="department-node-1"]');
    await page.dblclick('[data-testid="person-card-1"]');

    // Clear name (required field)
    await page.fill('[data-testid="edit-name-input"]', '');
    await page.click('[data-testid="save-button"]');

    // Check for error message
    await expect(page.locator('text=Name is required')).toBeVisible();
  });

  test('should cancel on Escape key', async ({ page }) => {
    await page.click('[data-testid="department-node-1"]');
    await page.dblclick('[data-testid="person-card-1"]');

    const originalName = await page.textContent('[data-testid="person-card-1"]');

    await page.fill('[data-testid="edit-name-input"]', 'Different Name');
    await page.keyboard.press('Escape');

    // Verify name unchanged
    await expect(page.locator('[data-testid="person-card-1"]')).toContainText(originalName!);
  });

  test('should open full edit modal from quick edit', async ({ page }) => {
    await page.click('[data-testid="department-node-1"]');
    await page.dblclick('[data-testid="person-card-1"]');

    await page.click('text=More Options');

    // Verify full modal opened
    await expect(page.locator('text=Edit Person')).toBeVisible();
    await expect(page.locator('[name="departmentId"]')).toBeVisible(); // Department dropdown only in full modal
  });
});
```

### Manual Testing Checklist

- [ ] Double-click person card enters edit mode
- [ ] All fields are editable (name, title, email, phone)
- [ ] Star button toggles correctly
- [ ] Save button saves changes to database
- [ ] Cancel button discards changes
- [ ] Enter key saves changes
- [ ] Escape key cancels editing
- [ ] Validation errors display correctly
- [ ] Empty name shows error
- [ ] Invalid email shows error
- [ ] Unsaved changes warning appears when clicking outside
- [ ] "More Options" opens full PersonForm modal
- [ ] Changes persist after page refresh
- [ ] Multiple people can't be edited simultaneously
- [ ] Mobile: Touch targets are adequate
- [ ] Mobile: Virtual keyboard doesn't obscure fields
- [ ] Dark mode: All states look correct
- [ ] Accessibility: Keyboard navigation works
- [ ] Accessibility: Screen reader announces states

## Edge Cases

1. **Concurrent Edits**: Prevent editing multiple people simultaneously
2. **Network Errors**: Handle save failures gracefully with retry option
3. **Stale Data**: Refresh person data after save to ensure consistency
4. **Long Names**: Truncate or wrap long names in edit mode
5. **Special Characters**: Handle names/emails with unicode characters
6. **Empty Department**: Handle case where department has no people
7. **Permissions**: Disable edit for users without update permissions
8. **Deleted Person**: Handle if person is deleted while editing

## Future Enhancements

1. **Batch Editing**: Edit multiple people at once
2. **Drag-and-Drop**: Drag person cards to different departments
3. **Inline Department Change**: Dropdown to change department without full modal
4. **Custom Fields Quick Edit**: Show top 2-3 custom fields inline
5. **Undo/Redo**: Command history for quick edits
6. **Auto-Save**: Save changes automatically after delay
7. **Collaborative Editing**: Show when another user is editing same person
8. **Edit History**: View audit log of changes

## Dependencies

- No new dependencies required
- Uses existing API client (`api.updatePerson`)
- Leverages existing validation patterns from `PersonForm`
- Reuses existing UI components and styling

## Rollout Plan

1. **Phase 1**: Basic inline editing (name, title, email, phone)
2. **Phase 2**: Starred status toggle
3. **Phase 3**: Validation and error handling
4. **Phase 4**: Keyboard shortcuts and accessibility
5. **Phase 5**: Mobile optimizations
6. **Phase 6**: Advanced features (auto-save, undo)

## Success Metrics

- Reduced time to edit person details (target: 50% reduction)
- Increased user engagement with org map
- Reduced bounce rate from org map to admin panel
- Positive user feedback on ease of use
- No increase in data validation errors

## Related Features

- Existing PersonForm modal (full edit mode)
- Department hierarchy highlighting (visual context during edit)
- Search and filter (maintain context while editing)
- Custom fields system (advanced editing in full modal)

---

**Document Owner**: Development Team  
**Last Updated**: January 22, 2026
