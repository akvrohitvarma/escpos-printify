# Use Node.js with Puppeteer pre-installed (Debian-based, lightweight)
FROM ghcr.io/puppeteer/puppeteer:24.7.2

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application files
COPY server.js ./
COPY .env.example ./.env

# Expose port
EXPOSE 3000

# Environment variables (can be overridden at runtime)
ENV PORT=3000
ENV PRINTER_HOST=192.168.192.168
ENV PRINTER_PORT=9100
ENV IMAGE_WIDTH=512
ENV PRINTER_TIMEOUT=10000
ENV RATE_LIMIT_MAX=30
ENV RATE_LIMIT_WINDOW=60000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run as non-root user (already set by puppeteer image)
CMD ["node", "server.js"]
