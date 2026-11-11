# JobHunter

Personal career management platform: portfolio, job pipeline, interview tracking, job-description analysis, Company Radar and learning academy.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: ASP.NET Core 10 Minimal API
- Database: PostgreSQL 18 (local installation; no Docker)
- Persistence: EF Core 10 + Npgsql

## Structure

- `src/frontend` — React application
- `src/backend/JobHunter.Api` — ASP.NET Core API
- `docs` — product and architecture documentation

## Local setup (without Docker)

### 1. Prerequisites

Install .NET 10 SDK, Node.js 22+ and PostgreSQL locally.

### 2. Create the PostgreSQL database

Using pgAdmin or psql, create a dedicated role and database. Example:

```sql
CREATE USER jobhunter_app WITH PASSWORD 'choose-a-local-password';
CREATE DATABASE jobhunter OWNER jobhunter_app;
```

Do not use the example password in a shared or production environment.

### 3. Configure and run the API (PowerShell)

From the repository root:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:5000"
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=jobhunter;Username=jobhunter_app;Password=YOUR_LOCAL_PASSWORD"

cd src/backend/JobHunter.Api
dotnet restore
dotnet tool install --global dotnet-ef --version 10.0.0
dotnet ef migrations add InitialCompanyRadar
dotnet ef database update
dotnet run --no-launch-profile
```

If the `dotnet-ef` tool is already installed, update it with `dotnet tool update --global dotnet-ef --version 10.0.0` instead of installing it.

The first migration command creates the EF Core migration source files. Commit those migration files to Git so the database schema can be reproduced on other machines. Run `dotnet ef database update` whenever new migrations are added.

API endpoints:
- `GET /health`
- `GET /api/v1/companies?search=dotnet&page=1&pageSize=20`
- `GET /api/v1/companies/{id}`
- `POST /api/v1/companies`
- `PUT /api/v1/companies/{id}`
- `DELETE /api/v1/companies/{id}`

OpenAPI is available at `/openapi/v1.json` in Development.

### 4. Configure and run the frontend

Create `src/frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Then:

```powershell
cd src/frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## Company Radar scope

Company Radar now reads and writes company records through the .NET API and PostgreSQL. It supports create, list/search, edit, follow/unfollow and delete. Career-page crawling, ATS integrations, scheduled scans and notifications are not implemented yet.

## Security

Never commit real CVs, personal documents, database passwords, API keys or `.env.local` files. Use environment variables or a secrets manager for credentials. This initial application does not yet include user authentication; do not expose it publicly or store sensitive personal data until authentication and authorization are implemented.
