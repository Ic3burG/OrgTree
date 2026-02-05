# OrgTree

[![CI](https://github.com/Ic3burG/OrgTree/actions/workflows/ci.yml/badge.svg)](https://github.com/Ic3burG/OrgTree/actions/workflows/ci.yml)
[![CD](https://github.com/Ic3burG/OrgTree/actions/workflows/cd.yml/badge.svg)](https://github.com/Ic3burG/OrgTree/actions/workflows/cd.yml)

A modern, full-stack organizational directory and visualization platform. Build, manage, and share interactive org charts with real-time collaboration.

**[Live Demo](https://orgtree.onrender.com)** | **[Documentation](./docs/DOCUMENTATION.md)** | **[CI/CD Setup](./.github/CICD_SETUP.md)**

## Features

### Organization Management

- **Multi-Organization Support**: Create and manage multiple organizations
- **Department Hierarchy**: Unlimited nesting with parent-child relationships
- **People Management**: Full employee directory with contact details
- **Custom Fields**: Define custom attributes for people and departments
- **Star/Favorite People**: Mark key individuals for quick access
- **Bulk Operations**: Select multiple items for move, edit, or delete

### Visualization

- **Interactive Org Chart**: Pan, zoom, and navigate with React Flow
- **Flexible Layouts**: Vertical (top-down) or horizontal (left-right) views
- **Expandable Nodes**: Click departments to show/hide team members
- **Depth-Based Coloring**: Visual hierarchy with automatic color gradients
- **Mini-Map**: Bird's-eye navigation for large organizations
- **Dark Mode**: System-aware dark theme with manual toggle
- **Collapsible Sidebar**: Maximize workspace with icon-only mode

### Collaboration

- **Team Roles**: Owner, Admin, Editor, Viewer permissions
- **Email Invitations**: Invite team members via email
- **Real-Time Sync**: Changes appear instantly across all connected users
- **Share Links**: Public read-only sharing with full navigation

- **Passkey Authentication**: Passwordless login with WebAuthn/biometrics
- **Two-Factor Authentication**: TOTP-based 2FA with backup codes
- **Session Management**: View and revoke active sessions
- **CSRF Protection**: Double-submit cookie pattern for state changes

- **Import/Export**:
  - CSV format for departments and people
  - GEDS XML file upload
  - **GEDS URL Import**: Paste download URLs for instant import (no manual download required)
- **Full-Text Search**: FTS5-powered search with autocomplete, fuzzy matching, and "Did you mean?" suggestions
- **Audit Trail**: Track all changes with 1-year retention
- **Automatic Backups**: Database persistence with scheduled backups

## Tech Stack

- **React 18** with TypeScript and hooks
- **React Flow** for interactive canvas
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Socket.IO Client** for real-time updates
- **Vite** for build tooling

- **Node.js** with Express and TypeScript
- **SQLite** with better-sqlite3
- **FTS5** for full-text search
- **Socket.IO** for WebSocket connections
- **bcrypt** for password hashing
- **jsonwebtoken** for JWT authentication
- **@simplewebauthn** for passkey/WebAuthn support
- **Resend** for transactional emails
- **Helmet.js** for security headers
- **express-rate-limit** for API protection

## Quick Start

### Prerequisites

- Node.js 20+ (Node 18 reached end-of-life)
- npm 9+ or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/orgtree.git
cd orgtree

# Install dependencies
npm install
cd server && npm install && cd ..

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

### Development

```bash
# Start backend (from root directory)
cd server && npm run dev

# Start frontend (new terminal, from root directory)
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Production Build

```bash
# Build frontend
npm run build

# Start production server
cd server && npm start
```

## Environment Variables

Create `server/.env` with:

```env
# Required
JWT_SECRET=your-secure-secret-key

# Optional - Email invitations (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# Optional - Production
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

## Project Structure

```
/
├── src/                    # Frontend source (TypeScript)
│   ├── components/
│   │   ├── admin/          # Admin panels (Person, Department, Audit)
│   │   ├── auth/           # Login, Signup, 2FA, Password reset
│   │   ├── account/        # Profile, Security, Sessions
│   │   ├── superuser/      # System admin (User management)
│   │   └── ui/             # Reusable UI components
│   ├── contexts/           # React contexts (Auth, Socket, Theme)
│   ├── hooks/              # Custom hooks (usePeople, useSearch, etc.)
│   ├── api/                # API client with CSRF handling
│   └── utils/              # Utilities (CSV, layout, colors)
├── server/                 # Backend source (TypeScript)
│   └── src/
│       ├── routes/         # API routes (32 route files)
│       ├── services/       # Business logic (31 service files)
│       ├── middleware/     # Auth, rate limiting, CSRF
│       └── db.ts           # Database schema & migrations
├── docs/                   # Extended documentation
│   ├── DOCUMENTATION.md    # Full user & admin guide
│   ├── DEPLOYMENT.md       # Deployment instructions
│   ├── adr/                # Architecture Decision Records
│   └── ...
└── PROGRESS.md             # Development progress
```

## API Overview

| Endpoint                                        | Description                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| `POST /api/auth/*`                              | Authentication (register, login, logout, passkeys, 2FA) |
| `GET/POST /api/organizations`                   | Organization CRUD                                       |
| `GET/POST /api/organizations/:id/departments`   | Department management                                   |
| `GET/POST /api/organizations/:id/people`        | People management                                       |
| `GET/POST /api/organizations/:id/custom-fields` | Custom field definitions                                |
| `POST /api/organizations/:id/*/bulk-*`          | Bulk operations                                         |
| `GET /api/organizations/:id/search`             | Full-text search with autocomplete                      |
| `GET /api/organizations/:id/audit-logs`         | Audit trail                                             |
| `POST /api/organizations/:id/invitations`       | Team invitations                                        |
| `GET /api/public/org/:token`                    | Public share access                                     |
| `GET /api/admin/*`                              | Superuser system administration                         |

See [DOCUMENTATION.md](./docs/DOCUMENTATION.md) for complete API details and Swagger UI at `/api/docs`.

## Deployment

### Render (Recommended)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install && npm run build && cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**: Set `JWT_SECRET`, `NODE_ENV=production`
4. Add a Persistent Disk mounted at `/data` for SQLite

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
RUN cd server && npm install
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/src/index.js"]
```

## Documentation

For comprehensive documentation including:

- User guides
- Admin tutorials
- Troubleshooting
- Keyboard shortcuts

See **[DOCUMENTATION.md](./docs/DOCUMENTATION.md)**

## Development Progress

Track feature implementation and roadmap in **[PROGRESS.md](./PROGRESS.md)**

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## License

This project is licensed under the GPL 3.0 License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

- [Report Issues](https://github.com/yourusername/orgtree/issues)
- [Documentation](./docs/DOCUMENTATION.md)
