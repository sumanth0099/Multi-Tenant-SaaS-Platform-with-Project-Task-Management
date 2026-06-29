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

# Copy package files for dependency installation
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy the backend source files
COPY backend ./backend

# Build the frontend (injecting REACT_APP_API_URL to match our backend path)
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && REACT_APP_API_URL=/api npm run build

WORKDIR /app/backend

# Ensure the entrypoint script is executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 5000

# Run entrypoint
ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
