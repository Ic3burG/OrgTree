# ADR-028: API Versioning Strategy

**Status**: Proposed
**Date**: 2026-02-23
**Deciders**: Gemini CLI, Development Team
**Tags**: architecture, api, versioning

## Context and Problem Statement

As OrgTree grows, changes to the API are inevitable. Currently, the API is served under a flat `/api` prefix without explicit versioning. Introducing breaking changes without a versioning strategy would break the frontend and any third-party integrations (like the generated SDK).

How should we version the OrgTree API to ensure backward compatibility while allowing for evolution?

## Decision Drivers

- **Backward Compatibility**: Existing clients (frontend, SDK) should continue to work.
- **Developer Experience**: The versioning scheme should be intuitive and well-documented.
- **Maintainability**: The implementation should not significantly increase codebase complexity.
- **Standardization**: Follow industry best practices for RESTful APIs.

## Considered Options

1. **URL Path Versioning** (e.g., `/api/v1/...`)
2. **Header Versioning** (e.g., `Accept: application/vnd.orgtree.v1+json`)
3. **Query Parameter Versioning** (e.g., `/api/resource?v=1`)
4. **No Versioning** (continuous evolution with only non-breaking changes)

## Decision Outcome

Chosen option: **URL Path Versioning**, because it is the most visible, easiest to test with standard tools (browsers, curl, Swagger UI), and is the industry standard for most public REST APIs.

### Positive Consequences

- Clear separation of API versions.
- Documentation (OpenAPI/Swagger) can be easily scoped to specific versions.
- Easy to implement using Express router groups.
- Direct mapping between URL and code structure.

### Negative Consequences

- Potential for code duplication if multiple versions are supported simultaneously.
- Need to update all client-side API calls (transition period required).

## Pros and Cons of the Options

### URL Path Versioning

- **Good**, because it is explicit and visible in logs and browser tools.
- **Good**, because it works seamlessly with OpenAPI and Swagger UI.
- **Good**, because it allows for easy routing in Express (`app.use('/api/v1', v1Router)`).
- **Bad**, because it breaks the "cool URIs don't change" principle (though acceptable for APIs).

### Header Versioning

- **Good**, because it keeps the URL "clean".
- **Good**, because it allows for more granular versioning (media type versioning).
- **Bad**, because it is harder to test via browser and requires client-side header management.
- **Bad**, because it complicates caching strategies.

### Query Parameter Versioning

- **Good**, because it is easy to implement.
- **Bad**, because it is often considered less "RESTful" than path or header versioning.
- **Bad**, because it can conflict with other query parameters.

### No Versioning

- **Good**, because it requires no infrastructure changes.
- **Bad**, because it strictly limits the team to non-breaking changes, hindering innovation and cleanup of technical debt.

## Implementation Strategy

1. **V1 Introduction**:
   - Create a `v1` router group in the backend.
   - All existing `/api/...` routes will be mapped to `/api/v1/...`.
   - The root `/api` path will remain as an alias for `/api/v1` to maintain backward compatibility for a transition period.

2. **OpenAPI Updates**:
   - Update `openapi.yaml` to include the `/v1` prefix.
   - Consider splitting OpenAPI specs if `v2` is introduced.

3. **Frontend Transition**:
   - Update the frontend API client to use the `/api/v1` prefix.
   - The generated SDK should be updated to target the versioned endpoints.

4. **Deprecation Policy**:
   - When a new version is released, the previous version will be marked as "Deprecated" in documentation.
   - A `Deprecation` header will be added to responses from deprecated endpoints.
   - A sunset date will be established for each version.

## Links

- [Related to] [docs/ROADMAP.md](../ROADMAP.md)
- [Refers to] [server/src/index.ts](../../server/src/index.ts)
