# Regional release verification

Last updated 8 September 2026, at checked main `011d5994`. The migration is
not yet verified E2E. Provider setup, direct API tests, application outbox
submission and completed customer workflows are different levels of evidence.
Checks used synthetic data unless stated otherwise.

## Deployment state

| Target | Verified deployment | Remaining work |
| --- | --- | --- |
| Development | Convex `trustworthy-parakeet-343` and skills deployed from checked main `1aafd8d7`; the Convex 1.45.0 watcher restarted afterward. Bird and Vertex settings are now installed and verified. | Deploy the final revision and sync skills; verify application flows. `deploy:dev` does not deploy a hosted frontend. |
| Production EU | Full frontend/backend deployment `f9b0adb8` completed. `eu.usejori.com` returned 200 with the `dub1` function region. Convex is `sensible-spoonbill-17` in Ireland. | Deploy the final revision, including images and subsequent integration changes, then repeat live checks. |
| Production US | Convex-only stage `e0a693c2` deployed to `insightful-goat-7` in Virginia with schema validation enabled. Six-record preservation repair completed. | Deploy strict cleanup `011d5994` or its checked successor. The US frontend still returns 421 and awaits the final deployment. No skills sync ran during the preservation stage. |

The US repair renamed `link.linkedAt` to `link.at` on two identities and
`associatedIntegrations` to `surfaces` on four global skills. Private
full-document comparison confirmed unchanged IDs, creation times, timestamps
and all other content. Dry-run made no changes; the transaction succeeded;
repeat execution was a no-op. Main `011d5994` removes every temporary
validator, compatibility reader and migration function. That strict cleanup
has not yet been deployed. Normal deployment unmounted obsolete Resend
components and removed old indexes; the repair deleted no application records.

## Provider readiness

| Provider | Verified evidence | Still required |
| --- | --- | --- |
| Convex | Separate production deployments, deploy keys and auth secrets. Required production variable names present; optional Stripe configuration absent. US preservation completed. | Final dev/EU/US deployments, tenant-isolation tests and unused preview cleanup. Variable presence alone does not prove functionality. |
| Vercel | Pro active; separate production projects pinned to `dub1` and `iad1`, function failover off. Regional domains and ten public build variables checked. EU function placement observed. | Final deployments, US host resolution, redirects, private caching and host-only cookie checks. |
| Bird | Separate EU, US and development accounts/workspaces and scoped keys. Sending domains verified. Direct sends returned 202 and reached the test inboxes. Actual development and EU Jori outbox submissions were accepted on the first attempt and removed retained bodies. Tracking off; no Jori delivery webhook. Temporary setup grants revoked. | US app outbox test, auth email flows and obsolete Resend configuration review. Acceptance alone does not prove recipient delivery. |
| OpenRouter | Business active; separate region-only guardrails, ZDR on, training off. Both regions passed direct completion, structured-output and tool-call probes. Region-filtered image requests returned 404; images now use Google Cloud. | Deployed chat/tool tests. No global inference fallback. |
| Google Cloud images | Separate EU/US/development projects, predict-only service accounts and credentials. All three billing links active and implicit caching disabled. Real adapter generated PNGs in each matching jurisdiction. Cross-project production IAM probes returned 403. | Actual Convex generation, regional file storage, sandbox transfer and deduplicated usage accounting. |
| PostHog | Separate EU project `233772` and US project `530551`. IP discard on; autocapture, web vitals, dead clicks and heatmaps disabled and read back in both. US recording, console capture and network capture also disabled and read back. Synthetic events appeared only in matching projects. | Verify actual frontend destinations and browser collection behavior. |
| Exa | Separate EU/US keys installed in matching Convex deployments; both returned 200 to synthetic search. Development retains its own key. | Deployed tool test. Global processing remains an exception behind the regional interface. |
| E2B | Separate development/EU/US projects and keys. All templates built; matching credentials created sandboxes, ran a harmless command and deleted them. Opposite-region template access denied. Account offers only `us-west-1`. | Deployed sandbox creation, execution, file transfer and cleanup. US execution remains an exception for EU tenants. |
| Google | Separate regional clients, secrets and callbacks. Saved consent scopes match code; Gmail/Calendar APIs enabled. Actual EU Google sign-in succeeded for the signed-in test user. | Verify resulting organization/tenant behavior, US sign-in and both regions' Gmail/Calendar connections. Audience remains External/Testing; publishing/verification required before general availability. |
| Microsoft | Separate organizational-account registrations and 180-day secrets installed. Three callbacks per region; delegated User.Read, offline_access, Mail.ReadWrite, Mail.Send and Calendars.ReadWrite. No tenant-wide consent granted. | Live sign-in/connections, publisher verification and rotation before 6 March 2027. |
| Stripe | Both accounts must represent Vedin Labs AB, Sweden. Regional association and paid-checkout guards implemented. Missing settings disable billing without blocking prelaunch deployment. | User activation, merchant-country correction and tax decisions; then separate keys/products/prices/webhooks and billing verification. |
| GitHub | Separate apps and credentials; JWT identity, exact permissions/events and regional webhook settings verified. Real ping redelivery returned 200 in both regions. Own signatures accepted; missing, bad and opposite-region signatures rejected. | Authenticated installation, OAuth installation-access proof and connected repository workflows. Inert pings do not establish these. |
| Slack | Separate apps with token rotation and regional callbacks/interactivity; credentials read back. EU event URL verified, five bot events saved and public distribution enabled. | US event setup/distribution; both regions' connections, rotation, interactivity and event workflows. |
| Linear | Separate public apps and direct regional webhooks; client-credentials grant disabled. Matching client/webhook credentials read back. | Actual OAuth connections and webhook processing. |
| Notion | Separate public connections, regional callbacks and matching OAuth credentials. No user-information capability. EU subscription created with exactly three event types; token verification pending. | Activate EU subscription, create/verify US subscription, store matching secrets and test connections/events. Bootstrap setup code is checked separately, not production-deployed. |

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

These are real adapter/provider tests, not an executed Convex image tool.
The checked file-reference transport has a 6 MiB unit test and ownership
checks, but live storage, sandbox transfer and ledger writes remain
unverified. See [image configuration and retention](images.md).

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

Slack EU saved `app_mention`, `message.channels`, `message.groups`,
`message.im` and `message.mpim`. Linear subscribes only to Comments, Issues,
Projects and Inbox notifications. Notion permits content read/update/insert
and comment read/insert, without user information. EU webhook activation
remains pending; the checked short-lived bootstrap flow still needs preview
and production verification.

Google's saved consent scopes are `openid`, `userinfo.email`,
`userinfo.profile`, `gmail.readonly`, `gmail.compose`, `gmail.send`,
`calendar.events` and `calendar.calendarlist.readonly`. Broad Drive, Calendar
and `gmail.modify` scopes were removed. EU sign-in succeeded, but organization
creation and connected-provider permissions still require verification.

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

## Remaining release gates

- Rebase on current main and pass full `pnpm run check` and `pnpm run test`.
  Never bypass checks or deploy a worktree to shared environments.
- Finish preview verification for pending HTTP/schema changes, then merge
  through the checked fast-forward workflow.
- Deploy one final checked revision to dev and both production regions.
  Verify strict US schema, skills sync, frontend availability and destinations.
- Complete Slack US and both Notion webhook activation flows. Finish public
  app distribution and provider verification where required before launch.
- Run authenticated application checks in both production regions: sign-in,
  organization access/isolation, auth/outbox email, browser analytics,
  chat/search, images/accounting, sandbox transfer/cleanup and every connected
  integration. Billing remains unavailable until its separate gate.
- Review obsolete Resend settings and remove only confirmed unused task
  previews, including `quixotic-raccoon-259` and `tremendous-ptarmigan-69`.
  Do not remove a preview still needed by an active task.
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
