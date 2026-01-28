# ADR-004: React Context API for State Management

**Status**: Accepted
**Date**: 2025-12-16
**Deciders**: Development Team
**Tags**: frontend, state-management, react, architecture

## Context and Problem Statement

OrgTree's frontend needs to manage global application state including user authentication, WebSocket connections, and shared UI state. The state management solution must handle cross-component communication while keeping the codebase simple and maintainable.

## Decision Drivers

- **Simplicity**: Minimize external dependencies and boilerplate code
- **Bundle size**: Avoid adding large state management libraries
- **Learning curve**: Use patterns familiar to React developers
- **Type safety**: Full TypeScript support
- **Developer experience**: Clear data flow and debugging
- **Performance**: Avoid unnecessary re-renders
- **Server state**: Most data fetched on-demand, not cached globally

## Considered Options

- **React Context API** (built-in)
- Redux + Redux Toolkit
- Zustand
- Jotai
- Recoil
- MobX

## Decision Outcome

Chosen option: **React Context API**, because OrgTree's state management needs are straightforward (authentication + socket connection), and React's built-in Context API provides everything required without external dependencies.

### Implementation Pattern

**Authentication Context** (`src/contexts/AuthContext.tsx`):

```typescript

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // ... auth logic
  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for components
export const useAuth = () => useContext(AuthContext);

```

**Socket Context** (`src/contexts/SocketContext.tsx`):

```typescript

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  // ... socket initialization
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

```

**Usage in Components**:

```typescript

function AdminDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Component logic
}

```

### Positive Consequences

- **Zero dependencies**: No additional npm packages (Context is built into React)
- **Type-safe**: Full TypeScript support with custom context types
- **Small bundle**: No state management library overhead
- **Simple**: No reducers, actions, or middleware unless needed
- **Standard React**: Uses familiar hooks pattern (`useContext`)
- **Easy testing**: Can mock context values in tests
- **Clear boundaries**: Each context has single responsibility

### Negative Consequences

- **No time-travel debugging**: Unlike Redux DevTools
- **Manual optimization**: Must use `React.memo` and `useMemo` to prevent re-renders
- **No built-in middleware**: For logging, persistence, etc.
- **Context limitations**: All consumers re-render when any context value changes (mitigated by splitting contexts)

## Pros and Cons of the Options

### React Context API (Chosen)

- **Good**, because it's built into React (no dependencies)
- **Good**, because simple API (Provider + useContext hook)
- **Good**, because perfect for global state like auth and sockets
- **Good**, because TypeScript support is excellent
- **Good**, because small applications don't need complex state management
- **Bad**, because all consumers re-render on any context change
- **Bad**, because no built-in DevTools for debugging
- **Bad**, because performance optimization requires manual work

### Redux + Redux Toolkit

- **Good**, because excellent DevTools with time-travel debugging
- **Good**, because Redux Toolkit reduces boilerplate significantly
- **Good**, because massive ecosystem (middleware, persistence, etc.)
- **Good**, because enforces unidirectional data flow
- **Good**, because can optimize re-renders with selectors
- **Bad**, because adds ~25KB to bundle (minified + gzipped)
- **Bad**, because steep learning curve (actions, reducers, slices)
- **Bad**, because overkill for OrgTree's simple state needs
- **Bad**, because more boilerplate than Context API

### Zustand

- **Good**, because simpler API than Redux (less boilerplate)
- **Good**, because small bundle size (~3KB)
- **Good**, because no Provider wrapping needed
- **Good**, because built-in TypeScript support
- **Bad**, because still an external dependency
- **Bad**, because less mature ecosystem than Redux
- **Bad**, because Context API already solves OrgTree's needs

### Jotai

- **Good**, because atomic state updates (fine-grained control)
- **Good**, because small bundle size (~3KB)
- **Good**, because excellent TypeScript support
- **Bad**, because new paradigm to learn (atoms)
- **Bad**, because less mature than alternatives
- **Bad**, because overkill for simple global state

### Recoil

- **Good**, because developed by Facebook for React
- **Good**, because atomic state like Jotai
- **Good**, because derived state support
- **Bad**, because still experimental (not 1.0)
- **Bad**, because ~20KB bundle size
- **Bad**, because complex API for simple use cases

### MobX

- **Good**, because automatic re-render optimization
- **Good**, because simple mutations (no immutability required)
- **Good**, because mature and stable
- **Bad**, because different paradigm (observable objects)
- **Bad**, because ~16KB bundle size
- **Bad**, because learning curve for developers unfamiliar with observables

## Data Fetching Strategy

OrgTree uses **fetch-on-demand** pattern instead of global state cache:

**Pattern**:

```typescript

function DepartmentList() {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    api.getDepartments(orgId).then(setDepartments);
  }, [orgId]);

  // Socket.IO updates
  socket.on('department:created', (dept) => {
    setDepartments(prev => [...prev, dept]);
  });

  return <div>{/* render departments */}</div>;
}

```

**Rationale**:

- Most data is organization-specific (changes when switching orgs)
- Real-time updates handled via Socket.IO (no need for state management refetch)
- Simpler than global cache (no cache invalidation complexity)
- Works well for OrgTree's use case (single-org view at a time)

**Alternative considered**: React Query / SWR for server state caching

- **Rejected because**: Adds complexity and bundle size for minimal benefit
- Socket.IO already handles real-time updates (main benefit of these libraries)
- OrgTree doesn't need background refetching or cache synchronization

## Performance Optimization Patterns

**1. Split Contexts**: Separate concerns to avoid unnecessary re-renders

```typescript

// ✅ Good: Separate contexts
<AuthProvider>
  <SocketProvider>
    <App />
  </SocketProvider>
</AuthProvider>

// ❌ Bad: Single context with all state
<AppStateProvider> // Any change re-renders everything

```

**2. Memoization**: Use `useMemo` for expensive computations

```typescript

const sortedDepartments = useMemo(
  () => departments.sort((a, b) => a.name.localeCompare(b.name)),
  [departments]
);

```

**3. Component Memoization**: Prevent re-renders with `React.memo`

```typescript

const DepartmentNode = React.memo(({ department, theme }) => {
  // Only re-renders if department or theme changes
});

```

## Context Structure

**Current Contexts**:

1. **AuthContext**: User authentication state and methods
2. **SocketContext**: WebSocket connection and events

**Future Potential Contexts** (if needed):

- **ThemeContext**: Dark mode preference (currently prop drilling)
- **NotificationContext**: Toast messages and alerts
- **OrgContext**: Current organization data (if shared across many components)

## Migration Path

If OrgTree grows and Context API becomes limiting:

1. **React Query**: Add for server state caching and background sync
2. **Zustand**: Replace Context with lightweight global store
3. **Redux Toolkit**: If complex state interactions emerge

Migration would be incremental (one context at a time) and backward compatible.

## Links

- [React Context API Documentation](https://react.dev/reference/react/useContext)
- [Kent C. Dodds: Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react)
- Implementation: `src/contexts/AuthContext.tsx`
- Implementation: `src/contexts/SocketContext.tsx`
