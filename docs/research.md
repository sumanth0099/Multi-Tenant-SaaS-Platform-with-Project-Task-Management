# Research Document – Multi-Tenant SaaS Platform

## 1. Multi-Tenancy Analysis

### Shared Database with Shared Schema
In this approach, all tenants share the same database and the same tables.
Each table contains a tenant_id column to isolate data.
This approach is cost-effective, easier to manage, and scales well for small
to medium SaaS applications. However, strict tenant isolation must be enforced
at the application level to prevent data leaks.

### Shared Database with Separate Schema
In this model, all tenants share the same database but each tenant has its own schema.
This improves data isolation and reduces accidental cross-tenant access.
However, schema management becomes complex as the number of tenants increases.

### Separate Database per Tenant
Each tenant gets a completely separate database.
This provides maximum isolation and security but is expensive, difficult to scale,
and complex to maintain for a large number of tenants.

### Comparison
Shared schema is cost-effective and scalable.
Separate schema improves isolation but increases operational overhead.
Separate database provides the strongest isolation but is not practical for most SaaS systems.

### Chosen Approach
This project uses a shared database with a shared schema and tenant_id-based isolation.
This approach balances scalability, cost, and maintainability while still allowing
secure data isolation through application-level checks.

## 2. Technology Stack Justification

The backend is built using Node.js and Express.js for fast development and flexibility.
PostgreSQL is used as the database due to its reliability, strong relational support,
and transactional guarantees.
JWT-based authentication is used to support stateless authentication.
React is used on the frontend for building a responsive user interface.
Docker is used to ensure consistent environments across development and deployment.

## 3. Security Considerations

Data isolation is enforced using tenant_id filters on all queries.
JWT authentication ensures secure access control.
Passwords are hashed using bcrypt and never stored in plain text.
Role-based authorization restricts access to sensitive operations.
Audit logs track critical actions for security monitoring.