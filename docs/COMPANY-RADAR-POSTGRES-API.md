# Company Radar — PostgreSQL API implementation

## Delivered in this branch

- Added EF Core 10 and Npgsql provider.
- Added the `Company` persistence entity and `JobHunterDbContext`.
- Added company request/response contracts.
- Added REST endpoints for paginated listing/search, detail, create, update and delete.
- Added validation for required name, HTTP(S) Careers URL, optional website URL, priority values and notes length.
- Added a uniqueness check for Careers URLs and a database unique index.
- Added local-development CORS for the Vite dev server.
- Replaced browser local-storage persistence with a typed frontend API client.
- Added loading, validation/API error, create, edit, follow/unfollow and delete states in Company Radar.

## API contract

Base path: `/api/v1/companies`

- `GET ?search=&followed=&priority=&page=1&pageSize=20` returns `{ items, page, pageSize, totalCount }`.
- `GET /{id}` returns one company.
- `POST /` creates a company and returns 201.
- `PUT /{id}` updates a company.
- `DELETE /{id}` deletes a company and returns 204.
- Duplicate Careers URLs return 409.
- Invalid input returns 400 validation details.

## Database setup

This repository does not include generated EF migration files yet. On a machine with the .NET 10 SDK and access to PostgreSQL, run from `src/backend/JobHunter.Api`:

```powershell
dotnet restore
dotnet tool install --global dotnet-ef --version 10.0.0
dotnet ef migrations add InitialCompanyRadar
dotnet ef database update
```

Commit the generated `Migrations` directory. If dotnet-ef 10 is already installed, use `dotnet tool update` rather than install.

Set `ASPNETCORE_ENVIRONMENT=Development`, `ASPNETCORE_URLS=http://localhost:5000` and `ConnectionStrings__DefaultConnection` in the process environment. Configure `VITE_API_BASE_URL=http://localhost:5000` in `src/frontend/.env.local`.

## Known limitations / not yet done

- No build or automated tests have been executed in this remote GitHub editing session.
- The initial EF migration must be generated locally and committed.
- Authentication/authorization is not implemented; do not expose the API publicly or store sensitive data.
- No automated ATS/career-page scans or notifications are included in this task.
- Company website metadata and job listings are not scraped; only URLs are stored at this stage.
