# Running Vapestore POS Locally

## Prerequisites

Ensure you have installed:

- **Node.js v20+** (check: `node --version`)
- **pnpm v8+** (check: `pnpm --version`)
- **PostgreSQL** (running locally or via Docker)
- **Redis** (optional, for caching)

---

## Setup Database

### Option 1: PostgreSQL Local Installation

```bash
# Windows: Install from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql@15
# Linux: sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
# Windows: Services → PostgreSQL
# macOS: brew services start postgresql@15
# Linux: sudo service postgresql start

# Create database
createdb vapestore_pos

# Create user
psql -U postgres -c "CREATE USER vapestore_dev WITH PASSWORD 'password123';"
psql -U postgres -c "ALTER ROLE vapestore_dev WITH CREATEDB;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE vapestore_pos TO vapestore_dev;"
```

### Option 2: PostgreSQL Docker

```bash
docker run --name postgres-vapestore \
  -e POSTGRES_USER=vapestore_dev \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=vapestore_pos \
  -p 5432:5432 \
  -d postgres:15
```

---

## Setup Backend

### Step 1: Install Dependencies

```bash
cd packages/backend
pnpm install
```

### Step 2: Configure Environment

Create `.env.local` file:

```bash
# Database
DATABASE_URL=postgresql://vapestore_dev:password123@localhost:5432/vapestore_pos

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-min-32-characters-long

# App
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:3000

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Step 3: Start Backend Server

Migrations run automatically on first startup:

### Step 4: Seed Database (Optional)

```bash
cd packages/backend
pnpm run dev
```

**Note:** Migrations run automatically on first startup.

**Expected output:**

```
Server running on http://localhost:3001
```

---

## Setup Frontend

### Step 1: Install Dependencies

```bash
cd packages/frontend
pnpm install
```

### Step 2: Configure Environment

Create `.env.local` file:

```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Vapestore POS
NEXT_PUBLIC_ENVIRONMENT=development
```

### Step 3: Start Frontend Dev Server

```bash
cd packages/frontend
pnpm run dev
```

**Expected output:**

```
▲ Next.js 14.2.35
- Local:        http://localhost:3000
```

---

## Full Stack - Complete Setup

### Terminal 1: PostgreSQL

```bash
# If using Docker
docker run --name postgres-vapestore \
  -e POSTGRES_USER=vapestore_dev \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=vapestore_pos \
  -p 5432:5432 \
  -d postgres:15
```

### Terminal 2: Backend

```bash
cd packages/backend
pnpm install
pnpm run dev
```

Server runs on: **http://localhost:3001**

### Terminal 3: Frontend

```bash
cd packages/frontend
pnpm install
pnpm run dev
```

App runs on: **http://localhost:3000**

---

## Access the Application

1. **Frontend**: http://localhost:3000
2. **Backend API**: http://localhost:3001
3. **Health Check**: http://localhost:3001/health

---

## Common Issues

### "Error: connect ECONNREFUSED 127.0.0.1:5432"

**Solution**: PostgreSQL not running

```bash
# Windows: Check PostgreSQL service is running
# Or start PostgreSQL
net start postgresql-x64-15

# macOS
brew services start postgresql@15

# Linux
sudo service postgresql start
```

### "Error: getaddrinfo ENOTFOUND localhost"

**Solution**: Backend not running. Check Terminal 2 is running on port 3001

### "Error: NEXT_PUBLIC_API_URL not set"

**Solution**: Missing `.env.local` in packages/frontend. Create it with:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### "error: migrations pending"

**Solution**: Restart the backend server - migrations run automatically on startup

```bash
# Stop backend (Ctrl+C)
# Then restart:
cd packages/backend
pnpm run dev
```

---

## Useful Commands

### Backend

```bash
# Development
pnpm run dev

# Build
pnpm run build

# Type check
pnpm run type-check

# Run tests
pnpm run test

# Seed database with sample data
pnpm run seed
```

### Frontend

```bash
# Development
pnpm run dev

# Build
pnpm run build

# Production start
pnpm run start

# Type check
pnpm run type-check

# Linting
pnpm run lint

# Tests
pnpm run test
```

---

## Debug Mode

### Backend Debug

```bash
cd packages/backend
DEBUG=* pnpm run dev
```

### Frontend Debug

Visit: http://localhost:3000 and open DevTools (F12)

---

## Stop Services

```bash
# Stop Docker containers
docker stop postgres-vapestore

# Kill Node processes (if needed)
# Windows: taskkill /F /IM node.exe
# macOS/Linux: pkill -f "node"
```

---

## Reset Everything

```bash
# Stop all services
docker stop postgres-vapestore

# Clear node_modules
rm -rf node_modules
rm -rf packages/*/node_modules
rm pnpm-lock.yaml

# Reinstall
pnpm install

# Restart from step 1
```

---

## Next: Production Deployment

Once working locally, deploy to:

- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: Supabase or Railway PostgreSQL

See: `DEPLOYMENT_VERCEL.md`
