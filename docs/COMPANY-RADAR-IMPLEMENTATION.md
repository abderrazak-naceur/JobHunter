# Company Radar — implementation status

## Implemented in this branch

- Added a Company Radar entry to the application navigation.
- Added a responsive Company Radar screen.
- Added a form to register a target company with official website, Careers URL, location, sector, technologies, priority and notes.
- Added text search across company name, location, sector and technologies.
- Added follow/unfollow and delete actions.
- Saved the target-company list in browser local storage so it survives refreshes in the same browser profile.

## Important limitations of this first UI increment

- This is a frontend prototype; company records are not yet persisted in PostgreSQL or synchronized across devices.
- No automatic Careers-page scanning is active yet.
- No ATS connectors or job-source APIs are connected yet.
- "Offerte rilevate" intentionally displays an unavailable placeholder rather than a fabricated count.
- A company marked as followed is a user-managed watchlist entry, not proof that automated monitoring is running.

## Next implementation steps

1. Add Company and CompanyCareerSource entities to the backend and persist them in PostgreSQL using EF Core migrations.
2. Add authenticated CRUD endpoints and connect the React screen to the API.
3. Implement a provider adapter for a verified public ATS job board (start with a documented Greenhouse or Lever board API, subject to provider terms).
4. Add scan history, new/updated/closed vacancy detection and provider health reporting.
5. Add scheduled scans and user-controlled notifications.
6. Merge source jobs into Unified Job Search while retaining canonical employer links and source attribution.

## Verification

The GitHub file changes have been committed, but a local TypeScript/Vite build has not been run in this environment. Run `npm install` and `npm run build` in `src/frontend` before merging.
