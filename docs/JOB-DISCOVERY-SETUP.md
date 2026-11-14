# Job Discovery — first increment

Job Discovery is a private Admin workspace for collecting public vacancies from company ATS boards, ranking them against a saved search profile, and opening the original application page.

## Current scope

The first increment supports public board endpoints for:

- **Lever (global)** — `GET https://api.lever.co/v0/postings/{site}?mode=json`
- **Lever EU** — `GET https://api.eu.lever.co/v0/postings/{site}?mode=json`
- **Greenhouse** — `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`

These are company-board endpoints, not global job-search APIs. The user must configure each company's public board identifier. This release does not claim coverage of every employer or every job website.

## Configure a source

1. Sign in to `/admin` and open **Job Discovery**.
2. Select **Aggiungi fonte**.
3. Choose Lever or Greenhouse.
4. Enter the employer name and public board identifier.
5. Optionally enter the employer's Careers URL for reference.
6. Select **Cerca ora** to fetch and store the published postings.

For Lever, the identifier is the site slug in a URL such as `https://jobs.lever.co/{site}`. Select the global or EU provider according to the company's board region.
For Greenhouse, the identifier is the board token in a URL such as `https://boards.greenhouse.io/{board_token}`.

Only the slug/token is accepted as the board identifier. Arbitrary endpoint URLs are not accepted.

## Search profile

The initial profile is seeded from the current career preferences:

- Roles: Senior .NET Developer, Full Stack Developer, Technical Lead
- Skills: C#, .NET, ASP.NET Core, React, Angular, SQL, PostgreSQL, Azure, Docker
- Location preference: Milano
- Minimum annual gross salary: €50,000
- Work mode: hybrid or fully remote

The profile can be edited from the Job Discovery page. Location currently contributes to the match score; a true 50 km geospatial filter is not part of this increment. Salary and work-mode filters are applied when providers return those fields. Unknown salary/work-mode data is retained rather than treated as a mismatch.

## Dates and attribution

- `PublishedAt` is populated only when the provider exposes a reliable publication timestamp. Greenhouse's `first_published` is used when present.
- Lever's public board reference does not document a publication timestamp, so Lever offers are displayed with **Data non indicata dalla fonte** instead of deriving a date from an unverified field.
- `SourceUpdatedAt` is kept separately from the original publication date.
- `FirstSeenAt` and `LastSeenAt` record when JobHunter first and most recently collected a posting.
- Every listing keeps the provider, source URL, and application URL.

## User flow

- Review matches and their reasons.
- Open **Apri annuncio originale** to continue on the employer's own application page.
- Use **Aggiungi a Candidature** to create a `Saved` item in the existing application pipeline.
- Complete and submit the employer's application manually. Job Discovery does not submit applications automatically.

## Not included yet

- Recurring or scheduled searches and notifications (planned under TASK-030).
- Global search across all job boards, aggregators, LinkedIn, Indeed, or Glassdoor.
- More ATS connectors (for example Ashby, SmartRecruiters, Workable, Recruitee, Personio or Workday), subject to verification of their published APIs and permitted use.
- Cross-provider duplicate grouping.
- Geocoding and 50 km radius filtering.
- CV/JD semantic matching with an AI provider.

Add future providers behind the `IJobBoardClient` adapter contract. Provider failures must remain isolated so one unavailable board does not prevent other configured boards from being collected.