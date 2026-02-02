# 23. Organization Analytics Dashboard

Date: 2026-02-02

## Status

Accepted

## Context

Organization owners and administrators currently lack visibility into the dynamics of their organizations within OrgTree. While system-wide metrics exist for superusers, organization-level insights such as structural growth, department health, user activity patterns, and search trends are unavailable. This gap limits the ability of admins to make data-driven decisions about their organization's structure and health.

## Decision

We will implement a dedicated **Organization Analytics Dashboard** accessible to organization owners and administrators.

### Key Decisions

1. **Scope**: The dashboard will cover five key areas:
   - **Overview**: High-level KPIs (Total People, Departments, Growth Rates).
   - **Growth Trends**: Historical view of organization size over time.
   - **Structural Health**: Metrics on hierarchy depth, span of control, and department sizes.
   - **Activity Metrics**: Analysis of edit frequency, active users, and peak activity times.
   - **Search Insights**: Top search queries and zero-result patterns to identify discovery gaps.

2. **Visualization Library**: We will use **Recharts** for all data visualizations.
   - _Rationale_: Recharts is composable, React-native, lightweight (~15KB), and supports the necessary chart types (Area, Bar, Pie). It allows for easier customization and responsive design compared to Chart.js.

3. **Data Architecture**:
   - Analytics data will be aggregated on-demand via optimized SQL queries against existing tables (`audit_logs`, `analytics_events`, `people`, `departments`).
   - No new database tables are required initially.
   - Data aggregation logic will reside in a dedicated `OrgAnalyticsService`.

4. **Export**:
   - Client-side CSV export functionality will be provided for all data views to allow further analysis by admins.

5. **Access Control**:
   - Strictly limited to users with `owner` or `admin` roles within the organization.

## Consequences

### Positive

- **Empowered Admins**: Organization leaders gain actionable insights into their structure and activity.
- **Value Add**: Significantly enhances the value proposition of OrgTree for larger organizations.
- **Data-Driven**: Encourages better data maintenance by highlighting stats like "empty departments" or "missing manager info".

### Negative

- **Performance Load**: Aggregating analytics on-the-fly may increase database load, especially for large organizations. This is mitigated by SQLite's speed but may require caching (e.g., Redis) in the future.
- **Bundle Size**: Adding Recharts increases the frontend bundle size slightly.

## Implementation Strategy

The feature will be rolled out in four phases:

1. **Backend Foundation**: Service layer and API endpoints.
2. **Dashboard UI**: Core visuals and routing.
3. **Search Analytics**: Dedicated tracking and reporting for search usage.
4. **Export & Polish**: Data export and UI refinements (Dark mode).

## References

- [RFC: Organization Analytics Dashboard](../rfc/organization-analytics-dashboard.md)
- [Implementation Plan](../../.gemini/antigravity/brain/41846685-6e6d-41e7-855d-bed918ce652c/implementation_plan.md)
