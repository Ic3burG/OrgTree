# User Discovery and Privacy Controls Plan

Add the ability for users to be discovered by email when sharing an organization, while providing a privacy setting to opt out of this feature.

## Goal

When an administrator attempts to share an organization or add a member, existing OrgTree users should be discoverable via an autocomplete/popup interface. Users must also have the ability to opt out of being discoverable in their security settings.

## User Review Required

> [!IMPORTANT]
> **Privacy by Default**: The "is discoverable" option will be **enabled by default** for all existing and new users, as requested. This increases the discoverability of the platform but may be a concern for some users.

## Proposed Changes

### Database

#### [MODIFY] [server/src/db.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/db.ts)

- Add a migration to include `is_discoverable` BOOLEAN column to the `users` table.
- Default value: `1` (true).

### Backend API

#### [NEW] [server/src/routes/users.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/routes/users.ts)

- Implement `GET /api/users/search?q=...` endpoint.
- Returns a list of users matching the query (email or name) only if `is_discoverable` is true.
- Search should be scoped to email prefix or name.

#### [MODIFY] [server/src/routes/auth.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/routes/auth.ts)

- Update profile/settings endpoint to allow updating the `is_discoverable` preference.

### Frontend

#### [MODIFY] [src/components/auth/SecuritySettingsPage.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/auth/SecuritySettingsPage.tsx)

- Add a new "Privacy & Discoverability" section.
- Include a toggle switch: "Allow other users to find me by email when sharing organizations".
- Default: Enabled.

#### [MODIFY] [src/components/admin/AddMemberModal.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/AddMemberModal.tsx)

- Enhance the email input with an autocomplete behavior.
- Show user suggestions (Avatar + Name + Email) as the user types.
- Selecting a user automatically fills the email field.

## Verification Plan

### Automated Tests

- **Backend Tests**: Verify search endpoint returns only discoverable users and respects the privacy toggle.
- **Frontend Tests**: Verify the autocomplete UI displays results and populates the form correctly.

### Manual Verification

1. **Discovery**: Type a known user's email in "Add Member" and verify they appear.
2. **Opt-out**: Disable discoverability in Security settings and verify the user no longer appears in searches by other users.
3. **Default State**: Create a new user and verify they are discoverable by default.
