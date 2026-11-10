# Unified Job Search — MVP Scope

## Product goal

JobHunter provides one place to discover, compare, save and track job opportunities gathered from multiple permitted sources. The user should not need to repeat the same search manually across every job board.

## User journey

1. Define a search profile: keywords, role, location, radius, minimum salary, contract type, seniority and remote/hybrid/on-site preference.
2. Run a search against all enabled providers from one interface.
3. Receive normalized results with company, title, location, salary (when published), contract, description, source, original URL and publication/last-seen dates.
4. Filter, sort and compare results.
5. Review the match explanation and missing requirements against the user's profile/CV.
6. Save an opportunity, dismiss it, or open the original source.
7. When the user decides to apply, create an application record and track every subsequent stage and event.

## Provider integration strategy

Implement a provider adapter contract so each integration can be enabled, disabled, tested and rate-limited independently.

Priority order for the first MVP:
- Start with one or two providers that offer accessible, documented APIs and permit the intended use.
- Add additional aggregators and employer career/ATS sources after validating their API terms and coverage.
- Treat LinkedIn and other restricted platforms carefully: use only official/authorized integrations or user-initiated imports that comply with their terms. Do not scrape authenticated pages or bypass technical restrictions.

A source is not considered integrated until credentials/configuration, terms, rate limits, pagination, error handling and data attribution have been verified.

## Search and data quality

- Normalize provider results into a shared JobListing model.
- Preserve provider identifiers and original URLs.
- Detect duplicates using canonical URL, provider ID and conservative company/title/location matching.
- Keep source provenance when the same vacancy appears on multiple sites.
- Track first-seen, last-seen and source publication dates separately.
- Mark listings as stale/expired only when supported by provider data or a clearly defined freshness policy.
- Do not invent salary, contract or remote-work details when the source does not publish them.

## Suggested core entities

- SearchProfile: reusable search criteria and schedule.
- JobSource: provider configuration and enabled status (never store secrets in source control).
- JobListing: normalized opportunity.
- JobListingSource: mapping between a normalized listing and each provider's record.
- SearchRun: execution time, providers queried, counts and errors.
- SavedOpportunity: user's saved/dismissed state and notes.
- Application: user's application and current stage.
- ApplicationEvent: append-only history of status changes, contacts, messages and notes.
- FollowUp: next action, due date and completion state.
- Interview: interview date, type, participants, notes and outcome.

## MVP screens

- Unified Search: global query, filters, provider selection and results.
- Opportunity Detail: full description, source links, match explanation and actions.
- Saved Opportunities: shortlist and follow-up queue.
- Applications: pipeline/kanban and searchable table.
- Opportunity Timeline: complete chronological history.
- Search Profiles: saved criteria and scheduled-search preferences.

## Non-functional requirements

- Provider failures must not prevent results from other providers from appearing.
- Respect provider terms, robots/access restrictions where applicable, API quotas and rate limits.
- Use retries with backoff for transient errors and record provider-level diagnostics.
- Deduplicate results while preserving source links and provenance.
- Protect CVs, contact details and application history; keep the repository free of personal documents and credentials.
- Keep scheduled search optional and configurable; notifications must be controllable by the user.

## MVP definition of success

A user can perform one search across at least one verified provider, see correctly attributed normalized results, save an opportunity, and track an application from first contact through final outcome. Additional providers can be added without changing the core search and tracking workflow.
