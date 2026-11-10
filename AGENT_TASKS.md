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
