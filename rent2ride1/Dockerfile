# Use official lightweight Node.js 20 Alpine image
FROM node:20-alpine

# Install build dependencies for native compilation (required for sqlite3 on alpine)
RUN apk add --no-cache python3 make g++

# Set working directory inside container
WORKDIR /app

# Copy package manifests first for efficient layer caching
COPY package*.json ./

# Install application dependencies
RUN npm install --omit=dev

# Copy application source code and public frontend
COPY src/ ./src/
COPY public/ ./public/

# Create persistent storage directory for SQLite database
RUN mkdir -p /app/data && chown -R node:node /app

# Use non-root node user for container security
USER node

# Declare data volume for SQLite persistence
VOLUME ["/app/data"]

# Expose HTTP port
EXPOSE 3000

# Default environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/rent2ride.db \
    JWT_SECRET=rent2ride_production_secret_key_2026

# Healthcheck to verify container responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the Node.js application
CMD ["npm", "start"]
