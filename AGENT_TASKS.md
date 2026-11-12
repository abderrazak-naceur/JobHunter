# Agent Tasks

## MVP — Career Management + Unified Job Search

- [ ] TASK-001 — Repository foundation, documentation and local infrastructure (no Docker)
- [ ] TASK-002 — Portfolio profile, experience, skills and projects (PostgreSQL + EF Core)
- [ ] TASK-003 — Admin dashboard shell, navigation and shared application layout
- [ ] TASK-004 — Unified Job Search Engine: multi-source search, filters, normalization, deduplication and source attribution
- [ ] TASK-005 — Opportunity tracking and application pipeline: statuses, events, notes and full history
- [ ] TASK-006 — Interview timeline, contacts, follow-ups, reminders and attachments
- [ ] TASK-007 — CV/document management and Job Description upload, extraction and structured analysis
- [ ] TASK-008 — AI career coach: CV/JD matching, skill gaps, cover letters and interview simulations
- [ ] TASK-009 — Academy: courses, lessons, learning materials and progress
- [ ] TASK-010 — Authentication, authorization, privacy and audit trail
- [ ] TASK-011 — Scheduled searches, new-job notifications and configurable search profiles
- [ ] TASK-012 — Additional job-source integrations through official APIs, feeds, ATS endpoints or other permitted methods
- [ ] TASK-013 — Employment & NASpI scenario checker: contract, probation, termination scenarios, contribution history and regulatory rule explanations
- [ ] TASK-014 — Company Radar: company directory, official Careers pages, ATS discovery, scheduled monitoring and company-level opportunity history
- [ ] TASK-016 — Company Radar PostgreSQL persistence and REST API (API, EF Core model and `InitialCompanyRadar` migration done; automated tests pending)

## 2026 Roadmap — Quality, reliability and growth

### Portfolio launch track (priority — product is branded "Portfolio", deployed on Render)

The product is split into a public single-page portfolio at `/` (no menu) used to apply for jobs, and a private admin area at `/admin` used to find jobs and track applications. TASK-036 (login) is done; before the first public deploy also rotate the local database password, which was committed in earlier history.

- [x] TASK-034 — Public one-page Portfolio at `/` (no menu): hero, skills, experience, projects, contacts, SEO meta tags; admin moved to `/admin`; rebrand from "JobHunter" to "Portfolio" in the UI. Content comes from `src/frontend/src/portfolio/content.ts` until TASK-035. Still to fill in by the owner: email, real experiences, CV link and the display name.
- [ ] TASK-035 — Portfolio content in PostgreSQL and editable from the admin area (profile, experience, skills, projects, contacts, CV link); public read-only endpoint exposing only fields marked public (replaces the static content file; builds on TASK-002)
- [x] TASK-036 — Single-user authentication for the admin area and API: JWT bearer, PBKDF2 password hash, login rate limiting, every endpoint protected unless it opts out, configurable CORS, secrets moved to user-secrets (subset of TASK-010). Follow-ups: refresh tokens / password change, security headers, audit trail of logins.
- [ ] TASK-037 — Render deployment: static site + web service + managed PostgreSQL, SPA rewrite for `/admin`, environment variables, CORS, `render.yaml` and a release checklist (extends TASK-033)
- [ ] TASK-038 — Application tracker in the admin area: save a job, status pipeline (Saved, Applied, Interview, Offer, Rejected), notes, source link and event history (TASK-005 first slice)

### Foundation and quality (Q4 2026)

- [x] TASK-017 — Automated test projects: xUnit for API (endpoints, validation, filtering, paging; in-memory SQLite) and Vitest + Testing Library for the frontend (API client and Company Radar). A test against real PostgreSQL (e.g. Testcontainers) is a possible follow-up.
- [x] TASK-018 — CI hardening: build, test, lint, format check and dependency vulnerability scan on every pull request; migration drift check. Dependabot enabled for NuGet, npm and GitHub Actions. Not yet verified on GitHub: the workflow has only been exercised locally, command by command.
- [ ] TASK-019 — API standardization: ProblemDetails errors, FluentValidation, consistent pagination/sorting, versioning and generated OpenAPI client for the frontend
- [ ] TASK-020 — Observability: structured logging (Serilog), correlation IDs, health checks for PostgreSQL and basic metrics
- [ ] TASK-021 — Secrets and configuration hygiene: user-secrets for local development, `.env.example` kept in sync, secret scanning in CI

### Product features (Q1 2027)

- [ ] TASK-022 — Dashboard analytics: applications per week, response rate, conversion by stage, time-in-stage and source effectiveness
- [ ] TASK-023 — Kanban pipeline view with drag and drop for application statuses
- [ ] TASK-024 — Email and calendar integration: import recruiter emails, interview events and ICS export (user-authorized, no credential storage in the repo)
- [ ] TASK-025 — Browser extension or bookmarklet to save a job posting into the pipeline with source URL
- [ ] TASK-026 — Salary and offer comparison: ranges, benefits, net estimate and side-by-side offer analysis
- [ ] TASK-027 — Data export and backup: JSON/CSV export, PostgreSQL backup script and restore documentation
- [ ] TASK-028 — Networking tracker: contacts, referrals, outreach history and follow-up cadence
- [ ] TASK-029 — Public portfolio page generated from the profile (opt-in, no private data exposed)

### Platform (Q2 2027)

- [ ] TASK-030 — Background job runner for scheduled searches and Company Radar scans (Hosted Services or Hangfire) with retries and run history
- [ ] TASK-031 — Accessibility and UX pass: keyboard navigation, contrast, responsive layouts, dark mode and empty/error/loading states
- [ ] TASK-032 — Internationalization: Italian and English UI with locale-aware dates and currency
- [ ] TASK-033 — Deployment guide: self-hosted setup on a single machine, environment configuration and upgrade/migration procedure

## Progress notes

- TASK-003: Preline dashboard foundation added to the frontend; navigation and shared layout still to be completed.
- TASK-014 / TASK-016: Company CRUD works through the .NET API and PostgreSQL. Career-page crawling, ATS discovery, scheduled scans and notifications are not implemented.
- TASK-017 added 26 backend and 21 frontend tests; TASK-016 can now be closed once the tests are merged.

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
