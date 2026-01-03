# System Architecture

The system follows a client-server architecture.

Frontend:
- React application running in browser.

Backend:
- Express.js REST API.
- JWT authentication.
- Role-based access control.
- Tenant isolation middleware.

Database:
- PostgreSQL with shared schema.
- tenant_id-based data isolation.

Authentication Flow:
- User logs in
- JWT issued
- Token used for authenticated requests