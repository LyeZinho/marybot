# =============================================================================
# MARYBOT - Multi-stage Docker Build
# Este Dockerfile é usado para builds de produção completa
# =============================================================================

# Stage 1: Build API Service
FROM node:18-alpine AS api-builder
WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci --only=production
COPY api/ ./
RUN npx prisma generate

# Stage 2: Build Backend Service  
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Stage 3: Build Bot Service
FROM node:18-alpine AS bot-builder
WORKDIR /app/bot
COPY bot/package*.json ./
RUN npm ci --only=production
COPY bot/ ./

# Stage 4: Build Admin Panel
FROM node:18-alpine AS admin-builder
WORKDIR /app/admin-panel
COPY admin-panel/package*.json ./
RUN npm ci --only=production
COPY admin-panel/ ./
RUN npm run build

# Stage 5: Final Multi-service Image (Legacy support)
FROM node:18-alpine
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    python3 \
    make \
    g++

# Copy all services
COPY --from=api-builder /app/api ./api
COPY --from=backend-builder /app/backend ./backend  
COPY --from=bot-builder /app/bot ./bot
COPY --from=admin-builder /app/admin-panel ./admin-panel

# Copy configuration files
COPY docker-compose.yml ./
COPY start.sh ./
COPY Makefile ./
COPY .env.example ./

# Make scripts executable
RUN chmod +x start.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S marybot -u 1001 && \
    chown -R marybot:nodejs /app

USER marybot

# Expose all service ports
EXPOSE 3001 3002 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Default command
CMD ["./start.sh", "-m", "prod"]