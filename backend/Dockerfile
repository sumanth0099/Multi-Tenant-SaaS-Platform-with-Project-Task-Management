FROM node:20-alpine

# Install required system tools
RUN apk add --no-cache curl netcat-openbsd

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Ensure entrypoint is executable
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 5000

# Use shell explicitly (Alpine-safe)
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
