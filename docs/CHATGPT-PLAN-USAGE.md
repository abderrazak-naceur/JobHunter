# ChatGPT plan usage — JobHunter

## Goal

Allow the authenticated owner to request Blog CMS and AI Writer drafts using eligible ChatGPT plan usage, without putting a personal ChatGPT credential on Render and without introducing API metering charges.

## Current repository constraint

JobHunter is private. OpenAI documents plan-usage authorization for open-source apps and locally hosted apps, while private/remote applications require eligibility or approval as a selected client. A ChatGPT Go subscription alone does not issue an API key and does not automatically authorize a private hosted website to consume plan usage.

Official references (checked 19 November 2026):

- https://developers.openai.com/siwc/overview
- https://developers.openai.com/siwc/quickstart
- https://developers.openai.com/siwc/token-sharing-open-source
- https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt
- https://openai.com/policies/sign-in-with-chatgpt-terms/

## Target architecture

1. JobHunter remains hosted on Render and remains private.
2. The browser UI talks to a companion runtime running on the owner's Windows PC.
3. The companion runtime owns the OAuth flow, local token storage, refresh lifecycle and calls to the supported OpenAI plan-usage endpoint.
4. OAuth tokens never enter the JobHunter frontend bundle, Render API, PostgreSQL, logs, or application telemetry.
5. Requests are initiated by the authenticated owner, and the runtime only serves the local owner.
6. Existing server-side provider API integration remains available as a separate fallback.

## Security requirements for the companion runtime

- Bind only to loopback (127.0.0.1), never 0.0.0.0.
- Validate the browser Origin against an explicit allowlist (production JobHunter origin and local development origin).
- Require a per-session CSRF/nonce mechanism for state-changing requests; do not enable wildcard CORS.
- Keep OAuth tokens in OS-protected local storage; never return tokens to the browser.
- Use Authorization Code + PKCE and validate state, issuer, audience and redirect URI.
- Never proxy arbitrary URLs or expose a generic OpenAI API relay.
- Accept only the supported generation operation and the signed-in user's own request.
- Provide a disconnect/revoke action and clear local credentials on request.
- Do not call the plan-usage endpoint unless the required plan-usage scope was granted.

## Rollout phases

### Phase 1 — safe UI and architecture record (this change)

The Blog CMS explains why ChatGPT Go cannot be connected directly to Render and clearly marks the local connection as not yet connected. Existing API configuration and generation remain unchanged.

### Phase 2 — OAuth client eligibility

Obtain an eligible client registration/approval from OpenAI for the intended private application or choose to make the project genuinely open source and follow the applicable open-source registration process. Do not assume a client ID or scope.

### Phase 3 — Windows companion runtime

Implement and test the loopback-only companion app after the client registration and exact OAuth endpoints/scopes are confirmed. Do not ship placeholder OAuth endpoints or a fake connected state.

### Phase 4 — frontend bridge and end-to-end validation

Connect Blog CMS and AI Writer to the companion runtime, test generation and disconnect flows, and verify from network inspection that no personal token is sent to Render.

## Current status

- [x] Keep repository private.
- [x] Document the architecture and security boundary.
- [x] Explain the limitation in Blog CMS → Configurazione AI.
- [ ] Obtain OpenAI client eligibility/registration for this private use case.
- [ ] Implement Windows companion runtime with the approved OAuth configuration.
- [ ] Connect the frontend to the local runtime and add integration tests.
- [ ] Verify the complete flow on the owner's Windows PC.

No OAuth client ID, client secret, API key, token or Render environment variable is required or configured by this phase.
