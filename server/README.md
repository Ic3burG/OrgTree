# OrgTree Server

Express.js backend server with JWT authentication for the OrgTree application.

## Tech Stack

- **Node.js + Express**: Web framework
- **better-sqlite3**: SQLite database
- **JWT**: Authentication
- **bcrypt**: Password hashing

## Setup

1. Install dependencies:

```bash
npm install
```

2. Environment variables are already configured in `.env`:
   - `JWT_SECRET`: Secret key for JWT tokens
   - `JWT_EXPIRES_IN`: Token expiration time (default: 7 days)
   - `PORT`: Server port (default: 3001)

3. Start the server:

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The database will be automatically created at `server/database.db` on first run.

## API Endpoints

### Authentication

**POST /api/auth/signup**
Create a new user account.

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "created_at": "2025-11-28T..."
  },
  "token": "jwt-token..."
}
```

**POST /api/auth/login**
Login with existing credentials.

Request:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin"
  },
  "token": "jwt-token..."
}
```

**GET /api/auth/me**
Get current user information (requires authentication).

Headers:

```
Authorization: Bearer <jwt-token>
```

Response:

```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "created_at": "2025-11-28T..."
}
```

### Health Check

**GET /api/health**
Check if the server is running.

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-11-28T..."
}
```

## Database Schema

The SQLite database includes the following tables:

- **users**: User accounts
- **organizations**: Organizations created by users
- **departments**: Hierarchical department structure
- **people**: People within departments

## Error Handling

All errors return a JSON response with a `message` field:

```json
{
  "message": "Error description"
}
```

Common status codes:

- `400`: Bad request (validation errors)
- `401`: Unauthorized (invalid credentials or token)
- `404`: Not found
- `500`: Internal server error

## Development

The server uses Node.js `--watch` flag in development mode for automatic restarts when files change.

## License

This server is part of OrgTree, licensed under the [GNU Affero General Public License v3](../LICENSE) (AGPL-3.0-or-later). A commercial license is also available — see the [root README](../README.md#license) for details.
