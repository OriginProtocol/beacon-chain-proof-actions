FROM node:20-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/gh-pages/20/alpine3.20/index.md#node20-alpine320-bookworm-runtime-only for more info
RUN apk add --no-cache libc6-compat

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory to project root
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml* ./
COPY backend/package.json backend/

# Install root dependencies (including workspace setup)
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY . .

# Create logs directory for backend
RUN mkdir -p backend/logs

# Builder stage: where the Next.js build happens
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY . .

# Build the project and its dependencies
RUN pnpm build

# Runner stage: production image with built artifacts
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Disable telemetry during runtime
ENV NEXT_TELEMETRY_DISABLED 1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
# For standalone mode: copy the minimal server and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/backend ./backend
USER nextjs

# Expose frontend port (Next.js)
EXPOSE 3000
ENV PORT=3000
# Start all three services concurrently
CMD ["pnpm", "run", "start:full"]

