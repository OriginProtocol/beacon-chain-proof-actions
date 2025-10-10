FROM node:18-alpine

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

# Expose frontend port (Next.js)
EXPOSE 3000

# Expose backend API port
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start all three services concurrently
CMD ["pnpm", "run", "start:full"]

