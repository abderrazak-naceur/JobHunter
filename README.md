# JobHunter

Personal career management platform: portfolio, job pipeline, interview tracking, job-description analysis and learning academy.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: ASP.NET Core 10 Web API
- Database: PostgreSQL (installed and run locally; no Docker required)

## Structure
- `src/frontend` — React application
- `src/backend/JobHunter.Api` — ASP.NET Core API
- `docs` — product and architecture documentation

## Local setup (without Docker)
1. Install .NET 10 SDK and Node.js 22+.
2. Install PostgreSQL directly on your machine (or use an existing PostgreSQL server).
3. Create a database named `jobhunter` and a dedicated database user.
4. Copy `.env.example` to `.env` and set your local database connection settings.
5. Run the API from `src/backend/JobHunter.Api`.
6. Run `npm install` and `npm run dev` from `src/frontend`.

Never commit real CVs, personal documents, API keys or `.env` files.
