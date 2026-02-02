# RFC: Organization Analytics Dashboard

**Status**: Superseded by [ADR-023](../adr/023-organization-analytics-dashboard.md)
**Created**: January 31, 2026
**Author**: Development Team

## Summary

Implement an organization-level analytics dashboard that provides owners and admins with actionable insights about their organization's structure, growth trends, activity patterns, and health metrics. This complements the existing system-wide metrics dashboard (superuser-only) by focusing on single-organization analytics.

## Motivation

Currently, organization owners and admins lack visibility into:

- How their organization structure is evolving over time
- Which departments are growing or shrinking
- Team member activity patterns and engagement
- Structural health indicators (span of control, hierarchy depth)
- Search patterns and user behavior within their org

The existing analytics infrastructure (event tracking + superuser metrics) provides the foundation, but there's no org-specific analytics interface for regular users.

## Current State

### Already Implemented (January 2026)

1. **Analytics Event Tracking** (`server/src/services/analytics.service.ts`)
   - `analytics_events` table with event tracking
   - Public API endpoint: `POST /api/analytics/events`
   - Tracks: event_name, category, properties, session_id, user_id, device_type

2. **System Metrics Dashboard** (`src/components/superuser/MetricsDashboard.tsx`)
   - Superuser-only, system-wide view
   - Real-time metrics via Socket.IO
   - Usage, Performance, Security tabs

### Missing

- Organization-scoped analytics queries
- Organization analytics dashboard UI
- Org-specific insights and reporting
- Historical trend analysis per organization
- Exportable analytics reports

## Proposed Solution

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                   Organization Analytics Dashboard               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │   Overview     │  │    Growth      │  │   Activity     │    │
│  │   Metrics      │  │    Trends      │  │   Patterns     │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  Structural    │  │     Search     │  │    Export      │    │
│  │  Health        │  │   Analytics    │  │    Reports     │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

No new tables required. Leverage existing:

- `audit_logs` - Organization changes history
- `analytics_events` - User interaction events (filter by org-scoped events)
- `departments`, `people`, `org_members` - Structural data with timestamps

### Backend API Endpoints

**New Routes** (`server/src/routes/org-analytics.ts`):

```typescript
// All require org owner/admin permission via checkOrgAccess(['owner', 'admin'])

GET /api/organizations/:id/analytics/overview
// Returns: total counts, growth rates, activity scores

GET /api/organizations/:id/analytics/growth
// Query params: ?period=7d|30d|90d|1y
// Returns: time-series data for depts/people counts

GET /api/organizations/:id/analytics/structure
// Returns: depth analysis, span of control, bottleneck detection

GET /api/organizations/:id/analytics/activity
// Query params: ?period=7d|30d|90d
// Returns: edit frequency, active users, peak times

GET /api/organizations/:id/analytics/search
// Returns: top searches, zero-result queries, search trends

GET /api/organizations/:id/analytics/export
// Query params: ?format=csv|json&period=30d
// Returns: downloadable report file
```

**Service Functions** (`server/src/services/org-analytics.service.ts`):

```typescript
export interface OrgAnalyticsOverview {
  totalDepartments: number;
  totalPeople: number;
  totalMembers: number;
  departmentGrowth30d: number; // % change
  peopleGrowth30d: number;
  avgUpdatesPerDay: number;
  activeUsers7d: number;
  lastActivityAt: string | null;
}

export interface GrowthTrend {
  date: string; // ISO date
  departmentCount: number;
  peopleCount: number;
  memberCount: number;
}

export interface StructuralHealth {
  maxDepth: number;
  avgDepth: number;
  avgSpanOfControl: number; // avg direct reports per manager
  largestDepartment: { id: string; name: string; size: number };
  orphanedPeople: number; // people in deleted departments
  emptyDepartments: number; // departments with 0 people
}

export interface ActivityMetrics {
  totalEdits: number;
  editsPerDay: { date: string; count: number }[];
  topEditors: { userId: string; username: string; editCount: number }[];
  peakActivityHour: number; // 0-23
  recentActions: { action: string; count: number }[]; // created/updated/deleted
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueSearchers: number;
  topQueries: { query: string; count: number }[];
  zeroResultQueries: { query: string; count: number }[];
  avgResultsPerSearch: number;
}

export function getOrgAnalyticsOverview(orgId: string): OrgAnalyticsOverview;
export function getOrgGrowthTrends(
  orgId: string,
  period: '7d' | '30d' | '90d' | '1y'
): GrowthTrend[];
export function getOrgStructuralHealth(orgId: string): StructuralHealth;
export function getOrgActivityMetrics(orgId: string, period: '7d' | '30d' | '90d'): ActivityMetrics;
export function getOrgSearchAnalytics(orgId: string, period: '30d'): SearchAnalytics;
export function exportOrgAnalytics(
  orgId: string,
  format: 'csv' | 'json',
  period: '30d' | '90d'
): Buffer | string;
```

### Frontend Components

**Main Dashboard** (`src/components/admin/AnalyticsDashboard.tsx`):

```tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, TrendingUp, Network, Search, Download } from 'lucide-react';
import api from '../../api/client';
import OverviewPanel from './analytics/OverviewPanel';
import GrowthChart from './analytics/GrowthChart';
import StructureHealth from './analytics/StructureHealth';
import ActivityHeatmap from './analytics/ActivityHeatmap';
import SearchInsights from './analytics/SearchInsights';

export default function AnalyticsDashboard() {
  const { id: orgId } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'structure' | 'activity' | 'search'>('overview');

  // Tabs with lazy loading per tab
  // Export button with format selection (CSV/JSON)
  // Date range picker for historical analysis
  // Auto-refresh option for live updates

  return (/* Dashboard UI */);
}
```

**Sub-components** (`src/components/admin/analytics/`):

1. **OverviewPanel.tsx** - High-level KPIs with trend indicators
2. **GrowthChart.tsx** - Line/area chart showing dept/people growth over time
3. **StructureHealth.tsx** - Tree depth, span of control, health score
4. **ActivityHeatmap.tsx** - Calendar heatmap of edits/activity
5. **SearchInsights.tsx** - Top searches, zero-result queries, search trends

**Charting Library**: Use existing or add lightweight library

- Option 1: **Recharts** (React-native charts, 15KB gzipped)
- Option 2: **Chart.js** with react-chartjs-2 (popular, flexible)
- Option 3: **Victory** (composable, Formidable Labs)

### Route Integration

Add to `src/App.tsx` under organization admin routes:

```tsx
<Route path="organizations/:id/admin" element={<AdminLayout />}>
  {/* ... existing routes ... */}
  <Route path="analytics" element={<AnalyticsDashboard />} />
</Route>
```

Add navigation link in `src/components/admin/AdminLayout.tsx`:

```tsx
<NavLink to="analytics" /* ... */>
  <BarChart className="w-5 h-5" />
  <span>Analytics</span>
</NavLink>
```

### Permissions & Security

**Access Control**:

- Require organization `owner` or `admin` role
- Use existing `checkOrgAccess(req, res, next, ['owner', 'admin'])` middleware
- No public access to analytics data (even with public link enabled)

**Data Isolation**:

- All queries scoped to `organization_id`
- No cross-organization data leakage
- Audit log access limited to org-specific events only

**Rate Limiting**:

- Analytics endpoints: 20 requests per minute per user
- Export endpoint: 3 requests per hour per organization

## Implementation Phases

### Phase 1: Backend Foundation (Week 1)

**Goal**: API endpoints with core analytics queries

- [ ] Create `server/src/services/org-analytics.service.ts`
- [ ] Implement overview, growth, structure, activity queries
- [ ] Add route handlers in `server/src/routes/org-analytics.ts`
- [ ] Write comprehensive tests (aim for >80% coverage)
- [ ] Add API documentation (JSDoc + OpenAPI spec)

**Deliverable**: Functional API endpoints returning mock/real data

### Phase 2: Frontend Dashboard UI (Week 2)

**Goal**: Interactive dashboard with core visualizations

- [ ] Create `src/components/admin/AnalyticsDashboard.tsx`
- [ ] Build sub-components (OverviewPanel, GrowthChart, etc.)
- [ ] Add charting library (Recharts or Chart.js)
- [ ] Integrate with backend APIs
- [ ] Implement date range picker and tab navigation
- [ ] Dark mode support for all charts

**Deliverable**: Working dashboard accessible to org admins

### Phase 3: Search Analytics (Week 3)

**Goal**: Search insights and zero-result query tracking

- [ ] Extend analytics_events table with search-specific tracking
- [ ] Implement search analytics service functions
- [ ] Build SearchInsights component with visualizations
- [ ] Add "Did you mean?" suggestions based on zero-result queries

**Deliverable**: Search analytics tab with actionable insights

### Phase 4: Export & Advanced Features (Week 4)

**Goal**: Exportable reports and polish

- [ ] Implement CSV/JSON export functionality
- [ ] Add scheduled reports (optional: email weekly/monthly summaries)
- [ ] Build activity heatmap (calendar view)
- [ ] Add comparison view (compare time periods)
- [ ] Performance optimization for large orgs (>1000 depts)

**Deliverable**: Feature-complete analytics dashboard with export

## Success Metrics

1. **Adoption**: >50% of organization owners/admins visit analytics dashboard within first month
2. **Engagement**: Average 3+ tab views per session, 2+ visits per week
3. **Actionability**: 30% of users export a report or use insights to make org changes
4. **Performance**: Dashboard loads in <2 seconds for orgs with <500 departments
5. **Satisfaction**: >4.0/5.0 user rating in feedback surveys

## Technical Considerations

### Performance

- **Query Optimization**: Index `created_at` and `updated_at` columns on audit_logs
- **Caching**: Cache analytics results for 5 minutes (Redis or in-memory)
- **Pagination**: Limit top-N queries to prevent slow queries on large datasets
- **Async Processing**: For very large orgs (>5000 depts), consider background job for report generation

### Scalability

- Current SQLite approach works well up to ~10,000 records
- For enterprise scale (>50,000 records), consider:
  - Pre-aggregated analytics tables (materialized views)
  - Time-series database (InfluxDB, TimescaleDB)
  - Analytics-specific read replica

### Data Privacy

- Analytics data stays within organization boundary
- No PII in exported reports (aggregate data only)
- GDPR compliance: Allow org owners to delete all analytics events

### Testing Strategy

1. **Unit Tests**: Service functions with mock data (>80% coverage)
2. **Integration Tests**: API endpoints with test database
3. **E2E Tests**: Dashboard loading, chart rendering, export download
4. **Load Tests**: Test with 1000+ department organization

## Alternative Approaches Considered

### 1. Third-party Analytics Service (e.g., Mixpanel, Amplitude)

**Pros**: Battle-tested, rich features, real-time dashboards
**Cons**: Cost, data privacy concerns, vendor lock-in, requires external integration
**Decision**: Rejected - keep data in-house for privacy and control

### 2. Real-time Analytics Only (via Socket.IO)

**Pros**: Live updates, no page refresh needed
**Cons**: Complex to implement historical trends, high server load
**Decision**: Hybrid approach - use Socket.IO for overview metrics only

### 3. Client-side Analytics Processing

**Pros**: Reduces server load, fast interactions
**Cons**: Large data transfer, slow for big orgs, security risk
**Decision**: Rejected - keep sensitive queries server-side

## Open Questions

1. **Data Retention**: How long should we keep analytics_events? (Proposal: 90 days, configurable)
2. **Benchmarking**: Should we show org comparison to anonymized averages? (e.g., "Your org is larger than 75% of similar orgs")
3. **Alerts**: Should we notify admins of anomalies (sudden drops, unusual activity)?
4. **Widgets**: Should we allow embedding specific charts in external dashboards (via iframe)?

## Dependencies

- **Frontend**: Recharts or Chart.js library (~15-50KB)
- **Backend**: No new dependencies (use existing better-sqlite3, express)
- **Infrastructure**: Optional Redis for caching (can start without)

## Migration Plan

No database migrations required - uses existing tables. Steps:

1. Deploy backend API endpoints (backward compatible)
2. Deploy frontend dashboard UI
3. Add navigation link in AdminLayout
4. Announce feature via in-app notification
5. Monitor adoption and gather feedback

## Rollback Plan

If analytics dashboard causes performance issues:

1. Disable navigation link (hide feature from UI)
2. Add feature flag `ENABLE_ORG_ANALYTICS=false` in env
3. Remove route from API (or return 503 Service Unavailable)
4. Investigate and optimize queries
5. Re-enable once issues resolved

No data loss risk - analytics_events table remains untouched.

## Documentation Needs

- [ ] User Guide: "Understanding Your Organization Analytics"
- [ ] Admin FAQ: Common questions about metrics interpretation
- [ ] API Documentation: Update OpenAPI spec with new endpoints
- [ ] ADR: Record decision on charting library choice
- [ ] CHANGELOG: Add entry for new feature

## Future Enhancements (Post-MVP)

1. **Custom Dashboards**: Allow users to create custom chart layouts
2. **Scheduled Email Reports**: Weekly/monthly summary emails
3. **Forecasting**: Predict future org size based on growth trends
4. **Collaboration Analytics**: Track member contribution patterns
5. **Integration with Public Link**: Anonymous visitor analytics
6. **Department Comparison**: Compare dept performance side-by-side
7. **Custom Metrics**: Allow org admins to define custom KPIs
8. **Alerts & Notifications**: Automated alerts for threshold breaches

## Conclusion

The Organization Analytics Dashboard fills a critical gap by providing organization owners and admins with data-driven insights into their org's health and evolution. Building on the existing analytics infrastructure, this feature can be delivered incrementally over 4 weeks with minimal risk and high user value.

**Recommended Action**: Approve Phase 1-2 implementation (Weeks 1-2) and gather user feedback before committing to Phases 3-4.

---

**References**:

- Current analytics tracking: `server/src/services/analytics.service.ts`
- System metrics dashboard: `src/components/superuser/MetricsDashboard.tsx`
- Roadmap entry: `docs/ROADMAP.md` line 154
