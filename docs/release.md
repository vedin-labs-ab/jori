# Regional release verification

Last updated 7 September 2026. The migration has not been merged or deployed.
Provider configuration and direct API probes do not prove application E2E
operation. No production customer data was used in these probes.

## Verified configuration

| Provider | Evidence | Still required |
| --- | --- | --- |
| Convex | `production-eu` is `sensible-spoonbill-17` in Ireland; `production-us` is `insightful-goat-7` in Virginia. Separate deployment keys and auth secrets. Task preview schema/functions deployed successfully to `quixotic-raccoon-259`. | Shared dev/prod code deployment, complete integration variables, live app tests, preview cleanup |
| Vercel | Pro active; separate `jori-production-eu` and `jori-production-us` projects pinned to `dub1` and `iad1`, function failover off. Regional domains and ten public build variables checked. | Deploy checked main, verify actual function placement, redirects, private caching and host-only cookies |
| Bird | Separate EU/US organizations, workspaces and keys. Both sending domains verified. Direct regional sends returned 202 and both synthetic messages reached the test inbox. Tracking off; no Jori delivery webhook. | Isolated development workspace/key, app outbox and auth email tests, remove obsolete Resend configuration after cutover |
| OpenRouter | Business active; separate region-only workspace guardrails, ZDR on, training off. Both regions passed completion, structured output and tool-call probes. Direct Nano Banana image requests in both regions returned 404 at the data-region filter. | Deployed chat tests. Neither authenticated regional catalog offers image-output models under current guardrails. Verify regional Vertex BYOK support or configure direct Google regional image generation; no global fallback |
| PostHog | Separate EU Cloud and US Cloud projects and public tokens. IP discard enabled in both. US project renamed `jori-production-us`; session recording, console capture and network capture disabled and read back. | Finish remaining collection controls and EU project naming; verify synthetic ingestion and actual browser request destinations |
| Exa | Separate EU/US search keys installed only in matching Convex deployments; both returned 200 to a synthetic search. Development retains its own key. | Deployed tool test; global processing remains an accepted exception |
| E2B | Separate development, production EU and production US projects and keys installed. Account only offers `us-west-1`. | Build three templates, create/execute/delete sandboxes, verify cross-project access is rejected |
| Google | Separate regional OAuth clients, secrets and frontend/integration callbacks configured. | Verify Gmail/Calendar APIs and scopes, live sign-in and connections, consent-screen testing/verification restrictions |
| Microsoft | Separate organizational-account registrations and 180-day secrets installed. Three callbacks per region configured. Both have delegated User.Read, offline_access, Mail.ReadWrite, Mail.Send and Calendars.ReadWrite; no tenant-wide consent granted. | Live sign-in and connections, publisher verification; rotate secrets before 6 March 2027 |
| Stripe | Billing code rejects cross-region associations and unpaid checkout fulfillment. | Legal seller decision, correct Swedish merchant accounts, private activation and confirmed tax registrations, separate keys/products/prices/webhooks, live billing verification |
| GitHub, Slack, Linear, Notion | Regional session-bound OAuth callback code prepared. Shared OAuth registrations are permitted when direct regional callbacks and event routing preserve token/data isolation. | Provider-specific registration decision, credentials and event configuration, actual connection tests in both regions. Separate GitHub/Slack/Linear apps avoid a shared webhook relay; verify Notion routing before choosing |

## Task preview evidence

The EU task preview completed schema validation and function deployment on
7 September. Live HTTP probes returned 400 for an install without state, 401
for an unsigned GitHub event, and 404 for the removed Bird delivery webhook.
An unauthenticated OAuth callback redirected only to the configured task
frontend, with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
The handoff omitted an unapproved query parameter. These are ingress checks,
not proof of a completed customer OAuth connection.

Full checks and tests passed after correcting Node module resolution in the
template build script and removing the contradictory global US Vercel region.
The latest run passed 2,505 tests with four skipped. Template builds now read
their key, template name and optional endpoint from the selected Convex
deployment, without a remembered E2B CLI account fallback.

## Release gate

- Run full `pnpm run check` and `pnpm run test`; neither may be bypassed.
- Validate Convex schema and HTTP functions in a task preview, never a shared
  development or production deployment from a worktree.
- Commit, rebase onto current main, rerun both gates, then fast-forward main
  atomically and push it. Deploy only from checked main.
- Deploy development and both production regions. Confirm matching code
  revisions and environment destinations before exercising the application.
- Test sign-in, tenant isolation, email submission, analytics, chat, search,
  sandbox execution and cleanup, billing, and each connected integration.
- Delete only the two obsolete migration previews after they are no longer
  needed: `quixotic-raccoon-259` and `tremendous-ptarmigan-69`.
- Record deployment identifiers and test evidence here. Keep blocked or
  untested capabilities explicit; do not label the release fully verified.

## Scope

The supported target is scoped region-specific residency, not universal
regional processing. Vercel and PostHog edge/platform processing, Stripe,
Exa, current E2B execution, recipient mail systems and customer-connected
providers have the limitations described in [residency](residency.md).
No legal-seller changes, tax registrations, financial account activation or
global image-inference exception have been authorized by a resolved decision.
