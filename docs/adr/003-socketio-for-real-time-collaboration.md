# ADR-003: Socket.IO for Real-Time Collaboration

**Status**: Accepted
**Date**: 2025-12-22
**Deciders**: Development Team
**Tags**: real-time, websockets, collaboration, architecture

## Context and Problem Statement

OrgTree supports multi-user collaboration where multiple team members can edit the same organization simultaneously. When one user makes changes (creates a department, updates a person, etc.), other users viewing the same organization should see those changes instantly without manual page refresh. The application needs a reliable real-time communication mechanism.

## Decision Drivers

- **Real-time updates**: Changes should propagate to all connected users within 100ms
- **Reliability**: Automatic reconnection on network interruptions
- **Authentication**: Only authenticated users should receive organization data
- **Simplicity**: Minimal infrastructure changes (reuse existing Express server)
- **Browser compatibility**: Support for modern browsers and mobile
- **Graceful degradation**: App should function if WebSocket connection fails
- **Organization isolation**: Users should only receive updates for organizations they're viewing

## Considered Options

- **Socket.IO**
- Native WebSockets (ws library)
- Server-Sent Events (SSE)
- HTTP polling (short polling)
- HTTP long polling

## Decision Outcome

Chosen option: **Socket.IO**, because it provides the most robust real-time communication with automatic fallbacks, built-in reconnection, and room-based broadcasting that perfectly matches OrgTree's organization-centric architecture.

### Implementation Architecture

**Server-side** (`server/src/socket.js`):

```typescript

// Initialize Socket.IO with JWT authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT token
  next();
});

// Organization-based rooms
socket.join(`org:${orgId}`);

// Emit to all users in organization
io.to(`org:${orgId}`).emit('department:created', payload);

```

**Client-side** (`src/contexts/SocketContext.tsx`):

```typescript

// Connect with authentication
const socket = io({ auth: { token: accessToken } });

// Subscribe to events
socket.on('department:created', department => {
  // Update UI without page refresh
});

```

**Event Flow**:

1. User A creates a department via REST API
2. Server creates department in database
3. Server emits `department:created` event to `org:{orgId}` room
4. All connected users in that organization receive the event
5. Frontend updates local state and re-renders UI

### Positive Consequences

- **Instant updates**: Changes propagate in <100ms across all connected clients
- **Automatic reconnection**: Socket.IO handles network interruptions transparently
- **Room-based isolation**: Users only receive events for organizations they're viewing
- **Fallback support**: Automatically downgrades to long-polling if WebSockets unavailable
- **Binary support**: Can transmit JSON, binary data, or even files if needed
- **Authentication integrated**: JWT tokens validate socket connections
- **Low latency**: WebSocket protocol minimizes overhead compared to HTTP
- **Horizontal scaling ready**: Can add Redis adapter for multi-server deployments

### Negative Consequences

- **Increased server memory**: Each connected client maintains an open socket
- **Added complexity**: Event handling logic on both client and server
- **State synchronization challenges**: Must handle race conditions and out-of-order events
- **Testing complexity**: WebSocket testing requires special setup (socket.io-client in tests)
- **CDN limitations**: Some CDNs don't support WebSocket upgrade requests

## Pros and Cons of the Options

### Socket.IO (Chosen)

- **Good**, because it automatically reconnects on network failures
- **Good**, because room-based broadcasting perfectly matches organization model
- **Good**, because fallback to long-polling ensures broad compatibility
- **Good**, because large ecosystem and community (npm's top 50 packages)
- **Good**, because built-in authentication middleware support
- **Good**, because works with existing Express server (no separate port)
- **Bad**, because adds ~200KB to client bundle (gzipped: ~60KB)
- **Bad**, because slightly higher overhead than raw WebSockets

### Native WebSockets (ws library)

- **Good**, because lighter weight (smaller bundle size)
- **Good**, because follows W3C WebSocket standard exactly
- **Good**, because slightly lower latency than Socket.IO
- **Bad**, because no automatic reconnection (must implement manually)
- **Bad**, because no fallback mechanism (fails in restrictive firewalls)
- **Bad**, because no built-in rooms/namespaces (must implement manually)
- **Bad**, because authentication requires custom middleware

### Server-Sent Events (SSE)

- **Good**, because simpler than WebSockets (one-way server→client)
- **Good**, because works over HTTP/1.1 (better firewall compatibility)
- **Good**, because automatic reconnection built into browser API
- **Bad**, because one-way only (client can't send events without separate HTTP request)
- **Bad**, because limited to text data (JSON must be stringified)
- **Bad**, because connection limits (browsers limit SSE connections per domain)
- **Bad**, because no binary data support

### HTTP Short Polling

- **Good**, because works everywhere (no special protocol required)
- **Good**, because simple to implement
- **Bad**, because high latency (polling interval delay)
- **Bad**, because massive server load (constant requests even with no updates)
- **Bad**, because wastes bandwidth (empty responses when no changes)
- **Bad**, because poor user experience (changes appear delayed)

### HTTP Long Polling

- **Good**, because better than short polling (server holds request until data available)
- **Good**, because works in all environments
- **Bad**, because higher server resource usage than WebSockets
- **Bad**, because reconnection overhead on each response
- **Bad**, because more complex than short polling
- **Bad**, because proxies/load balancers may timeout long requests

## Event Types Currently Implemented

**Departments**:

- `department:created` - New department added
- `department:updated` - Department name/parent changed
- `department:deleted` - Department soft-deleted

**People**:

- `person:created` - New person added
- `person:updated` - Person details changed
- `person:deleted` - Person soft-deleted

**Bulk Operations**:

- `bulk:departments_deleted` - Multiple departments deleted
- `bulk:people_deleted` - Multiple people deleted

**Organization Members**:

- `member:added` - User added to organization
- `member:removed` - User removed from organization
- `member:role_changed` - User role updated

## Connection Management

**Client-side**:

- Socket created in `SocketContext` provider
- Connects on mount, disconnects on unmount
- Joins organization room when viewing org (`socket.emit('join-org', orgId)`)
- Leaves room when switching orgs or logging out

**Server-side**:

- Maximum connections limited by system resources (typically 10,000+ per server)
- Idle connections automatically timeout after 60 seconds of inactivity
- JWT token validated on connection and periodically refreshed

## Scalability Considerations

**Current Architecture** (single server):

- Socket.IO runs in-process with Express
- All connected clients on same server instance
- Works well for <1,000 concurrent users

**Future Scaling** (multi-server):

1. Add Redis adapter: `io.adapter(createAdapter(redis))`
2. All Socket.IO instances share Redis pub/sub
3. Events emitted on Server A propagate to clients on Server B
4. Requires Redis instance (Render Redis or similar)

## Performance Metrics

- **Connection time**: 50-100ms (JWT validation + WebSocket upgrade)
- **Event propagation**: <50ms (in-process broadcast)
- **Memory per connection**: ~10KB (socket + buffers)
- **Bandwidth**: ~1KB/minute when idle (heartbeat packets)

## Alternative Considered: Optimistic Updates

Instead of real-time sync, could implement optimistic UI updates:

- User A creates department
- UI updates immediately (optimistic)
- If server request fails, revert UI

**Rejected because**:

- Doesn't solve multi-user collaboration (User B won't see User A's changes)
- Still requires polling or manual refresh
- Optimistic updates better as _supplement_ to real-time sync (both implemented)

## Links

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- Implementation: `server/src/socket.js`
- Client implementation: `src/contexts/SocketContext.tsx`
- Event service: `server/src/services/socket-events.service.ts`
