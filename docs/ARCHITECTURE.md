# Architecture

Start as a modular monolith with clear boundaries.

## Backend modules
Portfolio, Opportunities, Applications, Interviews, Documents, Academy, CareerAI and Identity.

## API conventions
- REST JSON under /api/v1
- DTOs separate from persistence entities
- Validate requests at boundaries
- OpenAPI in Development
- Health endpoints: /health (liveness) and /health/ready (database reachable)`n- Every response carries X-Correlation-Id, also attached to the log scope

## Data and privacy
PostgreSQL is the primary datastore. Store document metadata and storage references; never commit private CVs. Keep provider API keys in environment variables or a secret manager. Add authentication and authorization before exposing private workspace data.
