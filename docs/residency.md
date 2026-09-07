# Regional residency

Architecture decision, 7 September 2026. This describes the intended boundary,
not a certification that every production resource has been verified. The
regional migration is still in progress.

## Decision

Keep Jori's existing providers, with the separately approved Bird replacement
for Resend. Deploy the same application to independently configured EU and US
instances. Region is a deployment property, not a tenant-specific branch in
every feature. Domain code sees one database and one integration of each kind.
Provider adapters resolve the credentials and endpoints at the boundary.

Customer selection determines the instance. IP geolocation may suggest an
initial choice, but does not move an existing tenant or override that choice.
Switching instances starts a fresh navigation; it does not copy authentication,
resource IDs, search parameters, or customer records to the other region.

| Resource | EU instance | US instance |
| --- | --- | --- |
| Application origin | `eu.usejori.com` | `us.usejori.com` |
| Vercel project | `jori-production-eu` | `jori-production-us` |
| Server rendering | Ireland, `dub1` | Virginia, `iad1` |
| Convex deployment | `production-eu` | `production-us` |
| Bird | EU organization and workspace | US organization and workspace |
| OpenRouter | EU-only workspace guardrail | US-only workspace guardrail |
| PostHog | EU Cloud project | US Cloud project |
| PostHog ingestion | `eu.i.posthog.com` | `us.i.posthog.com` |

No regional instance holds credentials that authorize access to the other
instance's customer records. OAuth registration credentials may be shared only
under the connected-integration decision below. No
cross-region database replication, analytics export, identity merge, or
automatic application failover is part of this design. Source code and public
assets are shared; customer records are not.

## Why separate frontend deployments

| Approach | Benefit | Cost or limitation |
| --- | --- | --- |
| One static frontend, regional APIs | One release artifact; public JS/CSS can be cached globally | Requires explicit runtime routing and credential-safe configuration; not sufficient for Jori's server rendering and auth proxy by itself |
| Separate regional Vercel projects, same source | Fixed backend and analytics destinations; isolated configuration and releases; fits the existing framework | Two deployment configurations; global Vercel infrastructure remains |
| One global app with a tenant-aware routing service | Seamless single hostname across regions | Shared routing/auth state and more security-sensitive infrastructure; unnecessary for explicitly detached Jori instances |
| Direct regional infrastructure | More control over ingress, logs, storage and backups | New infrastructure operations, contracts and release tooling; outside the chosen provider scope |

Choose separate Vercel projects. Vercel lets us pin function execution, while
static content is served through its global CDN. Regional function selection
does not create an EU-only contract for all Vercel platform data.
[Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region),
[Vercel compliance](https://vercel.com/docs/security/compliance).

## PostHog controls

Use different projects in different PostHog cloud regions, not two projects in
US Cloud. Each project has a distinct public token. Never put a personal API
key in a browser build. No production events from development, previews or the
public region selector. Use host-only analytics cookies and do not identify or
alias users across instances. A project token cannot prove its region by its
format; configuration review and a synthetic ingestion check must verify the
token/host pairing before release.
[PostHog projects](https://posthog.com/docs/settings/projects),
[SDK configuration](https://posthog.com/docs/libraries/js/config).

Keep exports and optional AI features off unless their destinations have been
reviewed. Review event properties and consent separately from hosting region.
Residency does not itself establish a lawful basis for tracking. PostHog offers
a self-serve DPA, including on the free plan; the company must sign it before
treating the generated agreement as binding.
[PostHog privacy guidance](https://posthog.com/docs/privacy).

## Exceptions and claim boundaries

The accepted global-edge exception is about processing location, not just
static asset storage. HTTPS edge services may process IP addresses, URLs,
headers, cookies and requests. Keep customer documents and prompts out of
frontend logs and unnecessary telemetry. Private responses must not enter a
shared CDN cache.

- Vercel's public terms permit transfers outside the selected function region.
  Do not claim that all platform metadata, operational logs and backups are
  region-bound. The DPA is broader than a CDN-only exception.
  [Vercel DPA](https://vercel.com/legal/dpa).
- PostHog lists regional AWS storage, database operations and execution, but
  also worldwide Cloudflare edge processing for data in transit. EU Cloud is
  not evidence that every optional feature or subprocessor is EU-only.
  [PostHog subprocessors](https://posthog.com/subprocessors).
- Stripe billing remains an acknowledged exception. Do not send product
  documents or prompts as billing metadata.
- E2B's current endpoint is an expressly accepted temporary exception. Sandbox
  execution can contain customer workloads, so this is more substantial than
  CDN metadata. The connection adapter supports later endpoint separation.
- Exa search uses its global API. Separate EU and US keys isolate access, not
  processing geography or the provider's team-level records. Search queries,
  requested URLs and fetched content can leave the selected region. The
  provider-neutral search adapter permits a later regional replacement.
  See [search configuration](search.md).
- Email delivery necessarily reaches recipient mail systems outside our
  control. Regional Bird configuration concerns the sending provider, not the
  recipient's geography or mailbox storage.
- Provider account administration, support and customer-enabled integrations
  require separate review. Regional application configuration does not change
  their contractual terms.

"Region-specific data residency" should name a precise covered dataset and
list exceptions in supporting documentation. Do not turn it into "all data
never leaves the selected region" or "EU sovereign." A headline can be brief;
the underlying scope must be accurate. Public wording is unchanged by this
migration. Legal review remains appropriate before making a contractual
customer commitment.

## Comparable published designs

Linear replicated its production stack by region while keeping routing and
authentication in a global service. Its design supports the principle of
keeping regional complexity out of domain code; Jori intentionally does not
adopt its shared customer identity service.
[Linear architecture](https://linear.app/now/how-we-built-multi-region-support-for-linear).

Sentry distinguishes regional event data from US account, integration and
operational metadata. This is an example of documented scope, not evidence
that all SaaS vendors share the same guarantees.
[Sentry storage locations](https://docs.sentry.io/organization/data-storage-location/).

Legora publishes separate EU and US core-provider tables. Its EU table lists
Linkup for search; Exa appears in the US table. Sana documents a default OAuth
app with optional customer-owned registrations. Lovable scopes region selection
to hosted Cloud projects. These examples support explicit product boundaries,
not a claim that every integration needs duplicate registrations. None reveals
the exact number of OAuth clients each company operates across regions.
[Legora subprocessors](https://legora.com/legal/eu-pre-approved-sub-processors),
[Sana OAuth](https://support.sana.ai/en/articles/265266-custom-oauth-app-for-integrations-guide),
[Lovable Cloud](https://docs.lovable.dev/features/cloud).

## Connected integrations

Keep customer tokens, connection records, OAuth state, imported content,
background jobs and Jori's webhook processing inside the selected instance.
The connected vendor's own processing remains subject to its terms. Once Jori
imports content, its origin does not exempt our copy from the regional boundary.

An OAuth registration identifies the application; it is not the customer token
store. Do not require a different client ID per region as a compliance rule.
Use a shared registration when it permits direct regional callbacks and event
delivery without sharing customer tokens or introducing a cross-region relay.
Keep development registrations separate from production.

Use separate production registrations when one app-wide webhook destination
would otherwise require a shared routing service, or an app credential can
authorize access to installations in both regions. This is an operational and
security choice. A separate registration alone does not regionalize a vendor.
Never send every event to both instances and filter it after receipt.

GitHub permits one webhook per app, and its app private key can authorize
installation access. Slack has one event request URL per app. Linear's
app-managed webhook also has one destination. Separate regional registrations
are the simpler fit for these integrations. Verify Notion's subscription
routing before choosing its registration layout. Retain the already configured
Google and Microsoft regional clients; do not create churn merely to consolidate
them. Customers use the same Connect flow in either instance.
[GitHub webhooks](https://docs.github.com/en/enterprise-cloud@latest/webhooks/using-webhooks/creating-webhooks),
[Slack event requests](https://docs.slack.dev/apis/events-api/using-http-request-urls),
[Linear manifests](https://linear.app/developers/oauth-app-manifests),
[Notion webhooks](https://developers.notion.com/reference/webhooks).

Google currently groups our regional OAuth clients in one Cloud project.
Revoking a user's grant can invalidate that user's tokens for every client in
the project. Distinct client IDs do not isolate this disconnect behavior. This
is vendor-side availability coupling, not shared Jori customer storage. Record
it in connection testing; independent revocation would require separate Google
projects, not a change to Jori's normalized integration interface.
[Google token revocation](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#tokenrevoke).

Do not introduce a global token store, installation directory or webhook relay
for this release. Revisit that architecture only when a concrete product need
outweighs its extra state, security boundary and operational work.

## Transactional email

Jori records submission to Bird, not delivery to the recipient. The regional
outbox retries interrupted or throttled submissions with a stable idempotency
key and stops before Bird's deduplication window expires. An ambiguous outcome
becomes `uncertain`, never an automatic fresh send.

Message content and the recipient address are removed when submission finishes
or retries close. Minimal submission records expire after 30 days. Bird owns
delivery logs, bounces, complaints and suppression management. Jori has no
email delivery webhook, duplicate event store or local suppression list.

## Release evidence

Before each region goes live, verify the deployed frontend region and backend
URL, matching provider workspace/project IDs, actual function placement,
host-only cookies, private-response cache headers, analytics request host and
synthetic event arrival, email acceptance and receipt, and
regional inference eligibility. Verify no global provider fallback exists.
Run `pnpm run check` and `pnpm run test` before merging. A configured project is
not a verified deployment.

Track dated configuration evidence and remaining checks in
[release verification](release.md). Do not use that operational checklist as a
contractual residency guarantee.
