# OrgTree

A modern, full-stack organizational directory and visualization platform. Build, manage, and share interactive org charts with real-time collaboration.

**[Live Demo](https://orgtree.onrender.com)** | **[Documentation](./DOCUMENTATION.md)**

## Features

### Organization Management
- **Multi-Organization Support**: Create and manage multiple organizations
- **Department Hierarchy**: Unlimited nesting with drag-and-drop reorganization
- **People Management**: Full employee directory with contact details
- **Bulk Operations**: Select multiple items for move, edit, or delete

### Visualization
- **Interactive Org Chart**: Pan, zoom, and navigate with React Flow
- **Flexible Layouts**: Vertical (top-down) or horizontal (left-right) views
- **Expandable Nodes**: Click departments to show/hide team members
- **Depth-Based Coloring**: Visual hierarchy with automatic color gradients
- **Mini-Map**: Bird's-eye navigation for large organizations

### Collaboration
- **Team Roles**: Owner, Admin, Editor, Viewer permissions
- **Email Invitations**: Invite team members via email
- **Real-Time Sync**: Changes appear instantly across all connected users
- **Share Links**: Public or private sharing with optional passwords

### Data Management
- **Import/Export**: JSON and CSV format support
- **Full-Text Search**: Instant search across all organizations
- **Audit Trail**: Track all changes with 1-year retention
- **Automatic Backups**: Database persistence on Render

## Tech Stack

### Frontend
- **React 18** with hooks
- **React Flow** for interactive canvas
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Socket.IO Client** for real-time updates
- **Vite** for build tooling

### Backend
- **Node.js** with Express
- **SQLite** with better-sqlite3
- **FTS5** for full-text search
- **Socket.IO** for WebSocket connections
- **bcrypt** for password hashing
- **jsonwebtoken** for authentication
- **Resend** for transactional emails
- **express-rate-limit** for API protection

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

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
├── src/                    # Frontend source
│   ├── components/
│   │   ├── admin/          # Admin panels (Person, Department managers)
│   │   ├── auth/           # Login, Register, Password reset
│   │   ├── layout/         # Layout components
│   │   └── org-chart/      # Visualization components
│   ├── contexts/           # React contexts (Auth, Socket)
│   ├── hooks/              # Custom hooks
│   ├── api/                # API client
│   └── pages/              # Route pages
├── server/                 # Backend source
│   └── src/
│       ├── routes/         # API routes
│       ├── services/       # Business logic
│       ├── middleware/     # Auth, rate limiting
│       └── db.js           # Database setup
├── DOCUMENTATION.md        # Full user & admin guide
└── PROGRESS.md             # Development progress
```

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/*` | Authentication (register, login, logout) |
| `GET/POST /api/organizations` | Organization CRUD |
| `GET/POST /api/organizations/:id/departments` | Department management |
| `GET/POST /api/organizations/:id/people` | People management |
| `POST /api/organizations/:id/*/bulk-*` | Bulk operations |
| `GET /api/organizations/:id/audit-logs` | Audit trail |
| `POST /api/organizations/:id/invitations` | Team invitations |
| `GET /api/share/:token` | Public share access |

See [DOCUMENTATION.md](./DOCUMENTATION.md) for complete API details.

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
FROM node:18-alpine
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

See **[DOCUMENTATION.md](./DOCUMENTATION.md)**

## Development Progress

Track feature implementation and roadmap in **[PROGRESS.md](./PROGRESS.md)**

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

- [Report Issues](https://github.com/yourusername/orgtree/issues)
- [Documentation](./DOCUMENTATION.md)
