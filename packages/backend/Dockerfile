# Multi-stage build for backend
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

RUN npm install -g pnpm

# Copy dependency files
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/shared/package.json packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copy all source files
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/backend packages/backend/
COPY packages/shared packages/shared/
COPY tsconfig.json ./

# Install all dependencies for building
RUN pnpm install --frozen-lockfile

# Build backend
RUN pnpm --filter @vapestore-pos/backend build

# Stage 3: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages

# Copy built application from builder stage
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start application
CMD ["node", "packages/backend/dist/index.js"]
