# Regional release verification

Last updated 8 September 2026. Final runtime `2c7e7ccd` is deployed to
development and both production regions. Core regional workflows passed the
checks below; customer-connected integrations and billing are not yet fully
verified. Provider setup, direct API tests and completed application workflows
are recorded separately. Checks used synthetic data unless stated otherwise.

## Deployment state

| Target | Verified deployment | Remaining work |
| --- | --- | --- |
| Development | Convex `trustworthy-parakeet-343` and skills deployed from `2c7e7ccd`; Convex reported ready at 00:49:36 local time. Bird and Vertex settings verified. | Remaining connected-provider workflows. `deploy:dev` does not deploy a hosted frontend. |
| Production EU | Full `2c7e7ccd` deployment and skills sync completed; Vercel deployment `jori-production-6bhrxc7f5-albin-vedins-projects.vercel.app` aliased to `eu.usejori.com`. Convex is `sensible-spoonbill-17` in Ireland. Regional frontend returned 200 with the `dub1` function region. | Remaining connected-provider workflows. |
| Production US | Full `2c7e7ccd` deployment completed; Vercel deployment `jori-production-6ga4f684s-albin-vedins-projects.vercel.app`. Convex is `insightful-goat-7` in Virginia, with strict schema and completed preservation repair. Fresh organization onboarding passed without reload or errors. | Remaining connected-provider workflows. |

The US repair renamed `link.linkedAt` to `link.at` on two identities and
`associatedIntegrations` to `surfaces` on four global skills. Private
full-document comparison confirmed unchanged IDs, creation times, timestamps
and all other content. Dry-run made no changes; the transaction succeeded;
repeat execution was a no-op. Main `011d5994` removes every temporary
validator, compatibility reader and migration function. Both backends now
include that strict cleanup. Normal deployment unmounted obsolete Resend
components and removed old indexes; the repair deleted no application records.
Unused `JORI_WORKER_SECRET` settings were removed from development, US
production and local configuration after confirming no code references.
Unused `RESEND_API_KEY` settings were removed from development and US
production. Names-only readback found no remaining `RESEND_*` settings in any
Convex target or matching ignored local file. Two migration-only generated
API stashes were removed after review; the unrelated mirror-work stash remains.

With explicit user approval, three obsolete Resend DNS records were deleted:
the `send.mail.usejori.com` MX pointing to
`feedback-smtp.us-east-1.amazonses.com`, its SPF TXT containing
`include:amazonses.com`, and `resend._domainkey.mail.usejori.com` TXT.
All had TTL 600. Porkbun's record count changed from 23 to 20; dashboard and
DNS readback found none of those records. Bird's regional DKIM and bounce
records and Zoho's three apex MX records were retained. No other DNS changed.
Restoration would require recreating the removed records.

## Provider readiness

| Provider | Verified evidence | Remaining work or limits |
| --- | --- | --- |
| Convex | Separate production deployments, deploy keys and auth secrets. Required production variable names present; optional Stripe configuration absent. All three final deployments, US preservation, onboarding and preview cleanup completed. | Variable presence alone does not prove an untested integration works. |
| Vercel | Pro active; separate projects pinned to `dub1`/`iad1`, failover off. Both final production deployments completed. Regional hosts/sign-in resolve; marketing/trust stay public. Regional redirects passed with private/no-store, no-referrer and a secure host-only region cookie. Trust redirects strip the test query. | Global CDN/control-plane processing remains an exception. |
| Bird | Separate EU, US and development accounts/workspaces and scoped keys. Sending domains verified. Direct and actual dev/EU/US outbox tests reached the Zoho inbox. All application submissions were accepted on attempt one and removed retained bodies; both waitlist confirmations also arrived. Tracking off; no Jori delivery webhook. Temporary grants and obsolete Resend settings removed. | Remaining auth email templates/flows. These tests do not guarantee delivery to every recipient. |
| OpenRouter | Business active; separate region-only guardrails, ZDR on, training off. Direct completion/structured-output/tool-call probes and actual EU/US chat passed. Deployed Exa and sandbox tools completed in both regions. Region-filtered images returned 404; images now use Google Cloud. | Upstream capacity errors remain possible; one US image run received 429 before Vertex. No global inference fallback. |
| Google Cloud images | Separate EU/US/development projects, predict-only service accounts and credentials. Billing active and implicit caching disabled. Adapter PNG tests passed in each jurisdiction; cross-project IAM probes returned 403. Actual EU/US image generation, storage, import and accounting passed; US sandbox bytes matched regional storage. | Provider safety filters remain enabled and may withhold output. |
| PostHog | Separate EU project `233772` and US project `530551`. Actual EU `/chat` and US `/integrations` browser pageviews observed in matching project UIs; EU/US device and session IDs distinct. Served console bundles contain matching regional hosts/tokens and minimized pageviews. New cookies are host-only; marketing uses the US project. | Preserve metadata/edge exceptions. Legacy US apex-cookie identity was not reset. |
| Exa | Separate EU/US keys; direct searches returned 200. Actual EU and US runs completed `web_search` with provider Exa. Development retains its own key. | Global processing remains an exception behind the regional interface. |
| E2B | Separate development/EU/US projects and keys. Direct template/lifecycle tests passed and opposite-region template access was denied. Actual EU/US runs completed sandbox `bash`; EU image tool completed file import and its sandbox was cleaned up. Account offers only `us-west-1`. | US execution remains an exception for EU tenants. |
| Google | Separate regional clients, secrets and callbacks. Saved consent scopes match code; Gmail/Calendar APIs enabled. Actual EU/US Google sign-in succeeded through regional clients. Fresh organization onboarding passed without reload/errors in both regions; the same user's regional organization lists differed as expected. | Both regions' Gmail/Calendar connections. Audience remains External/Testing; publishing/verification required before general availability. |
| Microsoft | Separate organizational-account registrations and 180-day secrets installed. Three callbacks per region; delegated User.Read, offline_access, Mail.ReadWrite, Mail.Send and Calendars.ReadWrite. No tenant-wide consent granted. | Live sign-in/connections, publisher verification and rotation before 6 March 2027. |
| Stripe | Both accounts must represent Vedin Labs AB, Sweden. Regional association and paid-checkout guards implemented. Missing settings disable billing without blocking prelaunch deployment. | User activation, merchant-country correction and tax decisions; then separate keys/products/prices/webhooks and billing verification. |
| GitHub | Separate apps and credentials; JWT identity, exact permissions/events and regional webhook settings verified. Real ping redelivery returned 200 in both regions. Own signatures accepted; missing, bad and opposite-region signatures rejected. | Authenticated installation, OAuth installation-access proof and connected repository workflows. Inert pings do not establish these. |
| Slack | Separate apps with token rotation and regional callbacks/interactivity; credentials read back. Both event URLs, five bot events and public distribution verified. | Both regions' authenticated connections, rotation, interactivity and event workflows. |
| Linear | Separate public apps and direct regional webhooks; client-credentials grant disabled. Matching client/webhook credentials read back. | Actual OAuth connections and webhook processing. |
| Notion | Separate public connections, regional callbacks and active subscriptions. Both user-approved OAuth connections are active with distinct access/refresh tokens and bots. Page metadata reads, exactly one comment per region and signed comment webhook reception passed on the one authorized page. Own signatures accepted; missing/bad/opposite-region signatures rejected. No user-information capability. | Page-body reads exposed upstream optional-tool-field normalization. Explicit `strict: false` passed a synthetic A/B probe; deploy and retest actual regional page-body reads. Other Notion workflows remain untested. |

## Email and image evidence

Development Bird now has its own workspace
`ws_01m1yv53keey7a6hr6efc1gxdk` and a runtime key limited to `emails:write`
and `workspace:read`. Verified `mail.usejori.com` uses selector
`bird-354-0926` and `bounce-dev.mail` pointing to `us1.bounce.bird.com`.
This replaces the blocked attempt to add a workspace to the US production
organization. No paid upgrade was needed. The development test message
arrived in the Zoho inbox; the temporary setup grant was revoked.

Actual adapter tests used matching environment settings and
`aiplatform.eu.rep.googleapis.com` or `aiplatform.us.rep.googleapis.com`:

| Target | PNG bytes | Input/output tokens | Priced usage, USD micros |
| --- | --- | --- | --- |
| Production EU | 1,139,040 | 14 / 1,120 | 73,928 |
| Production US | 1,126,817 | 14 / 1,120 | 73,928 |
| Development, US jurisdiction | 28,240 | 26 / 1,120 | 73,935 |

Production responses had valid request IDs. The EU service account requesting
the US project and the US service account requesting the EU project each
received 403. Negative probes requested text only, not images.

Development billing was enabled after the user approved unlinking billing
from `milo-498910`; the Milo project was not deleted. No quota-increase form
was submitted. Development's three Vertex values were stored only in its
Convex deployment and verified by readback. Cache PATCH and GET returned 200
with `disableCache: true`.
After setup, the three temporary service-account JSON copies were deleted and
the temporary gcloud user authorization was revoked; its account list was
empty on readback. Runtime keys remain in matching Convex deployments.
User-downloaded GitHub private-key files were not changed.

The table records adapter/provider tests. A subsequent actual EU
`generate_image` run completed and stored a 612,096-byte image. Read-only
inspection found exactly one usage receipt for its Vertex request, with 58
input tokens, 1,120 output tokens and 73,952 USD micros. The image usage rollup
matched exactly. The complete run cost 306,251 micros, including ordinary
model turns; the verification organization's debit and usage rollup totals
both equaled 360,877 micros. File metadata and storage size agreed.

The completed EU image tool included file import; its sandbox was subsequently
cleaned up. File metadata and stored bytes agreed, and transport unit tests
also cover a 6 MiB file and ownership checks. An original US illustration
subsequently succeeded through the application and rendered in the browser.
Its 1,804,856-byte regional file and existing sandbox copy matched exactly by
size and SHA-256. Exactly one Vertex receipt recorded 88 input tokens, 1,120
output tokens and 73,969 micros. The complete run debit was 312,615 micros,
including chat turns. The daily image rollup matched the blocked and successful
receipts; the organization's debit and usage totals both equaled 615,465
micros. The scheduled sandbox cleanup succeeded at normal expiry, and the
record was marked cleaned without error 243 ms later.

Earlier US tests included an upstream OpenRouter 429 and Vertex responses with
usage but no usable image. Content-free diagnostics on `2c7e7ccd` identified
`IMAGE_RECITATION` with missing content parts: Google withheld that output.
This was not evidence of a parser or regional-routing failure. The successful
retry used a distinct original illustration; no provider filter was disabled.
Filtered requests still produced usage receipts. See
[image configuration and retention](images.md).

Both public waitlist forms succeeded. The exact synthetic EU and US addresses
each appeared once in their selected region's database and not in the opposite
database. Each signup had exactly one outbox row at the same transaction
timestamp. Both were accepted in the correct region on attempt one, with a
provider ID and no retained body. This verifies public-form routing, database
isolation and confirmation submission. Subsequent native Zoho inbox inspection
also confirmed both waitlist emails and all three application outbox tests.

Actual PostHog project UIs showed a US `/integrations` pageview at
`2026-09-07T22:34:48.675Z` and an EU `/chat` pageview at
`2026-09-07T22:36:43.139Z`, matching the browser tests. Payloads had no full URL,
email, organization ID or customer content; person processing was false.
EU/US pseudonymous IDs were distinct. PostHog still added GeoIP city/country
and approximate coordinates despite IP discard, so this is not anonymous or
zero-retention analytics. A legacy apex-domain US cookie appeared to seed the
same US device ID across marketing and console; new code uses host-only
cookies, but no reset of legacy IDs is claimed.

## Connected app and ingress evidence

OAuth registrations and event destinations belong to their matching region.
No shared relay or cross-region fanout was added. Existing development app
registrations were retained; production setup does not verify them.

GitHub requests Contents, Issues and Pull requests read/write plus Metadata
read-only, with only `issues`, `issue_comment`, `pull_request`,
`pull_request_review_comment` and `push` events. Both apps expire user tokens
and allow installation by any account. OAuth during installation is disabled;
Jori's separate OAuth step proves installation access before linking an
organization. Regional webhook URLs, JSON content and TLS verification were
read back successfully.

Real GitHub ping redeliveries returned 200 in both regions. Synthetic
own-secret pings returned 200; missing, invalid and opposite-region signatures
returned 401. Both regions rejected unsigned Slack, Linear and Notion events
with 401. Unconfigured `/stripe/events` returned 503; removed `/email/events`
returned 404. All eight install routes rejected missing state with 400.
GitHub, Google and Microsoft email callback probes redirected only to the
matching frontend handoff with `no-store` and `no-referrer`. No completed
customer integration is implied by these ingress checks.

After Notion activation, an unsupported synthetic event returned 200 with its
own token and 401 with a missing, invalid or opposite-region token in each
deployment. Tokens are distinct; both `notionWebhookSetups` tables were empty.
The actual US application outbox test to `albin@usejori.com` was accepted on
attempt one, recorded a provider ID and removed its message body. No invitation
or access grant was created.

Both Slack apps saved `app_mention`, `message.channels`, `message.groups`,
`message.im` and `message.mpim`. Linear subscribes only to Comments, Issues,
Projects and Inbox notifications. Notion permits content read/update/insert
and comment read/insert, without user information. Both Notion subscriptions
are active on API version `2026-03-11` with `page.content_updated`,
`page.properties_updated` and `comment.created`. Bootstrap records were cleared
after verified tokens were stored in their matching regional deployments.

The user subsequently authorized only "The Moonlit Registry of Pickle Jar
Thunder", page `38f23f2d-e283-81d9-a6e1-ee4f1e1b6a74`, in both verification
organizations. Both connections are active. Access tokens, refresh tokens,
bot IDs, client IDs, client secrets and webhook verification tokens were
compared privately and are distinct between regions. No tokens or page bodies
were copied into this report.

Both application runs read that page's metadata and each created exactly one
synthetic comment. The EU comment is
`3d523f2d-e283-81b6-914e-001da53d67ce`; the US comment is
`3d523f2d-e283-817e-bd8c-001d8d383465`. Each regional subscription delivered
the other bot's comment to its own regional backend. The code ignores its own
bot's events. This is expected for the same external page explicitly shared
with both connections; it is not a shared Jori credential or database.

Page-body reads failed because generated tool calls supplied invented
`start_cursor` values, including after explicit instructions to omit the
optional field. The local schema requires only `blockId`. A synthetic US
OpenRouter probe used the production Sol model, Azure provider and unchanged
regional/ZDR/data-collection restrictions. With `strict` omitted it emitted
an unwanted empty cursor; with `strict: false` it emitted only `blockId`.
The shared model adapter now sets `strict: false` explicitly. This preserves
the existing optional-field contract instead of changing every vendor schema
or treating invalid cursor values as absent. OpenAI documents that Responses
can normalize schemas into strict mode when the flag is omitted, unlike Chat
Completions. The observed provider behavior is consistent with such a bridge.
[Official function-calling guidance](https://developers.openai.com/api/docs/guides/function-calling#strict-mode).
Actual EU/US page-body retests after deployment remain pending.

Google's saved consent scopes are `openid`, `userinfo.email`,
`userinfo.profile`, `gmail.readonly`, `gmail.compose`, `gmail.send`,
`calendar.events` and `calendar.calendarlist.readonly`. Broad Drive, Calendar
and `gmail.modify` scopes were removed. EU sign-in and organization creation
succeeded. A transient root-page error immediately after creation cleared on
reload. The identity-initialization guard was subsequently deployed at
`bd70a00b`; fresh organization creation passed in both regions without reload
or console errors, including the Welcome modal. The same signed-in user's
account menus showed separate regional organization lists. An actual EU chat
prompt, `Reply exactly
EU chat verified`, returned the requested response. US Google sign-in, chat,
Exa search and sandbox execution also passed. Customer-connected provider
consent and workflows remain separate, unfinished checks.

## Prelaunch and billing gate

The user approved deployment without completed billing. Production still
lacks optional `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_STARTER_MONTH`, `STRIPE_PRICE_STARTER_YEAR`,
`STRIPE_PRICE_TEAM_MONTH` and `STRIPE_PRICE_TEAM_YEAR`. Billing actions fail
before creating accounts or customers when configuration is incomplete; the
transport cannot initiate charges. Read-only billing and trial metering
remain available. No global image fallback is authorized.

The access gate is server-side. Better Auth checks the regional allowlist
before organization creation; billing requires the authenticated session's
matching organization claim. Waitlist enrollment does not grant access.
Existing members and invited users can access their organization; removing
an allowlist entry does not revoke membership. The landing page is not an
API gate.

Before live charging, the user must complete Stripe activation and ensure
both accounts represent Vedin Labs AB in Sweden. A US instance label does
not change the merchant's country. Tax classification and registrations
require the user or their adviser. Subscription checkout uses
`automatic_tax`; manual and automatic usage top-ups do not currently
calculate tax. Runtime REST requests omit `Stripe-Version`, so account/webhook
API versions and top-up tax treatment must be aligned and tested. No Stripe
objects or keys were changed in this verification work.

## Preview cleanup

The four confirmed preview deployments `quixotic-raccoon-259`,
`tremendous-ptarmigan-69`, `superb-ocelot-84` and `bold-donkey-387` were removed
through the official management API. Each deletion returned 200 and readback
returned 404. The final project listing contained only development,
production EU and production US. No named deploy keys existed for those
previews; no global keys were changed. No new backups were created, so preview
data and files should be treated as permanently deleted. Source code remains
recoverable from Git.

## Remaining launch work

Runtime deployment, preview cleanup and both regional image workflows are
complete. Full `pnpm run check` and `pnpm run test` passed on the final runtime
base, with 2,616 tests passed and four skipped. Documentation-only changes do
not require another runtime deployment.

- Complete authenticated customer connections and workflows for GitHub, Slack,
  Linear, Gmail/Calendar and Microsoft. Notion consent, metadata reads,
  comments and signed comment webhooks passed; deploy the tool-optionality fix
  and retest page-body reads. Other Notion operations, Microsoft sign-in and
  remaining auth-email flows also need tests.
- Complete Google audience/publishing and Microsoft publisher verification
  before general availability. Billing remains unavailable until its separate
  activation, tax and integration gate.
- Record final revisions and actual workflow results here. Keep blocked or
  untested capabilities explicit.

## Residency scope

The target is scoped region-specific residency, not universal regional
processing. Vercel and PostHog edge/platform processing, Stripe, Exa, E2B's
current US execution, recipient mail systems and customer-connected providers
have the exceptions described in [residency](residency.md). Google Cloud images
use jurisdiction endpoints with the authentication, administration and
abuse-monitoring limits described in [image data handling](images.md).
Regional accounts and endpoints do not prove that every subprocessor
operation remains regional. No global image-inference fallback is authorized.
