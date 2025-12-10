# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Build the project
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create a directory for config to be mounted
# Users should mount their config.json to /app/config.json
# docker run -v $(pwd)/config.json:/app/config.json -i sitefinity-cloud-ai-agent

# Set the entrypoint
ENTRYPOINT ["node", "dist/index.js"]