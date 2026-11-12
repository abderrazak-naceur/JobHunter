# JobHunter

Personal career management platform: portfolio, job pipeline, interview tracking, job-description analysis, Company Radar and learning academy.

## Stack

- Frontend: React + TypeScript + Vite + Preline UI
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
dotnet ef database update
dotnet run --no-launch-profile
```

If the `dotnet-ef` tool is already installed, update it with `dotnet tool update --global dotnet-ef --version 10.0.0` instead of installing it.

The initial migration (`InitialCompanyRadar`) is already committed in `Migrations/`, so `dotnet ef database update` is enough to create the schema. When you change the model, create a new migration with `dotnet ef migrations add <MigrationName>`, commit the generated files, and run `dotnet ef database update` again.

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

## Running tests

Backend (xUnit, in-process API with in-memory SQLite, no PostgreSQL needed):

```powershell
dotnet test src/backend/JobHunter.Api.Tests/JobHunter.Api.Tests.csproj
```

If the API is running and locks `JobHunter.Api.exe`, add `-p:UseAppHost=false` or stop the API first.

Frontend (Vitest + Testing Library, ESLint):

```powershell
cd src/frontend
npm test
npm run lint
```

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

- Backend: `dotnet format --verify-no-changes`, build, tests, NuGet vulnerability scan and an EF Core check that fails when the model has changes without a migration (`dotnet ef migrations has-pending-model-changes`).
- Frontend: ESLint, tests, build and `npm audit` on production dependencies (high severity or above).

Run the same checks locally before opening a pull request. Dependabot opens weekly update PRs for NuGet, npm and GitHub Actions.

### npm or Git fail with a certificate error?

Errors such as `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or `unable to get local issuer certificate` usually mean a corporate proxy, VPN or antivirus inspects TLS traffic. Keep verification enabled and make the tools use the Windows certificate store instead:

```powershell
$env:NODE_OPTIONS = "--use-system-ca"   # Node.js 22.15+, current session only
git config --global http.sslBackend schannel
```

## Company Radar scope

Company Radar now reads and writes company records through the .NET API and PostgreSQL. It supports create, list/search, edit, follow/unfollow and delete. Career-page crawling, ATS integrations, scheduled scans and notifications are not implemented yet.

See `AGENT_TASKS.md` for the task list and current progress.

## Security

Never commit real CVs, personal documents, database passwords, API keys or `.env.local` files. Use environment variables or a secrets manager for credentials. This initial application does not yet include user authentication; do not expose it publicly or store sensitive personal data until authentication and authorization are implemented.
