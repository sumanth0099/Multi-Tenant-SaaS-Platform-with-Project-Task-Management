# Multi-Tenant SaaS Platform - Project & Task Management

## Project Title and Description
Multi-Tenant SaaS Platform with Project & Task Management. This production-ready SaaS application enables multiple organizations (tenants) to register independently, manage teams, create projects, and track tasks with complete data isolation, role-based access control (RBAC), and subscription plan limits. It uses a full-stack MERN architecture with PostgreSQL, Docker containerization, and 19 RESTful APIs for backend-frontend integration.

## Features
- Multi-tenant data isolation using tenant_id on all records (except super_admin).
- JWT-based authentication with 24-hour expiry and three roles: super_admin, tenant_admin, user.
- Role-based access control enforced at API level with middleware.
- Subscription plans (free: 5 users/3 projects; pro: 25/15; enterprise: 100/50) with limit enforcement.
- 19 API endpoints for auth, tenants, users, projects, tasks with consistent {success, message, data} responses.
- Audit logging for all critical actions in audit_logs table.
- Six responsive frontend pages: registration, login, dashboard, projects list, project details, users list.
- Full Docker support with docker-compose up -d for database, backend, frontend services.

## Technology Stack
**Frontend:** React 18+, JavaScript/ES6+, HTML5, CSS3 (responsive design with Tailwind CSS or similar).
**Backend:** Node.js 20+, Express.js 4+, pg module for PostgreSQL communication, bcrypt for password hashing, jsonwebtoken for JWT.
**Database:** PostgreSQL 16+ with migrations, indexes on tenant_id, foreign key constraints.
**Tools:** Docker & docker-compose (mandatory), Postman/Swagger for API testing, Git for version control.

## Architecture Overview
The system follows a shared database/shared schema multi-tenancy model with tenant_id filtering via middleware for isolation. Client browsers interact with React frontend (port 3000), which calls Express backend APIs (port 5000), querying PostgreSQL (port 5432). JWT middleware extracts tenant_id/role from tokens; auth/authorization layers protect endpoints; Docker networks enable inter-service communication (e.g., frontend -> backend:5000).  

## Installation & Setup
### Prerequisites
- Node.js >=20
- Docker & Docker Compose
- Git
- PostgreSQL client (optional, for local dev)

### Step-by-Step Setup
1. Clone repo: `git clone <repo-url> && cd multi-tenant-saas`
2. Copy env: `cp .env.example .env` and fill values.
3. Start services: `docker-compose up -d` (auto-runs migrations/seeds).
4. Verify health: `curl http://localhost:5000/api/health`
5. Frontend auto-builds/serves on http://localhost:3000.

### Run Migrations/Seeds
Handled automatically on Docker startup via backend init scripts (no manual commands)

### Start Services
- Backend: Auto via Docker (or `npm start` after `npm install`).
- Frontend: Auto via Docker (or `npm run dev`).
- Database: Auto via Docker.

## Environment Variables
Create `.env` file in backend root with these (committed for evaluation; use dev values):

```
# =======================
# Database Configuration
# =======================
DB_HOST=database          # Docker service name or localhost
DB_PORT=5432
DB_NAME=saasdb
DB_USER=postgres
DB_PASSWORD=postgres      # Purpose: Postgres auth for saasdb

# =======================
# JWT Configuration
# =======================
JWT_SECRET=your_jwt_secret_key_min_32_chars  # Purpose: Sign/verify JWT tokens (min 32 chars)
JWT_EXPIRES_IN=24h        # Purpose: Token lifetime (24 hours)

# =======================
# Server Configuration
# =======================
PORT=5000                 # Purpose: Backend server port
NODE_ENV=development      # Purpose: Environment mode (development/production)

# =======================
# Frontend URL (for CORS)
# =======================
FRONTEND_URL=http://localhost:3000  # Purpose: Allowed CORS origins (Docker: http://frontend:3000)
```

## API Documentation
## Core API Documentation - 10 Main Endpoints

Focused on the most important APIs for daily operations (prioritized by usage frequency).

**1. POST /api/auth/register-tenant**
- Creates new tenant + admin. Body: `{tenantName, subdomain, adminEmail, adminPassword, adminFullName}`. Returns tenantId + user details (201).

**2. POST /api/auth/login**
- Login with tenant subdomain. Body: `{email, password, tenantSubdomain}`. Returns JWT token + user/tenant info (200).

**3. GET /api/auth/me**
- Current user profile. Headers: `Authorization: Bearer <token>`. Returns user + tenant details (200).

**4. GET /api/tenants/:tenantId**
- Tenant dashboard stats. Role: tenant_admin/super_admin. Returns usage stats (users/projects/tasks) (200).

**5. POST /api/tenants/:tenantId/users**
- Add team member. Role: tenant_admin. Body: `{email, password, fullName, role}`. Checks subscription limits (201).

**6. GET /api/tenants/:tenantId/users**
- List team users. Supports `?search=john&role=user`. Returns paginated users (200).

**7. POST /api/projects**
- Create project. Body: `{name, description}`. Auto tenant_id from JWT, checks max_projects (201).

**8. GET /api/projects**
- List projects with task counts. Supports `?status=active&search=web`. Paginated (200).

**9. POST /api/projects/:projectId/tasks**
- Create task. Body: `{title, description, assignedTo, priority, dueDate}` (201).

**10. GET /api/projects/:projectId/tasks**
- List tasks. Supports `?status=todo&priority=high`. Paginated with assignee details (200).

All use `{success, message, data}` format. Health: GET /api/health.

## Hosting on Render & Neon DB

This project is fully ready to be hosted on **Render** utilizing **Docker** and a **Neon PostgreSQL DB**.

### 1. Database Setup (Neon DB)
1. Sign up for [Neon Console](https://neon.tech/) and create a new project with a PostgreSQL database.
2. Retrieve your database connection string (`DATABASE_URL`). It should look something like:
   `postgresql://alex:AbC123dEf@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 2. Backend Deployment on Render (Docker Web Service)
1. In Render, click **New** -> **Web Service**.
2. Connect your Git repository.
3. In the Web Service configuration:
   - **Name:** `saas-backend` (or your preferred name)
   - **Environment:** `Docker`
   - **Docker Context Path:** `./backend` (Or leave `./` if deploying from the root of the backend repo)
   - **Docker File Path:** `Dockerfile` (Relative to context, so `Dockerfile` inside the backend directory)
4. Under **Advanced / Environment Variables**, add the following:
   - `DATABASE_URL`: The Neon DB connection string from Step 1.
   - `JWT_SECRET`: A secure random string (minimum 32 characters).
   - `JWT_EXPIRES_IN`: `24h`
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: The URL of your deployed frontend (e.g. `https://saas-frontend.onrender.com`).
5. Render will automatically build the image, run the entrypoint, wait for Neon DB, run the migrations and seeds, and start the backend service.

### 3. Frontend Deployment on Render (Static Site or Web Service)
#### Option A: Static Site (Recommended)
1. In Render, click **New** -> **Static Site**.
2. Connect your Git repository.
3. Configure the build:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `build`
   - **Root Directory:** `frontend`
4. Under **Environment Variables**, add:
   - `REACT_APP_API_URL`: The URL of your deployed backend (e.g. `https://saas-backend.onrender.com/api`).

#### Option B: Docker Web Service
1. Click **New** -> **Web Service** and choose **Docker**.
2. Configure build:
   - **Docker Context Path:** `./frontend`
   - **Docker File Path:** `Dockerfile`
3. Under **Environment Variables**, add:
   - `REACT_APP_API_URL`: The URL of your deployed backend.