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


## Employment & NASpI scenario checker (planned)

Purpose: help the user evaluate employment-offer and job-termination scenarios, including possible NASpI implications. This is an informational estimator, not a legal determination or guarantee of entitlement.

Important product rule: NASpI is an INPS benefit, not a benefit granted or denied by the employer. Do not store a simplistic company-level flag such as "company pays NASpI". Eligibility depends on the worker's individual contribution history and the legal circumstances of termination.

### Data to capture per employment opportunity

- Employer/company and job offer reference.
- Contract type (permanent, fixed-term, apprenticeship, etc.).
- Expected start date and any probation duration.
- Whether the user is currently employed or receiving NASpI.
- How the previous employment ended (dismissal, fixed-term expiry, voluntary resignation, resignation for just cause, other legally relevant case).
- Date of any voluntary resignation from a permanent employment relationship in the preceding 12 months.
- Contribution weeks accumulated between that voluntary termination and a possible subsequent involuntary termination.
- Potential end-of-contract scenario: employer termination during probation, employer dismissal after probation, fixed-term expiry, employee resignation, consensual termination or other event.
- Supporting documents and notes, stored privately and never committed to source control.

### Rule checks and output

- Check the general involuntary-unemployment requirement and the ordinary contribution requirement (at least 13 weeks in the four years before the unemployment event), subject to applicable statutory rules and exceptions.
- For unemployment events from 1 January 2025, check the additional 13-week contribution condition where the worker voluntarily terminated a permanent employment relationship in the preceding 12 months.
- Distinguish employer-initiated termination during probation from employee resignation during probation; do not treat them as equivalent.
- Explain that employer termination during probation can generally be an involuntary unemployment event, but the worker's full contribution and eligibility conditions still need verification.
- Display the legal rule, source link, date checked, missing information and confidence/limitations.
- Flag cases for review by INPS, a patronato or a qualified labour consultant.
- Never promise entitlement, calculate a definitive legal outcome from incomplete data, or present a startup/company attribute as determining NASpI eligibility.

### MVP interface

Add a section to each job opportunity named "Contratto e tutela NASpI" with:
- Contract and probation details.
- "What if the employer ends the contract during probation?" scenario.
- "What if the employer dismisses me after probation?" scenario.
- "What if I resign?" scenario.
- Personalized checklist of missing contribution/history information.
- Indicative result: "potentially eligible", "potential risk / extra condition to verify", or "not enough information"; always accompanied by an explanation and official INPS references.

### Official reference baseline

- INPS NASpI FAQ and requirements pages.
- INPS communication on the additional 13-week contribution requirement introduced from 1 January 2025 (Law 207/2024, Article 1, paragraph 171; INPS Circular 98/2025).

The rule set must be reviewed and updated when INPS guidance or legislation changes.


## Company Radar — official company career pages

### Goal

Discover opportunities published directly by employers, including vacancies that never appear on LinkedIn or general job boards. Company Careers pages are a first-class source in JobHunter, not merely links attached to aggregator results.

### Company discovery

- Maintain a directory of target employers with name, official domain, industry, location, size band (when known), careers URL and tracking status.
- Allow manual addition of a company or careers URL.
- Support curated company lists by sector, geography and technology stack.
- Discover ATS platforms and public job-board endpoints when identifiable.
- Do not assume every company uses an API or that every page can be indexed automatically.

### Career page connectors

Use this priority order:
1. Official public job-board APIs exposed by ATS platforms, when available and permitted (for example Greenhouse Job Board API and Lever Postings API).
2. Public structured job data embedded in career pages, including Schema.org JobPosting markup.
3. Public RSS/Atom feeds or documented employer feeds.
4. Limited page monitoring or parsing only where permitted by the website's terms and technical access rules; otherwise store the official Careers URL for manual review.

Each connector must retain the employer's official job URL, source type, last checked timestamp, last successful check, and connector health. Do not bypass logins, CAPTCHAs, anti-bot controls or access restrictions.

### Monitoring workflow

- User selects companies to follow.
- JobHunter checks supported career sources on a configurable schedule.
- Detect newly published, changed, removed or closed postings.
- Notify the user about new relevant jobs and material changes.
- Keep a company-level history of vacancies and source checks.
- Avoid duplicate jobs when the same vacancy appears on the employer site and external boards; preserve all source links and identify the employer's official posting as canonical where verified.

### Company Radar screens

- Company Directory: search, sector/location filters, target list and follow/unfollow.
- Company Profile: official website, Careers URL, locations, technologies, ATS/source type and monitoring health.
- Company Jobs: current vacancies published directly by that employer.
- Monitoring History: new, updated, closed vacancies and last checked status.
- Discovery Queue: suggested companies to review and add to the tracked list.

### Data model additions

- Company: employer identity and official domain.
- CompanyCareerSource: careers URL, connector type, ATS metadata, monitoring configuration and health.
- CompanyWatch: user/company tracking preferences.
- CompanyScanRun: check time, result counts, errors and duration.
- JobListingSource: associate each normalized job with its employer career page and any external reposts.

### Data quality and safeguards

- Distinguish verified facts from inferred company metadata.
- Never invent a vacancy or claim a page was checked if the scan failed.
- Record last checked and last successful scan separately.
- Respect robots/access restrictions, site terms, rate limits and privacy rules.
- Do not submit applications automatically; link to the employer's official application flow.
- Structured JobPosting fields are optional; missing salary, contract type or location must remain unknown rather than guessed.

### MVP acceptance criteria

- A user can add and follow a company by its official Careers URL.
- At least one supported ATS connector can import public vacancies from a verified company board.
- Results are searchable alongside job-board aggregator results in the unified search.
- A scheduled scan records new/changed/closed vacancies and reports connector failures.
- Every company vacancy links to its original official posting and displays its source and last-checked time.
