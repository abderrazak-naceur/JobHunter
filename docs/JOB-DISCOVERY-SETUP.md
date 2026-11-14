# Job Discovery — ricerca automatica offerte

Job Discovery is a private Admin workspace that searches public job feeds and company ATS boards from one screen, ranks vacancies against the saved search profile, and opens the original application page.

## Automatic sources

When the user selects **Cerca ora**, the API creates and queries the automatic sources that are available:

- **Arbeitnow Europe** — public job-board API, no API key required. The feed is updated hourly and includes jobs from multiple European ATS sources. One page is requested per manual search; the API's original job URL and source attribution are preserved.
- **Adzuna Italy** — official job-search API. Enable it by setting both \`JobDiscovery__Adzuna__AppId\` and \`JobDiscovery__Adzuna__AppKey\` in the API environment. The country code is \`it\`; queries use the saved role keywords and location.
- **Jooble Italy** — official REST API. Obtain a country-specific key from [it.jooble.org/api/about](https://it.jooble.org/api/about), then set \`JobDiscovery__Jooble__ApiKey\` in the API environment. Each country domain has its own key.

API credentials are read only by the backend and are never returned to the browser or written to PostgreSQL. If Adzuna or Jooble credentials are absent, those providers are simply not added to the automatic search.

## Optional company boards

The first increment also supports public company-board endpoints for:

- **Lever (global)** — \`GET https://api.lever.co/v0/postings/{site}?mode=json\`
- **Lever EU** — \`GET https://api.eu.lever.co/v0/postings/{site}?mode=json\`
- **Greenhouse** — \`GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true\`

These are optional company-specific sources. The user can add a source from **Aggiungi fonte** by entering the employer name and public board identifier. They are not required for the automatic search.

## Search profile

The initial profile is seeded from the career preferences:

- Roles: Senior .NET Developer, Full Stack Developer, Technical Lead
- Skills: C#, .NET, ASP.NET Core, React, Angular, SQL, PostgreSQL, Azure, Docker
- Location preference: Milano
- Minimum annual gross salary: €50,000
- Work mode: hybrid or fully remote

The profile can be edited from the Job Discovery page. Salary and work-mode filters are applied when a provider returns those fields. Unknown salary/work-mode data is retained rather than treated as a mismatch. Location currently contributes to the match score; a true 50 km geospatial filter is not included yet.

## Dates and attribution

- Publication dates are stored only when the provider exposes a reliable date.
- Source update time and first-seen/last-seen timestamps are kept separately.
- Every listing keeps its provider, source URL and application URL.
- Adzuna, Jooble and Arbeitnow remain identified as the original source; Adzuna results are labelled "Jobs by Adzuna".

## User flow

1. Open **Job Discovery** in the private Admin area.
2. Select **Cerca ora**; no manual company setup is required for the automatic providers.
3. Review the offers ranked against the saved profile and apply filters.
4. Select **Candidati sul sito** to open the original provider/employer page and complete the application there.
5. Select **Salva in Candidature** to keep the opportunity in the existing application pipeline.

Submitting the application remains a user-controlled action. Job Discovery does not collect credentials for job portals or submit applications automatically.

## Not included yet

- Recurring or scheduled searches and notifications (planned under TASK-030).
- Automatic company-board discovery for every employer.
- Global search across LinkedIn or Indeed. Their pages are not scraped; integrations require an official permitted API/feed.
- Cross-provider duplicate grouping.
- Geocoding and an exact 50 km radius filter.
- CV/JD semantic matching with an AI provider.

Add future providers behind the existing provider adapter. Provider failures remain isolated so one unavailable source does not block other sources.
