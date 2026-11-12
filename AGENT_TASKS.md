# Agent Tasks

## MVP — Career Management + Unified Job Search

- [ ] TASK-001 — Repository foundation, documentation and local infrastructure (no Docker)
- [x] TASK-002 — Portfolio profile, experience, skills and projects (PostgreSQL + EF Core): done through TASK-035, TASK-041, TASK-043 and TASK-047.
- [x] TASK-003 — Admin dashboard shell, navigation and shared application layout: sidebar, dashboard, shadcn/ui components and toasts are in place (TASK-042, TASK-043, TASK-038).
- [ ] TASK-004 — Unified Job Search Engine: multi-source search, filters, normalization, deduplication and source attribution
- [x] TASK-005 — Opportunity tracking and application pipeline: statuses, history, notes, list and board views (TASK-038, TASK-023). Reminders and attachments stay in TASK-006.
- [ ] TASK-006 — Interview timeline, contacts, follow-ups, reminders and attachments
- [ ] TASK-007 — CV/document management and Job Description upload, extraction and structured analysis
- [ ] TASK-008 — AI career coach: CV/JD matching, skill gaps, cover letters and interview simulations
- [ ] TASK-009 — Academy: courses, lessons, learning materials and progress
- [ ] TASK-010 — Authentication, authorization, privacy and audit trail. Done: single-user login, protected API, password change (TASK-036, TASK-046). Still open: audit trail of logins and changes, security headers, refresh tokens, privacy/data-export tools.
- [ ] TASK-011 — Scheduled searches, new-job notifications and configurable search profiles
- [ ] TASK-012 — Additional job-source integrations through official APIs, feeds, ATS endpoints or other permitted methods
- [ ] TASK-013 — Employment & NASpI scenario checker: contract, probation, termination scenarios, contribution history and regulatory rule explanations
- [ ] TASK-014 — Company Radar: company directory, official Careers pages, ATS discovery, scheduled monitoring and company-level opportunity history
- [ ] TASK-016 — Company Radar PostgreSQL persistence and REST API (API, EF Core model and `InitialCompanyRadar` migration done; automated tests pending)

## 2026 Roadmap — Quality, reliability and growth

### Portfolio launch track (priority — product is branded "Portfolio", deployed on Render)

The product is split into a public single-page portfolio at `/` (no menu) used to apply for jobs, and a private admin area at `/admin` used to find jobs and track applications. TASK-036 (login) is done; before the first public deploy also rotate the local database password, which was committed in earlier history.

- [x] TASK-034 — Public one-page Portfolio at `/` (no menu): hero, skills, experience, projects, contacts, SEO meta tags; admin moved to `/admin`; rebrand from "JobHunter" to "Portfolio" in the UI. Content comes from `src/frontend/src/portfolio/content.ts` until TASK-035. Still to fill in by the owner: email, real experiences, CV link and the display name.
- [x] TASK-035 — Portfolio content in PostgreSQL and editable from the admin area ("Modifica portfolio"): profile, contacts, skills, experience, projects. `GET /api/v1/portfolio` is public and cacheable for 60 s, `PUT` requires the admin token and validates everything (http/https URLs only). The content is one JSON document in a single-row table (migration `AddPortfolioProfile`). The bundled `content.ts` is only an offline fallback. Run `dotnet ef database update` to create the table. Follow-ups: CV file upload (today a CV URL), preview before publishing, version history.
- [x] TASK-036 — Single-user authentication for the admin area and API: JWT bearer, PBKDF2 password hash, login rate limiting, every endpoint protected unless it opts out, configurable CORS, secrets moved to user-secrets (subset of TASK-010). Follow-ups: refresh tokens / password change, security headers, audit trail of logins.
- [ ] TASK-037 — Render deployment: static site + web service + managed PostgreSQL, SPA rewrite for `/admin`, environment variables, CORS, `render.yaml` and a release checklist (extends TASK-033)
- [x] TASK-038 — Application tracker in the admin area: save a job, stages (Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn), source and link, contact, salary, notes, next step with date, automatic status history, search, stage filter, paging and a dashboard with next steps (late ones highlighted). Migration AddJobApplications: run dotnet ef database update. Not yet done: reminders/notifications, attachments (TASK-006), import from job boards.

- [x] TASK-039 — Professional visual redesign of the public portfolio with Tailwind CSS: animated gradient hero with monogram and floating skills, overlapping "numbers" cards (editable from the admin, max 4), skills strip, skill cards with icons, experience timeline, project cards, contact banner, scroll progress bar and scroll-reveal animations (all disabled for users who prefer reduced motion). The public bundle only contains its own styles and is loaded only on `/`. Checked visually in headless Chrome at desktop and 390 px width (no horizontal overflow). Not yet done: dark mode, real project screenshots/images, Lighthouse accessibility audit.

- [x] TASK-040 — Portfolio visual redesign v2, inspired by the visual language of large telecom/retail sites (own colours, no brand assets): lavender page, bento hero (profile card + skills and projects teasers), very rounded cards with diagonal panels, round arrow buttons, sticky header with section links and a mobile "Menu", skills carousel (arrows, dots, swipe), deep-navy projects section with a featured banner and project tiles, royal-blue contact cards and a call-to-action strip. New optional profile photo (`photoUrl`, http/https only) with initials fallback. Checked in headless Chrome at 1440 px and 390 px (no horizontal overflow). Not yet done: dark mode, project images, Lighthouse audit.

- [x] TASK-041 — Real portfolio content and profile photo upload. The owner's CV (role, summary, skills by area, 10 professional experiences, 4 highlighted numbers, contact email) is the starting content in `content/portfolio.default.json`, shared by the API (embedded) and the website (fallback). New admin control to upload the photo (JPEG/PNG/WebP, max 2 MB, stored in PostgreSQL, type detected from the file, SVG refused) with preview and removal. Run `dotnet ef database update` (migration `AddPortfolioAssets`). Left out on purpose: date of birth and phone number. To check with the owner: the ENEL period was written as 01/2021 – 06/2021 because the CV says "01/2022 – 06/2021"; the SEFIN header says "until 06/2026" while the BMW Financial Services entry says "to today"; naming clients publicly may be subject to NDAs. Not yet done: education, certifications, training and languages as their own sections (today summarised in the text and numbers); CV upload (the CV PDF contains private data, publish a reduced version).
- [x] TASK-042 — UI libraries for richer motion and a consistent admin: Motion (count-up numbers, 3D tilt cards), Embla Carousel with Autoplay (drag, dots, pause button, never auto-starts for reduced motion), shadcn/ui components added to the admin (button, input, textarea, label, dialog, alert-dialog, badge, card, table, tabs, select, separator, checkbox) with the same colour tokens as the public site, plus Sonner for toasts. Tailwind remains the only styling system. Magic UI / Aceternity were not installed: the pointer spotlight is a small own component.

- [x] TASK-043 — Admin CRUD: the long portfolio form was replaced by tabs (Profile, Numbers, Skills, Experience, Projects, Links). Every item can be created, edited, deleted and reordered through shadcn/ui dialogs with confirmation; each change is published at once and the server messages are shown in the dialog. Mock admin pages (Overview, Academy, Administration) were removed; the new Overview shows real numbers. Not yet done: a preview before publishing, undo, drag-and-drop ordering.

- [x] TASK-044 — Public site fully fluid and responsive, using the whole screen: content width is edge to edge (capped only on ultra-wide monitors), the root text size grows from 16 px to about 21 px on large displays so text, spacing and cards scale together, the hero fills the first screen with a wide bento (large profile card + two teasers) over an animated background, an edge-to-edge moving skills strip, four numbers in one row, five skill cards in one row on large screens, experience with a sticky heading next to a wide timeline, fluid project and contact grids, a navy projects section with a rounded top, and a full footer (section links, contacts). Checked in a real Chrome driven over the DevTools protocol at 2560, 1920, 768 and 390 px: no horizontal overflow at any size, and content appears while scrolling. The count-up numbers always end on the real value (safety timer).

- [x] TASK-045 — Swagger UI for the API at `/swagger` (Development, or `Swagger__Enabled=true`): titled OpenAPI document, an Authorize button for the admin token, padlocks only on protected operations, token remembered across reloads. Tests check that the UI is served, that protected and public operations are marked correctly, and that nothing is exposed when it is off. Not yet done: request/response examples and per-field descriptions.

- [x] TASK-046 — Change the admin password from the app (Admin > Sicurezza). The new password is stored as a PBKDF2 hash in an `AdminAccounts` table and replaces the configured one; every older token stops working (tokens carry a fingerprint of the password hash), and the current session gets a fresh token. Rules: 12-256 characters, different from the current one and from the username, a wrong current password answers 400, same rate limit as login. Needs `dotnet ef database update` once (migration `AddAdminAccount`). Recovery if the password is forgotten: `DELETE FROM "AdminAccounts";` makes the configured credentials valid again.

- [x] TASK-047 — Education, certifications and languages: three new optional lists in the portfolio content (no migration, content is one JSON document; older saved content simply has them empty). Public site gets a "Formazione e lingue" section (also in the menu and footer), shown only when at least one list has entries; the admin gets the tabs Formazione, Certificazioni and Lingue with add/edit/delete/reorder. Server validation with limits (10 / 30 / 12 items). The bundled default content now lists the Master's degree in progress, AZ-900, AI-900 and four languages; the language levels there are a first guess to be corrected in the admin.

- [x] TASK-020 (partly) — Observability basics: `GET /health/ready` checks the database (503 without details when unreachable, reason goes to the log), and every response carries an `X-Correlation-Id` that is also in the log scope (a safe id sent by the caller is kept, anything else is replaced). Not done: Serilog / structured JSON logs and metrics.

- [x] TASK-023 — Board view of the applications (Candidature > Bacheca): one column per stage, move a card by dragging it onto another column or with the "Sposta" menu on the card (keyboard and touch friendly); a move saves the new stage and writes the status history like the list does. The board loads up to 100 applications and says so when there are more. Not done: ordering inside a column, a column-level "add" button.

- [x] TASK-022 — Dashboard analytics (Panoramica > Statistiche): applications sent per week (last 12 weeks, Monday start), response rate (answers = screening, interview or rejection after applying), funnel Applied > Screening > Interview > Offer with the conversion between stages (a skipped stage still counts), average days in each waiting stage (open stages count until today), and a ranking of sources by interviews and offers. `GET /api/v1/applications/analytics` computes everything in memory from the status history (a personal tracker is small); the rules live in `ApplicationAnalytics` and are unit-tested. Charts are plain HTML/CSS with text for screen readers, no chart library. Not done: custom date range, export.

- [x] TASK-021 — Secrets hygiene: a "Secret scan" CI job fails the build if a password is written in an `appsettings*.json`, if a local secrets file (`.env`, `.env.local`, `secrets.json`) is tracked, or if gitleaks finds a credential in the commits being added (older history is not rescanned, so the old database password that is still in history does not block CI; rotate it anyway). Local development already uses user-secrets and `.env.example` is in sync. Not verified: the workflow has not run on GitHub yet.

- [x] TASK-027 — Data export and backup: `GET /api/v1/export` (full JSON: portfolio, applications with history, companies) and `GET /api/v1/export/applications.csv` (UTF-8 with BOM; values that start with = + - @ are neutralised against spreadsheet formula injection). Both need the admin token and never include the admin account, hashes or keys. Buttons in Admin > Sicurezza > "Copia dei dati". `scripts/backup-db.ps1` takes a full `pg_dump` and keeps the newest 14 files; restore steps are in the README. Not verified: the script was only syntax-checked, `pg_dump` is not installed on this machine. Not done: import/restore from the JSON file.

- [x] TASK-028 — Contacts tracker (Contatti): recruiters, referrals, colleagues and others with company, role, email, phone, profile link, notes, date of the last contact and date to get back to them. List with search, filter by type, paging, create/edit/delete, late follow-ups highlighted and a reminder banner with how many are due. API `/api/v1/contacts` (+ `/summary`), migration `AddContacts` (run `dotnet ef database update`). Contacts are part of the JSON backup. Not done: link a contact to an application, a log of each conversation.

- [x] TASK-019 (partly) — Errors in one shape: every failure answers as `application/problem+json` with a `correlationId` (unexpected errors give no stack trace, SQL or paths; the details go to the log), also for unknown routes and empty 401/404/429 bodies. Validation errors keep the `errors` map per field. The admin shows the reference ("rif. ...") on server errors so it can be found in the log. Not done: FluentValidation (the hand-written validators are tested and consistent), API versioning beyond `/api/v1`, a generated OpenAPI client.

### Foundation and quality (Q4 2026)

- [x] TASK-017 — Automated test projects: xUnit for API (endpoints, validation, filtering, paging; in-memory SQLite) and Vitest + Testing Library for the frontend (API client and Company Radar). A test against real PostgreSQL (e.g. Testcontainers) is a possible follow-up.
- [x] TASK-018 — CI hardening: build, test, lint, format check and dependency vulnerability scan on every pull request; migration drift check. Dependabot enabled for NuGet, npm and GitHub Actions. Not yet verified on GitHub: the workflow has only been exercised locally, command by command.
- [ ] TASK-019 — API standardization, remaining part: FluentValidation, consistent sorting, a generated OpenAPI client. Error format is done (see "TASK-019 (partly)" above).
- [ ] TASK-020 — Observability, remaining part: structured logging (Serilog, JSON output) and basic metrics. Health checks and correlation ids are done (see "TASK-020 (partly)" above).
- [x] TASK-021 — Secrets and configuration hygiene: done, see the entry in the Portfolio launch track.

### Product features (Q1 2027)

- [x] TASK-022 — Dashboard analytics: done, see the entry in the Portfolio launch track.
- [x] TASK-023 — Kanban pipeline view: done, see the entry in the Portfolio launch track.
- [ ] TASK-024 — Email and calendar integration: import recruiter emails, interview events and ICS export (user-authorized, no credential storage in the repo)
- [ ] TASK-025 — Browser extension or bookmarklet to save a job posting into the pipeline with source URL
- [ ] TASK-026 — Salary and offer comparison: ranges, benefits, net estimate and side-by-side offer analysis
- [x] TASK-027 — Data export and backup: done, see the entry in the Portfolio launch track.
- [x] TASK-028 — Networking tracker: done, see the entry in the Portfolio launch track.
- [x] TASK-029 — Public portfolio page generated from the profile: done through TASK-034, TASK-035 and TASK-041. Only the public fields are published (no birth date, no phone).

### Platform (Q2 2027)

- [ ] TASK-030 — Background job runner for scheduled searches and Company Radar scans (Hosted Services or Hangfire) with retries and run history
- [ ] TASK-031 — Accessibility and UX pass: keyboard navigation, contrast, responsive layouts, dark mode and empty/error/loading states
- [ ] TASK-032 — Internationalization: Italian and English UI with locale-aware dates and currency
- [ ] TASK-033 — Deployment guide: self-hosted setup on a single machine, environment configuration and upgrade/migration procedure

## Progress notes

- TASK-003: the first Preline shell was replaced by Tailwind + shadcn/ui (TASK-042); navigation, dashboard and layout are complete.
- TASK-014 / TASK-016: Company CRUD works through the .NET API and PostgreSQL. Career-page crawling, ATS discovery, scheduled scans and notifications are not implemented.
- TASK-017 added 26 backend and 21 frontend tests; TASK-016 can now be closed once the tests are merged.

- TASK-046 to TASK-023 (this round): backend 221 tests and frontend 233 tests passing; `dotnet format`, ESLint, the production build and the migration drift check are clean. Not exercised in a real browser: the drag and drop on the board.
- Open items for the owner: apply new migrations with `dotnet ef database update` (the `AdminAccounts` table is needed for login), replace the temporary admin password from Sicurezza, rotate the old database password that is still in git history, upload the profile photo, correct the language levels in Portfolio > Lingue.
- Next suggested: TASK-019 (ProblemDetails, shared validation), TASK-021 (secret scanning in CI), TASK-027 (export and backup), TASK-028 (contacts), TASK-026 (offer comparison). TASK-037 (Render deploy) is intentionally last.

## Unified Job Search principles

- One search interface across all configured sources.
- Provider adapters keep each source integration isolated and replaceable.
- Prefer official APIs and permitted feeds; respect each provider's terms, rate limits and access restrictions.
- Never bypass authentication, paywalls, CAPTCHAs or anti-bot controls; do not implement prohibited scraping.
- Normalize results into one internal job format and preserve the original source and canonical URL.
- Deduplicate cross-posted jobs without deleting source attribution.
- Store search runs and seen jobs so users can track new, active, expired and previously viewed opportunities.
- Job matching is advisory; show why a job matches and which requirements are missing.
- Applying remains a user-controlled action unless a future integration explicitly supports authorized submission.

## MVP acceptance criteria

- A user can create and edit a professional profile and CV.
- A user can search configured providers from one screen and filter results.
- Every result identifies its source, original URL and last-seen date.
- Duplicate listings are grouped or identified while retaining all source links.
- A user can save an opportunity, mark it as applied, and track its status and event history.
- A user can record recruiter contacts, interviews, notes and next actions.
- Search and application data persist in PostgreSQL.
- No secrets, CVs or personal documents are committed to Git.
- The application runs locally without Docker.

## Definition of done

Build succeeds, relevant tests pass, API contracts are documented, configuration contains no secrets, and changes use feature branches and pull requests.
