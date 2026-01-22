# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Jira-like task management API built with:
- **Elysia** (Bun-based web framework) for HTTP server
- **PostgreSQL** for database (using node-postgres `pg` client)
- **TypeScript** for type safety
- **JWT** authentication via `@elysiajs/jwt`
- **Zod** for request validation

## Development Commands

### Running the Application
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Database Management
```bash
# Run migrations (creates/updates database schema)
npm run migrate

# Run seeders (populates database with initial data)
npm run seed
```

The application runs on port 8000 by default (configurable via PORT env var).

## Architecture

### Database Layer

**Connection Management** (`src/config/database.ts`):
- Custom PostgreSQL connection pool with retry logic and exponential backoff
- Optimized for Neon cloud PostgreSQL (detects Neon hostnames automatically)
- Enhanced error handling for connection failures
- Health check endpoints with pool statistics
- Use the exported `db` object for queries with built-in retry logic

**Migration System** (`database/migrate.ts`):
- TypeScript-based migrations in `database/migrations/`
- Tracks executed migrations in a `migrations` table
- Each migration file exports `up()` and `down()` functions
- Migrations run sequentially in filename order
- The initial migration (`001_init.ts`) creates the core schema with UUIDs, custom sequences, and indexes

**Schema**:
- `roles`: User roles (admin, user)
- `users`: User accounts with UUID primary keys and custom user codes (LCB0001, LCB0002, etc.)
- `projects`: Projects with custom codes (PJ250122001 format: PJ + YYMMDD + sequence)
- `project_members`: Many-to-many relationship between projects and users
- `tasks`: Tasks with custom codes (TSK250122001 format), status, priority, assignee
- `comments`: Task comments
- All tables use UUID primary keys with auto-generated custom human-readable codes

### API Layer

**Framework**: Elysia.js (Bun-native framework similar to Express but type-safe)

**Structure**:
```
src/
├── index.ts              # Main application entry point (currently minimal)
├── config/
│   └── database.ts       # Database connection pool and retry logic
├── routes/               # Route definitions with Elysia routing
│   ├── auth.ts          # Authentication routes (/api/auth/*)
│   ├── manage-users.ts  # User management routes
│   ├── manage-projects.ts # Project routes
│   └── manage-tasks.ts   # Task routes
├── controllers/          # Business logic handlers
│   ├── auth.ts          # Login logic (dual table support: members + users)
│   ├── manage-users.ts
│   ├── manage-projects.ts
│   └── manage-tasks.ts
├── schemas/              # Zod validation schemas
│   ├── auth.ts          # Login/register schemas
│   ├── manage-users.ts
│   ├── manage-projects.ts
│   └── manage-tasks.ts
└── utils/
    ├── auth.ts          # Password hashing, JWT generation, token utilities
    └── authHelpers.ts   # Elysia middleware for authentication
```

**Route Pattern**:
Routes use Elysia's plugin architecture:
```typescript
const routes = new Elysia({ prefix: '/api/resource' })
  .use(jwt({ ... }))
  .post('/endpoint', controllerFunction, { body: zodSchema })
  .derive(authMiddleware)     // Adds user to context
  .derive(requireAuth)        // Ensures user is authenticated
  .derive(requireMemberAccount) // Role-based access control
```

### Authentication

**Dual-Table System**: The auth controller checks both `members` (regular users) and `users` (admin/staff) tables for login.

**JWT Flow**:
1. User logs in with email/password
2. Password verified using bcrypt
3. JWT token generated with user ID and email
4. Refresh token generated, hashed, and stored in `refresh_tokens` table
5. Both tokens returned to client

**Middleware**:
- `authMiddleware`: Extracts JWT from Authorization header, verifies it, and adds `user` to context
- `requireAuth`: Placeholder for auth enforcement
- `requireMemberAccount`: Ensures user has member account type
- `requireAdminAccount`: Ensures user has admin account type

**Token Management** (`src/utils/auth.ts`):
- JWT tokens for authentication (24h default expiry)
- Scoped tokens for specific purposes (OTP, password reset)
- Refresh tokens with device/IP tracking
- Token revocation support (individual or all user tokens)
- Automatic cleanup of expired tokens

### Environment Configuration

Required environment variables (see `.env.example`):
```
DATABASE_URL          # PostgreSQL connection string
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME  # Individual DB params
JWT_SECRET            # Secret key for JWT signing
PORT                  # Server port (default: 8000)
FRONTEND_URL          # Frontend URL for CORS
```

Database pool auto-configures SSL for Neon cloud PostgreSQL based on hostname detection.

## Key Implementation Notes

1. **Custom ID System**: All entities use both UUID (primary key) and human-readable codes (user_code, project_code, task_code) generated via PostgreSQL sequences and functions.

2. **Database Queries**: Always use `db.query()` from `src/config/database.ts` instead of direct pool access to get automatic retry logic.

3. **Validation**: All request bodies are validated using Zod schemas defined in `src/schemas/`.

4. **Error Handling**: Controllers should wrap logic in try-catch and set appropriate HTTP status codes via Elysia's `set.status`.

5. **Incomplete Implementation**: Many controller files (`manage-users.ts`, `manage-projects.ts`, `manage-tasks.ts`) are currently skeleton files (1 line). Route definitions exist but business logic needs implementation.

6. **Migration Safety**: The migration system tracks which migrations have run. Never modify an already-executed migration; create a new one instead.
