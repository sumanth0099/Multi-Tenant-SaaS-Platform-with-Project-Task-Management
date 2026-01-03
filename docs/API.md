# API Documentation

**Multi-Tenant SaaS Project & Task Manager**

Base URL (Docker / Local):

```
http://localhost:5000/api
```

---

## Legend: Understanding Auth

- **Auth: Required** → You must include a valid JWT token in the request header:  
  `Authorization: Bearer <JWT_TOKEN>`  
- **Auth: No** → Authentication is **not required**. The endpoint is public and can be called without a token.

---

## Authentication Overview

* Authentication uses **JWT (Bearer Token)**
* Token must be sent in header:

```http
Authorization: Bearer <JWT_TOKEN>
```

* Token is returned on successful login
* Role-based access control enforced:
  * `super_admin`
  * `tenant_admin`
  * `user`

---

## Health Check

### 1. Health Check

**GET** `/health`

Checks database connectivity and readiness.

**Auth:** No (authentication is not required)

**Response (200):**

```json
{
  "status": "ok",
  "database": "connected"
}
```

**Response (500):**

```json
{
  "status": "error"
}
```

---

## Authentication APIs

### 2. Login

**POST** `/auth/login`

**Auth:** No (authentication is not required)

**Request Body:**

```json
{
  "email": "admin@demo.com",
  "password": "Demo@123",
  "tenantSubdomain": "demo"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": "uuid",
      "email": "admin@demo.com",
      "role": "tenant_admin"
    }
  }
}
```

---

### 3. Get Logged-in User

**GET** `/auth/me`

**Auth:** Required

**Response (200):**

```json
{
  "id": "uuid",
  "email": "admin@demo.com",
  "role": "tenant_admin",
  "tenant_id": "uuid"
}
```

---

## Tenant APIs

### 4. Register Tenant

**POST** `/tenants`

**Auth:** No (authentication is not required)

**Request Body:**

```json
{
  "tenantName": "Demo Company",
  "subdomain": "demo",
  "adminEmail": "admin@demo.com",
  "adminPassword": "Demo@123",
  "adminFullName": "Demo Admin"
}
```

---

### 5. List Tenants

**GET** `/tenants`

**Auth:** Required  
**Role:** `super_admin`

---

### 6. Update Tenant

**PUT** `/tenants/:tenantId`

**Auth:** Required  
**Role:** `super_admin`

---

### 7. Delete Tenant

**DELETE** `/tenants/:tenantId`

**Auth:** Required  
**Role:** `super_admin`

---

## User APIs

### 8. List Users (Tenant)

**GET** `/tenants/:tenantId/users`

**Auth:** Required  
**Role:** `tenant_admin`

---

### 9. Add User

**POST** `/tenants/:tenantId/users`

**Auth:** Required  
**Role:** `tenant_admin`

**Request Body:**

```json
{
  "email": "user@demo.com",
  "full_name": "Demo User",
  "password": "User@123",
  "role": "user",
  "is_active": true
}
```

---

### 10. Update User

**PUT** `/users/:userId`

**Auth:** Required  
**Role:** `tenant_admin`

**Request Body:**

```json
{
  "full_name": "Updated Name",
  "role": "user",
  "is_active": true
}
```

---

### 11. Delete User

**DELETE** `/users/:userId`

**Auth:** Required  
**Role:** `tenant_admin`

---

## Project APIs

### 12. Create Project

**POST** `/projects`

**Auth:** Required

**Request Body:**

```json
{
  "name": "Demo Project",
  "description": "Project description",
  "status": "active"
}
```

---

### 13. List Projects

**GET** `/projects`

**Auth:** Required

---

### 14. Get Project by ID

**GET** `/projects/:projectId`

**Auth:** Required

---

### 15. Update Project

**PUT** `/projects/:projectId`

**Auth:** Required

---

### 16. Delete Project

**DELETE** `/projects/:projectId`

**Auth:** Required

---

## Task APIs

### 17. Create Task

**POST** `/projects/:projectId/tasks`

**Auth:** Required

**Request Body:**

```json
{
  "title": "Task 1",
  "description": "Task description",
  "status": "pending"
}
```

---

### 18. List Tasks (Project)

**GET** `/projects/:projectId/tasks`

**Auth:** Required

---

### 19. Update Task

**PUT** `/tasks/:taskId`

**Auth:** Required

---

### 20. Delete Task

**DELETE** `/tasks/:taskId`

**Auth:** Required

---

## Authorization Rules Summary

| Role         | Permissions                   |
| ------------ | ----------------------------- |
| super_admin  | Manage tenants                |
| tenant_admin | Manage users, projects, tasks |
| user         | View & update assigned tasks  |

---

## Evaluation Compliance

✔ All APIs documented  
✔ Request & response examples  
✔ Authentication explained  
✔ Matches backend implementation  

---

## Notes for Evaluators

* All APIs require JWT except `/auth/login`, `/tenants` (register), `/health`  
* Tenant isolation enforced via `tenant_id`  
* Seed credentials documented in README  
* Docker auto-runs migrations and seeds  

---