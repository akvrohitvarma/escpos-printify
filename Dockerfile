# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/web

COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Image
# ==========================================
FROM node:20-slim

# Sharp requires these on Debian slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files
COPY server.js ./
COPY lib/ ./lib/
COPY .env.example ./.env

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/web/dist ./web/dist

# Non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

ENV PORT=3000
ENV PRINTER_HOST=192.168.1.100
ENV PRINTER_PORT=9100
ENV IMAGE_WIDTH=512
ENV PRINTER_TIMEOUT=10000
ENV RATE_LIMIT_MAX=30
ENV RATE_LIMIT_WINDOW=60000
ENV MAX_CONCURRENT_RENDERS=3

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
