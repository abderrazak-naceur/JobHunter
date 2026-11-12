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
