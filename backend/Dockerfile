FROM node:20-alpine

# Declare build arguments (can be passed via docker build --build-arg)
ARG DATABASE_URL
ARG JWT_SECRET
ARG JWT_EXPIRES_IN=24h
ARG PORT=5000
ARG NODE_ENV=production
ARG FRONTEND_URL

# Map build arguments to environment variables in the image
ENV DATABASE_URL=${DATABASE_URL}
ENV JWT_SECRET=${JWT_SECRET}
ENV JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
ENV PORT=${PORT}
ENV NODE_ENV=${NODE_ENV}
ENV FRONTEND_URL=${FRONTEND_URL}

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
