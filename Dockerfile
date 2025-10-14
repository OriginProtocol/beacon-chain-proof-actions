FROM node:20-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/gh-pages/20/alpine3.20/index.md#node20-alpine320-bookworm-runtime-only for more info
RUN apk add --no-cache libc6-compat

# Set working directory to project root
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy root package files for dependency installation
COPY package.json pnpm-lock.yaml* ./
COPY backend/package.json backend/

# Copy pnpm-workspace.yaml if it exists
COPY pnpm-workspace.yaml* ./

# Install all dependencies (including workspace setup)
RUN id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Builder stage: where the Next.js build happens
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_BACKEND_URL
RUN echo "printing NEXT_PUBLIC_BACKEND_URL value"
RUN echo $NEXT_PUBLIC_BACKEND_URL

# Install pnpm globally
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy all source code and configuration
COPY . .

# Build the Next.js frontend
RUN pnpm run build

# Runner stage: production image with built artifacts
FROM node:20-alpine AS runner
WORKDIR /app

# Install pnpm globally (avoids runtime corepack download)
RUN npm install -g pnpm

# Set production environment
ENV NODE_ENV=production

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user early
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs \
    chown -R nextjs:nodejs /app

# Copy package files for production install (including workspaces)
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml* ./
COPY --from=builder --chown=nextjs:nodejs /app/backend/package.json ./backend/

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# TODO: uncomment once we have any public assets
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy entire backend directory with all its files
COPY --from=builder --chown=nextjs:nodejs /app/backend ./backend
COPY --from=deps --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules

RUN cd /app/backend && pnpm install --prod --frozen-lockfile

# Switch to non-root user
USER nextjs

# Expose frontend port (Next.js)
EXPOSE 3000

# Expose backend API port
EXPOSE 3001

# Health check for backend API
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --start-interval=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start all three services concurrently (frontend, backend server, cron)
# Use exec form to run pnpm directly (fixes PATH issues for .bin scripts if needed)
CMD ["pnpm", "run", "start:full"]