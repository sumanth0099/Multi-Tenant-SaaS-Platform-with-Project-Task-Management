FROM node:20-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy the backend source files
COPY backend ./backend

WORKDIR /app/backend

# Ensure the entrypoint script is executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 5000

# Run entrypoint
ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
