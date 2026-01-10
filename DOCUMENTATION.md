# OrgTree Documentation

> Complete User Guide and Administration Manual

**Version**: 1.0
**Last Updated**: January 9, 2026
**Application URL**: <https://orgtree-app.onrender.com>

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Guide](#user-guide)
4. [Organization Management](#organization-management)
5. [Department Management](#department-management)
6. [People Management](#people-management)
7. [Org Chart Visualization](#org-chart-visualization)
8. [Search Features](#search-features)
9. [Dark Mode](#dark-mode)
10. [Team Collaboration](#team-collaboration)
11. [Sharing & Public Access](#sharing--public-access)
12. [Bulk Operations](#bulk-operations)
13. [Data Import & Export](#data-import--export)
14. [Audit Trail](#audit-trail)
15. [Administration Guide](#administration-guide)
16. [Superuser Guide](#superuser-guide)
17. [Troubleshooting](#troubleshooting)
18. [Keyboard Shortcuts](#keyboard-shortcuts)
19. [Glossary](#glossary)

---

## Introduction

### What is OrgTree?

OrgTree is a comprehensive organizational directory and visualization tool that allows you to:

- Create and manage organizational hierarchies
- Visualize department structures with interactive org charts
- Track and manage people across departments
- Collaborate with team members in real-time
- Share organization charts publicly or with specific users
- Import/export data via CSV and XML formats
- Maintain a complete audit trail of all changes

### Key Features

| Feature                        | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| **Multi-Organization Support** | Manage multiple organizations from one account        |
| **Hierarchical Departments**   | Unlimited nesting of departments and sub-departments  |
| **Interactive Org Chart**      | Zoom, pan, expand/collapse, and navigate visually     |
| **Real-Time Collaboration**    | Changes sync instantly across all users               |
| **Role-Based Permissions**     | Owner, Admin, Editor, and Viewer roles                |
| **Advanced Search**            | Full-text search with fuzzy matching and autocomplete |
| **Bulk Operations**            | Select and modify multiple items at once              |
| **Audit Trail**                | Complete history of all changes with 1-year retention |
| **Public Sharing**             | Share read-only links with anyone                     |
| **Data Import/Export**         | CSV and GEDS XML support                              |

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Internet**: Stable internet connection required
- **Screen**: Minimum 320px width (mobile responsive)

---

## Getting Started

### Creating an Account

1. Navigate to <https://orgtree-app.onrender.com>
2. Click **"Sign Up"** on the login page
3. Enter your details:
   - **Name**: Your full name (displayed to other users)
   - **Email**: Valid email address (used for login)
   - **Password**: Minimum 6 characters
4. Click **"Create Account"**
5. You'll be automatically logged in and redirected to the dashboard

### Logging In

1. Navigate to <https://orgtree-app.onrender.com>
2. Enter your **email** and **password**
3. Click **"Log In"**

### First-Time Password Change

If your account was created by an administrator:

1. Log in with the temporary password provided
2. You'll be redirected to the **Change Password** page
3. Enter a new password (minimum 6 characters)
4. Click **"Change Password"**
5. Log in again with your new password

### Navigation Overview

After logging in, you'll see the **Organization Selector** page:

```text
┌─────────────────────────────────────────────────────────┐
│  OrgTree                          [User Name] [Logout]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Your Organizations                                     │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Acme Corp       │  │ Beta Inc        │              │
│  │ 5 departments   │  │ 3 departments   │              │
│  │ Owner           │  │ Editor          │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  [+ Create New Organization]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## User Guide

### Dashboard

The Dashboard is your central hub for managing an organization. Access it by clicking on any organization card.

#### Dashboard Layout

```text
┌─────────────────────────────────────────────────────────┐
│  [Logo] Organization Name                    [User] ▼   │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  Dashboard   │   Organization Overview                  │
│  Departments │   ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  People      │   │ 5 Depts  │ │ 23 People│ │ 3 Members││
│  Audit Log   │   └──────────┘ └──────────┘ └──────────┘│
│              │                                          │
│  ─────────── │   Quick Actions                          │
│  [Org Map]   │   [View Org Chart] [Share] [Import]     │
│  [Share]     │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

#### Dashboard Features

- **Statistics Cards**: Overview of departments, people, and team members
- **Quick Actions**: One-click access to common tasks
- **Navigation Sidebar**: Access all management pages
- **Org Map Button**: Launch the interactive visualization

### Understanding User Roles

OrgTree uses a 4-tier permission system:

| Role       | Permissions                                                                |
| ---------- | -------------------------------------------------------------------------- |
| **Owner**  | Full control. Cannot be removed or demoted. Only one per organization.     |
| **Admin**  | Manage members, sharing settings, and all content. Can add/remove members. |
| **Editor** | Create, edit, and delete departments and people. Cannot manage members.    |
| **Viewer** | Read-only access. Can view all content but cannot make changes.            |

Your role is displayed on organization cards and in the sidebar.

---

## Organization Management

### Creating an Organization

1. From the Organization Selector, click **"+ Create New Organization"**
2. Enter the organization name
3. Click **"Create"**
4. You become the **Owner** of the new organization

### Renaming an Organization

1. From the Organization Selector, find your organization card
2. Click the **pencil icon** (✏️) on the card
3. Enter the new name
4. Click **"Save"**

> **Note**: Only Owners and Admins can rename organizations.

### Deleting an Organization

1. From the Dashboard, access organization settings
2. Click **"Delete Organization"**
3. Confirm the deletion

> **Warning**: This permanently deletes all departments, people, and audit history. This action cannot be undone.

### Switching Organizations

1. Click your organization name in the header
2. Or click **"← Back to Organizations"** in the sidebar
3. Select a different organization from the list

---

## Department Management

### Viewing Departments

1. Navigate to **Departments** in the sidebar
2. Departments are displayed in a tree structure showing the hierarchy

```text
┌─────────────────────────────────────────────────────────┐
│  Departments                        [Select] [+ Add]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▼ Executive Office                          3 people   │
│    ▼ Legal Department                        2 people   │
│    ▼ Communications                          4 people   │
│                                                         │
│  ▼ Engineering                              12 people   │
│    ▼ Frontend Team                           5 people   │
│    ▼ Backend Team                            4 people   │
│    ▼ DevOps                                  3 people   │
│                                                         │
│  ▼ Human Resources                           6 people   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Creating a Department

1. Click **"+ Add Department"**
2. Fill in the form:
   - **Name** (required): Department name
   - **Description** (optional): Brief description
   - **Parent Department** (optional): Select to create as sub-department
3. Click **"Create"**

### Editing a Department

1. Hover over the department row
2. Click the **pencil icon** (✏️)
3. Modify the fields
4. Click **"Save"**

### Moving a Department

To change a department's parent (re-organize hierarchy):

1. Edit the department
2. Change the **Parent Department** dropdown
3. Click **"Save"**

> **Note**: Moving a department also moves all its sub-departments.

### Deleting a Department

1. Hover over the department row
2. Click the **trash icon** (🗑️)
3. Confirm the deletion

> **Warning**: Deleting a department also deletes:
>
> - All sub-departments
> - All people in the department and sub-departments

### Expanding/Collapsing Departments

- Click the **arrow icon** (▶/▼) to expand or collapse sub-departments
- By default, all departments are expanded on page load

---

## People Management

### Viewing People

1. Navigate to **People** in the sidebar
2. All people across all departments are listed

```text
┌─────────────────────────────────────────────────────────┐
│  People                             [Select] [+ Add]    │
├─────────────────────────────────────────────────────────┤
│  🔍 Search...                    [All Departments ▼]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  John Smith                         [Engineering]       │
│  Senior Developer                                       │
│  📧 john@example.com  📞 555-0101                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Jane Doe                           [Human Resources]   │
│  HR Manager                                             │
│  📧 jane@example.com  📞 555-0102                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Filtering People

- **Search**: Type in the search box to filter by name, title, email, or phone
- **Department Filter**: Use the dropdown to show only people from a specific department

### Creating a Person

1. Click **"+ Add Person"**
2. Fill in the form:
   - **Name** (required): Full name
   - **Title** (optional): Job title
   - **Email** (optional): Email address
   - **Phone** (optional): Phone number
   - **Department** (required): Select their department
3. Click **"Create"**

### Editing a Person

1. Hover over the person's row
2. Click the **pencil icon** (✏️)
3. Modify the fields
4. Click **"Save"**

### Moving a Person to Another Department

1. Edit the person
2. Change the **Department** dropdown
3. Click **"Save"**

### Deleting a Person

1. Hover over the person's row
2. Click the **trash icon** (🗑️)
3. Confirm the deletion

---

## Org Chart Visualization

### Accessing the Org Chart

1. Click **"Org Map"** in the sidebar, or
2. Click **"View Org Chart"** on the Dashboard

### Org Chart Interface

```text
┌─────────────────────────────────────────────────────────┐
│  [🔍 Search] [Theme ▼] [Layout ▼] [Export ▼] [⛶ Full]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    ┌─────────────┐                      │
│                    │ Acme Corp   │                      │
│                    │ (root)      │                      │
│                    └──────┬──────┘                      │
│               ┌──────────┼──────────┐                   │
│         ┌─────┴─────┐    │    ┌─────┴─────┐            │
│         │Engineering│    │    │    HR     │            │
│         │ 12 people │    │    │ 6 people  │            │
│         └───────────┘    │    └───────────┘            │
│                    ┌─────┴─────┐                        │
│                    │  Finance  │                        │
│                    │ 8 people  │                        │
│                    └───────────┘                        │
│                                                         │
│  [−] [100%] [+]                    [Fit] [Center]      │
└─────────────────────────────────────────────────────────┘
```

### Navigation Controls

| Control           | Action                   |
| ----------------- | ------------------------ |
| **Mouse Drag**    | Pan the canvas           |
| **Scroll Wheel**  | Zoom in/out              |
| **Pinch (touch)** | Zoom on mobile devices   |
| **[−] / [+]**     | Zoom controls            |
| **[Fit]**         | Fit entire chart in view |
| **[Center]**      | Center on root node      |
| **[⛶]**           | Toggle fullscreen mode   |

### Department Nodes

Each department node shows:

- **Department name**
- **People count**
- **Expand/collapse control** (if has people)

Click a department node to:

- **Expand**: Show list of people in that department
- **Collapse**: Hide the people list

### Themes

Change the visual appearance:

1. Click **"Theme"** dropdown
2. Select from available color schemes:
   - Default (Blue)
   - Corporate (Gray)
   - Nature (Green)
   - Sunset (Orange)
   - Ocean (Teal)

### Layout Options

Change how the chart is arranged:

1. Click **"Layout"** dropdown
2. Options:
   - **Vertical** (top-to-bottom)
   - **Horizontal** (left-to-right)

### Exporting the Org Chart

1. Click **"Export"** dropdown
2. Options:
   - **PNG Image**: High-resolution image file
   - **PDF Document**: Multi-page PDF for printing

---

## Search Features

OrgTree includes powerful search capabilities with full-text search, fuzzy matching, and autocomplete.

### Global Search (Org Chart)

1. Click the **search icon** (🔍) in the Org Chart toolbar
2. Type your search query
3. Results appear instantly with highlighted matches

**Search supports:**

- Names (people and departments)
- Job titles
- Email addresses
- Phone numbers
- Department descriptions

### Search Filters

Use the **Type** dropdown to filter results:

- **All**: Search everything
- **Departments**: Only departments
- **People**: Only people

### Autocomplete

As you type (minimum 2 characters):

- Suggestions appear below the search box
- Click a suggestion to navigate directly to that item
- Results are ranked by relevance

### Fuzzy Matching

Search is typo-tolerant:

- "enginr" matches "Engineer"
- "developmnt" matches "Development"
- Word stems are matched ("manage" matches "manager", "managing", "management")

### People Page Search

On the **People** page:

1. Type in the search box
2. Results filter in real-time
3. Combine with department filter for refined results

### Departments Page Search

On the **Departments** page:

1. Type in the search box
2. View switches from tree to flat list showing matches
3. Clear search to return to tree view

---

## Dark Mode

OrgTree includes a comprehensive dark mode feature that provides a comfortable viewing experience in low-light environments.

### Enabling Dark Mode

Dark mode can be toggled from multiple locations throughout the application:

**From Login/Signup Pages:**

1. Look for the **moon icon** (🌙) in the top-right corner
2. Click to toggle between light and dark modes

**From Admin Dashboard:**

1. Find the **moon/sun icon** in the sidebar (desktop) or mobile header
2. Click to toggle dark mode
3. Your preference is saved automatically

**From Org Map:**

1. Click the **palette icon** in the toolbar
2. Find the dark mode toggle in the theme drawer
3. Toggle between light and dark modes

### Dark Mode Features

| Feature                         | Description                                              |
| ------------------------------- | -------------------------------------------------------- |
| **Persistent Preference**       | Your dark mode choice is saved in your browser           |
| **System Preference Detection** | On first visit, respects your system's dark mode setting |
| **Instant Switching**           | Changes apply immediately without page refresh           |
| **Consistent Colors**           | All components follow the same dark mode color scheme    |
| **Accessible**                  | Maintains WCAG AA contrast ratios in both modes          |

### Where Dark Mode Works

Dark mode is available throughout the entire application:

✅ **Authentication Pages**

- Login page
- Signup page
- Password change page

✅ **Main Layouts**

- Admin dashboard and sidebar
- Superuser dashboard and sidebar
- Organization selector page

✅ **Visualization**

- Org chart map
- Public org chart view
- Search overlay
- Person detail panel
- Department nodes

✅ **Admin Components**

- Dashboard statistics
- Department manager
- People manager
- Audit log
- Bulk operation modals

✅ **Utility Components**

- Error pages
- Loading states
- Modals and dialogs
- Forms and inputs

### Dark Mode Color Scheme

The dark mode uses a carefully selected color palette:

| Element             | Light Mode    | Dark Mode     |
| ------------------- | ------------- | ------------- |
| **Background**      | White/Gray-50 | Slate-800/900 |
| **Text**            | Gray-900      | Slate-100     |
| **Borders**         | Gray-200      | Slate-700     |
| **Hover States**    | Gray-50       | Slate-700     |
| **Active Elements** | Blue-50       | Blue-900/30   |

### Troubleshooting Dark Mode

**Dark mode not persisting after refresh:**

- Check that your browser allows localStorage
- Try clearing browser cache and toggling again

**Some elements not switching:**

- Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Ensure you're using a supported browser

**Preference not syncing across devices:**

- Dark mode preference is stored locally per browser
- You'll need to enable it on each device/browser

### Technical Details

For developers and advanced users:

- **Storage Key**: `orgTreeDarkMode` in localStorage
- **Values**: `"true"` (dark) or `"false"` (light)
- **System Detection**: Uses `prefers-color-scheme` media query
- **Implementation**: Tailwind CSS class-based dark mode

---

---

## Team Collaboration

### Understanding Team Members

Team members are users who have access to your organization. Each member has a specific role determining their permissions.

### Viewing Team Members

1. Click **"Share"** in the sidebar or Dashboard
2. Select the **"Team Members"** tab
3. View list of all members with their roles

```text
┌─────────────────────────────────────────────────────────┐
│  Share Organization                              [X]    │
├─────────────────────────────────────────────────────────┤
│  [Public Link]  [Team Members]                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Owner                                                  │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 👤 John Smith (you)        john@example.com       │ │
│  │    Owner                                          │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Members                                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 👤 Jane Doe                jane@example.com       │ │
│  │    [Admin ▼]                              [🗑️]    │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 👤 Bob Wilson              bob@example.com        │ │
│  │    [Editor ▼]                             [🗑️]    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [+ Add Member]                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Adding a Team Member

> **Requires**: Admin or Owner role

1. Click **"+ Add Member"**
2. Enter the user's **email address**
3. Select their **role** (Viewer, Editor, or Admin)
4. Click **"Add"**

**If the user has an OrgTree account:**

- They are added immediately
- They'll see the organization on their next login

**If the user doesn't have an account:**

- Click **"Send Invitation"**
- An email invitation is sent with a 7-day expiry
- Once they create an account and accept, they're added

### Changing a Member's Role

> **Requires**: Admin or Owner role

1. Find the member in the Team Members list
2. Click the **role dropdown** next to their name
3. Select the new role
4. Changes are saved automatically

### Removing a Team Member

> **Requires**: Admin or Owner role

1. Find the member in the Team Members list
2. Click the **trash icon** (🗑️)
3. Confirm the removal

> **Note**: The Owner cannot be removed.

### Pending Invitations

View and manage pending invitations:

1. Scroll to the **Pending Invitations** section
2. See email, role, who invited them, and when
3. Click **trash icon** (🗑️) to cancel an invitation

### Real-Time Collaboration

When multiple users are viewing the same organization:

- Changes appear instantly (no page refresh needed)
- A notification toast shows who made changes
- Recently changed items are highlighted briefly in blue

---

## Sharing & Public Access

### Public Link Sharing

Share a read-only view of your organization with anyone, even without an OrgTree account.

### Enabling Public Sharing

> **Requires**: Admin or Owner role

1. Click **"Share"** in the sidebar
2. On the **"Public Link"** tab
3. Toggle **"Enable public link"** to ON
4. Copy the generated link

### Public Link Features

Users with the public link can:

- ✅ View the org chart
- ✅ Navigate and zoom
- ✅ Search departments and people
- ✅ Use themes and export options
- ❌ Cannot edit anything
- ❌ Cannot access admin pages

### Regenerating the Public Link

If you need to invalidate the existing link:

> **Requires**: Admin or Owner role

1. Click **"Regenerate Link"**
2. Confirm the action
3. The old link stops working immediately
4. A new link is generated

### Disabling Public Access

1. Toggle **"Enable public link"** to OFF
2. The link immediately stops working
3. You can re-enable anytime (same link resumes)

---

## Bulk Operations

Bulk operations allow you to select multiple items and perform actions on all of them at once.

### Entering Selection Mode

1. Navigate to **People** or **Departments** page
2. Click the **"Select"** button (next to Add button)
3. The page enters selection mode

### Selecting Items

In selection mode:

- **Click** any row to toggle selection
- **Select All**: Click the checkbox in the header to select/deselect all
- Selected items show a **checkmark** and blue highlight
- A **floating action bar** appears at the bottom

```text
┌─────────────────────────────────────────────────────────┐
│        5 people selected    [Move] [Edit] [Delete]  [X]│
└─────────────────────────────────────────────────────────┘
```

### Bulk Delete

1. Select items to delete
2. Click **"Delete"** in the action bar
3. Confirm the deletion
4. View results (success/failure counts)

> **Warning for Departments**: Deleting departments also deletes all sub-departments and people within them.

### Bulk Move (People Only)

1. Select people to move
2. Click **"Move"** in the action bar
3. Select the target department
4. Click **"Move"**
5. View results

### Bulk Edit

1. Select items to edit
2. Click **"Edit"** in the action bar
3. Fill in only the fields you want to change:
   - **People**: Title, Department
   - **Departments**: Parent Department
4. Click **"Update"**
5. View results

> **Note**: Empty fields are left unchanged.

### Exiting Selection Mode

- Click **"Cancel"** in the action bar, or
- Click the **"X"** button next to "Select", or
- Complete a bulk operation (auto-exits on success)

### Bulk Operation Limits

- Maximum **100 items** per operation
- Each item is processed individually for audit logging
- Partial failures are possible (some succeed, some fail)

---

## Data Import & Export

### CSV Export

Export your organization data to CSV format:

1. Navigate to the **Dashboard**
2. Click **"Export"** or use the Export menu
3. Choose **"Export to CSV"**
4. A ZIP file downloads containing:
   - `departments.csv`: All departments
   - `people.csv`: All people

### CSV Format

**departments.csv:**

```csv
id,name,description,parentId
dept-001,Engineering,Technical teams,
dept-002,Frontend,UI development,dept-001
dept-003,Backend,API development,dept-001
```

**people.csv:**

```csv
id,name,title,email,phone,departmentId
person-001,John Smith,Developer,john@example.com,555-0101,dept-002
person-002,Jane Doe,Designer,jane@example.com,555-0102,dept-002
```

### CSV Import

Import data from CSV files:

1. Navigate to the **Dashboard**
2. Click **"Import"**
3. Select your CSV file
4. Map columns to fields
5. Preview the data
6. Click **"Import"**

### GEDS XML Import

OrgTree supports importing from GEDS (Government Electronic Directory Services) XML format:

1. Navigate to the **Dashboard**
2. Click **"Import"**
3. Select **"GEDS XML"** format
4. Upload your XML file
5. Review the preview
6. Click **"Import"**

> **Note**: French characters (accents) are properly handled.

---

## Audit Trail

The audit trail provides a complete history of all changes made to your organization.

### Accessing Audit Logs

> **Requires**: Admin or Owner role

1. Navigate to **"Audit Log"** in the sidebar

### Audit Log Interface

```text
┌─────────────────────────────────────────────────────────┐
│  Audit Log                                              │
├─────────────────────────────────────────────────────────┤
│  Filters: [Action ▼] [Type ▼] [Date Range]  [Clear]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Today                                                  │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🗑️ John Smith deleted person "Bob Wilson"         │ │
│  │    2:45 PM                                        │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ✏️ Jane Doe updated department "Engineering"      │ │
│  │    2:30 PM                                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Yesterday                                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ➕ John Smith created person "Alice Brown"        │ │
│  │    4:15 PM                                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Load More]                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Audit Log Entry Details

Each entry shows:

- **Action icon**: Created (➕), Updated (✏️), Deleted (🗑️)
- **Actor**: Who made the change
- **Action description**: What was done
- **Entity details**: Name and type of affected item
- **Timestamp**: When it happened

Click an entry to view full details including the data snapshot.

### Filtering Audit Logs

Use the filter dropdowns:

- **Action**: Created, Updated, Deleted
- **Type**: Department, Person, Member, Organization
- **Date Range**: Today, Last 7 days, Last 30 days, Custom

### Audit Log Retention

- Logs are retained for **1 year**
- Older logs are automatically purged
- Deleted entity data is preserved in the snapshot

---

## Administration Guide

This section covers administrative tasks for organization Owners and Admins.

### Organization Settings

Access organization settings:

1. Navigate to Dashboard
2. Click organization settings (gear icon)

### Managing Sharing Settings

See [Sharing & Public Access](#sharing--public-access) section.

### Managing Team Members

See [Team Collaboration](#team-collaboration) section.

### Viewing Activity

Use the [Audit Trail](#audit-trail) to monitor all changes.

### Best Practices

1. **Limit Admin Access**: Only grant Admin role to trusted users
2. **Regular Audits**: Review audit logs periodically
3. **Backup Data**: Export CSV regularly for backup
4. **Manage Invitations**: Cancel unused invitations

---

## Superuser Guide

Superusers have system-wide administrative access beyond individual organizations.

### Accessing Superuser Features

> **Requires**: Superuser role

1. From the Organization Selector, click **"System Admin"** button
2. Or navigate to `/admin` directly

### Superuser Dashboard

```text
┌─────────────────────────────────────────────────────────┐
│  [Logo] System Administration           [Superuser] ▼   │
├──────────────────┬──────────────────────────────────────┤
│                  │                                      │
│  User Management │   System Overview                    │
│  System Audit    │   ┌──────────┐ ┌──────────┐         │
│                  │   │ 50 Users │ │ 12 Orgs  │         │
│  ───────────────│   └──────────┘ └──────────┘         │
│  [← Back]        │                                      │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### User Management

#### Viewing All Users

1. Navigate to **"User Management"**
2. View list of all registered users
3. See their role, email, and organization memberships

#### Creating a User

1. Click **"+ Create User"**
2. Enter:
   - **Name**: User's full name
   - **Email**: Login email
   - **Role**: User, Admin, or Superuser
3. Click **"Create"**
4. A **temporary password** is generated
5. Copy the password and provide it to the user
6. User must change password on first login

#### Editing a User

1. Find the user in the list
2. Click the **pencil icon** (✏️)
3. Modify name or email
4. Click **"Save"**

#### Changing a User's Role

1. Find the user in the list
2. Click the **role badge**
3. Select new role
4. Confirm the change

**Role Hierarchy:**

- **User**: Standard user, can create organizations
- **Admin**: Can access some admin features
- **Superuser**: Full system access

#### Resetting a User's Password

1. Find the user in the list
2. Click **"Reset Password"**
3. Confirm the action
4. A new temporary password is generated
5. Copy and provide to the user
6. User must change password on next login

#### Deleting a User

1. Find the user in the list
2. Click the **trash icon** (🗑️)
3. Confirm the deletion

> **Warning**: This deletes the user's account. Organizations they own will lose their owner.

### System Audit Logs

> View audit logs across ALL organizations

1. Navigate to **"System Audit Logs"**
2. Use filters to search across organizations
3. Additional filter: **Organization** dropdown

### Emergency Password Recovery

If a superuser is locked out:

1. Access the server via Render Shell
2. Run the reset script:

   ```bash
   cd server
   node scripts/reset-superuser.js <email>
   ```

3. Use the generated temporary password to log in
4. Change password immediately

---

## Troubleshooting

### Common Issues

#### "Access token required" Error

**Cause**: Session has expired

**Solution**:

1. Refresh the page
2. Log in again if prompted

#### Changes Not Appearing

**Cause**: Real-time sync issue

**Solution**:

1. Check the connection indicator (green dot = connected)
2. Refresh the page
3. Check your internet connection

#### Cannot Add Member

**Cause**: User doesn't exist or is already a member

**Solution**:

1. Verify the email address is correct
2. If user doesn't exist, send an invitation
3. Check if user is already a member

#### Invitation Email Not Received

**Cause**: Email filtering or configuration

**Solution**:

1. Check spam/junk folder
2. Verify email address is correct
3. Ask admin to resend invitation
4. Check if RESEND_API_KEY is configured (admin)

#### Cannot Edit/Delete Items

**Cause**: Insufficient permissions

**Solution**:

1. Check your role (visible in sidebar)
2. Contact an Admin or Owner for access

#### Public Link Not Working

**Cause**: Link disabled or regenerated

**Solution**:

1. Verify public sharing is enabled
2. Get the current link from the Share modal
3. The link may have been regenerated

#### Bulk Operation Failed for Some Items

**Cause**: Item deleted or permission changed during operation

**Solution**:

1. Check the failure details in the result modal
2. Retry with remaining items
3. Verify items still exist

### Error Messages

| Error                  | Meaning                           | Solution                 |
| ---------------------- | --------------------------------- | ------------------------ |
| "Department not found" | Referenced department was deleted | Refresh and try again    |
| "Person not found"     | Person was deleted                | Refresh the list         |
| "Permission denied"    | Insufficient role                 | Contact admin for access |
| "Rate limit exceeded"  | Too many requests                 | Wait a few minutes       |
| "Invalid email format" | Email syntax error                | Check the email address  |

### Getting Help

If you encounter issues not covered here:

1. Check this documentation
2. Contact your organization admin
3. Report bugs at: <https://github.com/Ic3burG/OrgTree/issues>

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action              |
| -------- | ------------------- |
| `/`      | Open search         |
| `Escape` | Close modal/overlay |

### Org Chart Shortcuts

| Shortcut   | Action             |
| ---------- | ------------------ |
| `+` or `=` | Zoom in            |
| `-`        | Zoom out           |
| `0`        | Reset zoom to 100% |
| `F`        | Fit to screen      |
| `C`        | Center on root     |
| Arrow keys | Pan canvas         |

### List Views

| Shortcut       | Action                         |
| -------------- | ------------------------------ |
| `Ctrl/Cmd + A` | Select all (in selection mode) |
| `Escape`       | Exit selection mode            |

---

## Glossary

| Term               | Definition                                                |
| ------------------ | --------------------------------------------------------- |
| **Organization**   | A company or entity being managed in OrgTree              |
| **Department**     | A unit within an organization (can have sub-departments)  |
| **Person**         | An individual belonging to a department                   |
| **Member**         | A user with access to an organization                     |
| **Owner**          | The user who created an organization (highest privileges) |
| **Admin**          | A member with administrative privileges                   |
| **Editor**         | A member who can create/edit/delete content               |
| **Viewer**         | A read-only member                                        |
| **Superuser**      | System-wide administrator                                 |
| **Public Link**    | A shareable URL for read-only access                      |
| **Audit Log**      | History of all changes                                    |
| **Bulk Operation** | Action performed on multiple items at once                |
| **Org Chart**      | Visual representation of organization hierarchy           |
| **Real-time**      | Changes sync instantly without refresh                    |

---

## Version History

| Version | Date              | Changes               |
| ------- | ----------------- | --------------------- |
| 1.0     | December 29, 2025 | Initial documentation |

---

## Support

- **Documentation**: You're reading it!
- **Bug Reports**: <https://github.com/Ic3burG/OrgTree/issues>
- **Repository**: <https://github.com/Ic3burG/OrgTree>

---

_This documentation is maintained as part of the OrgTree project._
