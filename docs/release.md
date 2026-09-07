# Regional release verification

Last updated 7 September 2026. The migration was merged into `main` and pushed
at `1aafd8d7`. Post-rebase checks passed, with 2,505 tests passed and four
skipped. Development Convex deployment and skills sync completed from that
revision; production deployments remain pending. Provider configuration and
direct API probes do not prove application E2E operation. No production
customer data was used in these probes.

## Verified configuration

| Provider | Evidence | Still required |
| --- | --- | --- |
| Convex | `production-eu` is `sensible-spoonbill-17` in Ireland; `production-us` is `insightful-goat-7` in Virginia. Separate deployment keys and auth secrets. Task preview schema/functions deployed successfully to `quixotic-raccoon-259`. Development `trustworthy-parakeet-343` deployed from checked main. Production guard inventories are missing only the six Stripe variables in each region; development is missing the two Bird variables. | Production deployment, missing integration variables, live app tests, preview cleanup |
| Vercel | Pro active; separate `jori-production-eu` and `jori-production-us` projects pinned to `dub1` and `iad1`, function failover off. Regional domains and ten public build variables checked. | Deploy checked main, verify actual function placement, redirects, private caching and host-only cookies |
| Bird | Separate EU/US organizations, workspaces and keys. Both sending domains verified. Direct regional sends returned 202 and both synthetic messages reached the test inbox. Tracking off; no Jori delivery webhook. | Isolated development workspace/key, app outbox and auth email tests, remove obsolete Resend configuration after cutover |
| OpenRouter | Business active; separate region-only workspace guardrails, ZDR on, training off. Both regions passed completion, structured output and tool-call probes. Direct Nano Banana image requests in both regions returned 404 at the data-region filter. | Deployed chat tests. Neither authenticated regional catalog offers image-output models under current guardrails. Verify regional Vertex BYOK support or configure direct Google regional image generation; no global fallback |
| PostHog | Separate EU Cloud project `233772`, named `jori-production-eu`, and US Cloud project `530551`, named `jori-production-us`. IP discard enabled in both. Autocapture, web vitals, dead clicks and heatmaps disabled and read back in both; US session recording, console capture and network capture also disabled and read back. Synthetic regional events appeared only in their matching projects. | Verify actual frontend request destinations and browser collection behavior |
| Exa | Separate EU/US search keys installed only in matching Convex deployments; both returned 200 to a synthetic search. Development retains its own key. | Deployed tool test; global processing remains an accepted exception |
| E2B | Separate development, production EU and production US projects and keys installed. All three templates built; matching keys created sandboxes, executed a harmless command and deleted them. Both EU/US cross-project template access attempts were denied. Account only offers `us-west-1`. | Verify deployed Jori sandbox creation, execution and cleanup; US execution remains a documented exception |
| Google | Separate regional OAuth clients, secrets and frontend/integration callbacks configured. Project `jori-503709` consent scopes saved and read back to match current code; broad Drive, Calendar and `gmail.modify` scopes removed. Gmail and Calendar APIs confirmed enabled. Audience remains External/Testing, restricted to test users. | Live sign-in and connection tests; publishing and verification before general availability |
| Microsoft | Separate organizational-account registrations and 180-day secrets installed. Three callbacks per region configured. Both have delegated User.Read, offline_access, Mail.ReadWrite, Mail.Send and Calendars.ReadWrite; no tenant-wide consent granted. | Live sign-in and connections, publisher verification; rotate secrets before 6 March 2027 |
| Stripe | User confirmed Vedin Labs AB, Sweden, as seller for both Stripe accounts. Billing code rejects cross-region associations and unpaid checkout fulfillment. Subscription checkout already enables automatic tax; manual and automatic usage top-ups do not calculate tax. Runtime REST requests do not pin `Stripe-Version`. No Stripe objects or keys changed in this review. | User completes private activation, US-labelled account merchant-country correction and tax setup. Confirm tax classification and top-up treatment, align/test API versions, configure separate keys/products/prices/webhooks, and verify billing before live charging |
| GitHub, Slack, Linear, Notion | Regional session-bound OAuth callback code prepared. Shared OAuth registrations are permitted when direct regional callbacks and event routing preserve token/data isolation. Separate apps are the operational choice for webhook routing and permission isolation, not a universal residency requirement. Notion's documented subscription controls do not establish workspace-specific delivery filtering. | Create/configure regional apps and connections, credentials and events, then test actual connections in both regions. Use separate Notion connections unless provider confirmation establishes suitable filtering |

## Task preview evidence

The EU task preview completed schema validation and function deployment on
7 September. Live HTTP probes returned 400 for an install without state, 401
for an unsigned GitHub event, and 404 for the removed Bird delivery webhook.
An unauthenticated OAuth callback redirected only to the configured task
frontend, with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
The handoff omitted an unapproved query parameter. These are ingress checks,
not proof of a completed customer OAuth connection.

The checked migration corrected Node module resolution in the template build
script and removed the contradictory global US Vercel region. Template builds
read their key, template name and optional endpoint from the selected Convex
deployment, without a remembered E2B CLI account fallback.

## E2B verification evidence

All three template builds and direct sandbox lifecycle tests completed on
7 September using the matching Convex-stored E2B keys. The keys were confirmed
distinct and were not printed or written into the test sandboxes.

| Target | Template | Template ID | Test sandbox ID |
| --- | --- | --- | --- |
| Development | `jori-development` | `lo6gsdaexh5bx9kqj09f` | `ijfo3g775su19sz58a0fc` |
| Production EU | `jori-production-eu` | `3yhphavw0jehrhkeancq` | `isf0vfy8krdxli1mdj7ra` |
| Production US | `jori-production-us` | `qerfoeuzxp0pa8hcp1g9` | `i651y9ljbj37kok58u36j` |

Each sandbox ran `node --version && pwd` in `/home/user/workspace`, returned
Node `v26.3.0`, the expected directory, exit code zero and empty stderr.
Each deletion returned `true`; subsequent running checks returned `false`.
The EU key could not create the US template by ID, and the US key could not
create the EU template by ID. Neither denied request created a sandbox.
These tests verify provider configuration, not the deployed Jori workflow.

## PostHog verification evidence

The synthetic event `jori_residency_verification_20260907` was observed in the
EU project `233772` and US project `530551` event lists, with each region's
probe appearing only in its matching project. This verifies synthetic
ingestion and project separation. Requests from the actual deployed frontend
remain unverified.

## Deployment prerequisites

Both production guard inventories are missing `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER_MONTH`,
`STRIPE_PRICE_STARTER_YEAR`, `STRIPE_PRICE_TEAM_MONTH` and
`STRIPE_PRICE_TEAM_YEAR`. All other names in the production guard were present;
presence alone does not prove that an integration works. Development is
missing `BIRD_API_KEY` and `BIRD_WORKSPACE_ID`.

Google project `jori-503709` now lists exactly `openid`, `userinfo.email`,
`userinfo.profile`, `gmail.readonly`, `gmail.compose`, `gmail.send`,
`calendar.events` and `calendar.calendarlist.readonly` in its saved consent
configuration. Gmail API `gmail.googleapis.com` and Calendar API
`calendar-json.googleapis.com` were already enabled and were verified by
readback. This does not establish completed OAuth connections or approval
for users outside the consent screen's test-user list.

The Stripe seller decision is resolved. Both accounts must represent Vedin
Labs AB in Sweden; the US instance label is not a US merchant-country choice.
Private activation, merchant-country correction and tax setup remain deferred
to the user. The user or their adviser must select the applicable tax
classification and confirm registrations; no tax code has been assumed.
The existing subscription checkout uses `automatic_tax`, so those registrations
must be verified. Manual and automatic usage top-ups currently do not calculate
tax, and their treatment must be resolved before live charging. Runtime Stripe
REST requests omit `Stripe-Version`; account and webhook API versions must be
aligned and tested before launch. These are billing readiness findings, not a
completed billing rewrite or changes to Stripe objects or keys.

For Notion, the documented subscription controls specify a connection, webhook
URL and event types. Event payloads include `workspace_id` and
`subscription_id`, but those fields do not establish pre-delivery filtering.
Separate regional public connections are therefore the recommended setup
unless Notion confirms suitable filters. This is not a claim that cross-region
broadcast delivery has been observed. See Notion's
[webhook reference](https://developers.notion.com/reference/webhooks) and
[event delivery documentation](https://developers.notion.com/reference/webhooks-events-delivery).

## Development deployment evidence

`pnpm deploy:dev` completed successfully from clean main `1aafd8d7` using
Convex CLI `1.45.0`. Checks passed, `trustworthy-parakeet-343` reported functions
ready at 17:18:35 on 7 September, and skills sync completed without errors.
Live HTTP probes returned 400 for `/github/install` without state and 404 for
the removed `/email/events` webhook. These are ingress checks, not completed
integration flows. Development email remains unverified because its Bird
variables are missing. The command deploys Convex and skills, not a hosted
development frontend.

The outdated Convex CLI `1.42.3` watcher was stopped. A replacement watcher
using `1.45.0` reported ready at 17:21:40. Unused `CONVEX_URL` and
`CONVEX_SITE_URL` aliases were removed only from ignored local development
configuration; current code uses the `VITE_` equivalents. Backend platform
variables were unchanged, and the primary checkout remained clean.

## Release gate

- Run full `pnpm run check` and `pnpm run test`; neither may be bypassed.
- Validate Convex schema and HTTP functions in a task preview, never a shared
  development or production deployment from a worktree.
- The migration was rebased, checked, fast-forwarded into main and pushed at
  `1aafd8d7`. Deploy only from checked main; repeat these gates for later changes.
- Development Convex and skills are deployed. Deploy both production regions
  and confirm matching code revisions and environment destinations before
  exercising the application.
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
The seller is confirmed as Vedin Labs AB, Sweden, for both Stripe accounts.
Private activation, merchant-country correction and tax setup remain with the
user. No global image-inference exception has been authorized.
