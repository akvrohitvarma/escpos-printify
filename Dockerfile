# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/web

# Copy frontend package files
COPY web/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY web/ ./

# Build production frontend
RUN npm run build

# ==========================================
# Stage 2: Production Image
# ==========================================
FROM ghcr.io/puppeteer/puppeteer:24.7.2

WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy server files
COPY server.js ./
COPY .env.example ./.env

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/web/dist ./web/dist

# Expose port
EXPOSE 3000

# Environment variables (can be overridden at runtime)
ENV PORT=3000
ENV PRINTER_HOST=192.168.1.100
ENV PRINTER_PORT=9100
ENV IMAGE_WIDTH=512
ENV PRINTER_TIMEOUT=10000
ENV RATE_LIMIT_MAX=30
ENV RATE_LIMIT_WINDOW=60000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run server (serves both API and frontend)
CMD ["node", "server.js"]
