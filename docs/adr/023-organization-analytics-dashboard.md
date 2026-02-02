# ADR-023: Organization Analytics Dashboard

**Status**: Accepted
**Date**: February 2, 2026
**Deciders**: Development Team
**Tags**: analytics, dashboard, visualization, admin-features

## Context and Problem Statement

Organization owners and administrators currently lack visibility into the dynamics of their organizations within OrgTree. While system-wide metrics exist for superusers, organization-level insights such as structural growth, department health, user activity patterns, and search trends are unavailable. This gap limits the ability of admins to make data-driven decisions about their organization's structure and health.

How can we provide organization administrators with actionable insights into their organization's structure, growth, and activity patterns?

## Decision Drivers

- Need for data-driven decision making by organization administrators
- Demand for visibility into organizational health and growth trends
- Requirement to identify structural inefficiencies (e.g., empty departments, missing managers)
- Desire to understand user engagement and search patterns
- Must maintain strict data isolation between organizations
- Performance considerations for large organizations
- Bundle size impact on frontend

## Considered Options

- **Option 1**: Client-side analytics dashboard with Recharts
- **Option 2**: Server-side rendered analytics with Chart.js
- **Option 3**: Third-party analytics service integration (e.g., Metabase, Grafana)

## Decision Outcome

Chosen option: "**Option 1: Client-side analytics dashboard with Recharts**", because it provides the best balance of performance, customization, and integration with our existing React architecture while keeping data within our control.

The dashboard will cover five key areas:

- **Overview**: High-level KPIs (Total People, Departments, Growth Rates)
- **Growth Trends**: Historical view of organization size over time
- **Structural Health**: Metrics on hierarchy depth, span of control, and department sizes
- **Activity Metrics**: Analysis of edit frequency, active users, and peak activity times
- **Search Insights**: Top search queries and zero-result patterns to identify discovery gaps

### Implementation Details

- **Data Architecture**: Analytics data will be aggregated on-demand via optimized SQL queries against existing tables (`audit_logs`, `analytics_events`, `people`, `departments`). No new database tables are required initially.
- **Export**: Client-side CSV export functionality for all data views
- **Access Control**: Strictly limited to users with `owner` or `admin` roles within the organization
- **Rollout**: Four-phase implementation (Backend Foundation → Dashboard UI → Search Analytics → Export & Polish)

### Positive Consequences

- **Empowered Admins**: Organization leaders gain actionable insights into their structure and activity
- **Value Add**: Significantly enhances the value proposition of OrgTree for larger organizations
- **Data-Driven**: Encourages better data maintenance by highlighting stats like "empty departments" or "missing manager info"
- **Customization**: Full control over visualization appearance and behavior
- **Type Safety**: Recharts provides strong TypeScript support

### Negative Consequences

- **Performance Load**: Aggregating analytics on-the-fly may increase database load, especially for large organizations (mitigated by SQLite's speed but may require caching in the future)
- **Bundle Size**: Adding Recharts increases the frontend bundle size by ~15KB (gzipped)
- **Maintenance**: Custom implementation requires ongoing maintenance vs. third-party service

## Pros and Cons of the Options

### Option 1: Client-side analytics dashboard with Recharts

- **Good**, because Recharts is composable, React-native, and lightweight (~15KB gzipped)
- **Good**, because it provides full control over visualization appearance and behavior
- **Good**, because it has strong TypeScript support and integrates seamlessly with our React codebase
- **Good**, because data remains within our control (no third-party service)
- **Bad**, because it requires custom implementation and ongoing maintenance
- **Bad**, because it increases frontend bundle size

### Option 2: Server-side rendered analytics with Chart.js

- **Good**, because Chart.js is mature and widely used
- **Good**, because server-side rendering could reduce client-side processing
- **Bad**, because it requires additional server-side rendering infrastructure
- **Bad**, because Chart.js has weaker React integration compared to Recharts
- **Bad**, because it would complicate our current client-side architecture

### Option 3: Third-party analytics service integration

- **Good**, because it offloads implementation and maintenance burden
- **Good**, because services like Metabase provide advanced features out-of-the-box
- **Bad**, because it introduces external dependencies and potential vendor lock-in
- **Bad**, because it requires exporting sensitive organizational data to third-party services
- **Bad**, because it adds recurring costs and complexity to deployment
- **Bad**, because customization is limited to what the service provides

## Links

- [RFC: Organization Analytics Dashboard](../rfc/organization-analytics-dashboard.md)
- [Implementation Plan](../../.gemini/antigravity/brain/41846685-6e6d-41e7-855d-bed918ce652c/implementation_plan.md)
