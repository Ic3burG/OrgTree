# User Analytics Implementation Plan

## Overview

Implement a privacy-respecting, self-hosted user analytics system to track feature usage and user journeys. This system will be built directly into the existing stack (React, Node.js, SQLite) without third-party dependencies.

## 1. Database Schema

**File:** `server/src/db.ts`
Add a new table `analytics_events` via migration pattern:

```sql

CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'navigation', 'interaction', 'system'
  properties TEXT, -- JSON string for flexible attributes
  session_id TEXT NOT NULL, -- Client-generated anonymous session ID
  user_id TEXT, -- Nullable, linked to users table if authenticated
  url TEXT, -- Contextual URL
  device_type TEXT, -- 'desktop', 'mobile', 'tablet' (parsed from UA)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

```

## 2. Backend API

**Files:**

- `server/src/services/analytics.service.ts`: Core logic for validating and storing events.
- `server/src/routes/analytics.ts`: REST endpoints.
- `server/src/index.ts`: Register routes.

**Endpoints:**

- `POST /api/analytics/track`: Receives single or batched events.
  - **Body:** `{ events: [{ name: '...', properties: {...}, ... }] }`
  - **Security:** Rate limited.

## 3. Frontend Integration

**Files:**

- `src/hooks/useAnalytics.ts`: Custom hook for tracking.
- `src/contexts/AnalyticsContext.tsx`: Provider to manage session state.

**Features:**

- **Auto-tracking:**
  - Page Views (integration with React Router).
  - Web Vitals (optional, for performance tracking).
- **Manual Event Tracking:**
  - `track('search_performed', { query_length: 5, results_count: 12 })`
  - `track('org_created', { source: 'dashboard' })`
  - `track('export_clicked', { format: 'csv' })`

## 4. Visualization (Metrics Dashboard Enhancement)

**File:** `src/components/superuser/MetricsDashboard.tsx`
Add a **"User Analytics"** tab displaying:

- **Top Events:** Most frequent user actions.
- **Daily Active Users (DAU):** Unique `user_id` or `session_id` count per day.
- **Feature Usage:** Breakdown of specific feature interactions (e.g., "Search" vs "Tree View").

## 5. Privacy & Compliance

- No PII in `properties` by convention.
- `user_id` is strictly internal.
- Option to respect `Do Not Track` browser header.
