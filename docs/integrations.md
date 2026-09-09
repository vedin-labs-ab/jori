# Integration decisions

[Docs index](index.md) · [Architecture](architecture.md) · [Residency](residency.md)

## Choose the delivery design

Prefer one public Jori application per provider. Apply these branches in order:

1. **Direct delivery.** If one registration supports regional OAuth callbacks
   and subscriptions per installation, use it. Keep token exchange and work regional.
2. **Shared ingress.** Otherwise, if webhooks have one app-wide destination,
   use the common shared receiver, once it meets the requirements below.
3. **Separate registrations.** If shared ingress cannot meet security, delivery
   or customer-contract requirements, use separate apps with common branding
   where supported. Document unavoidable customer-visible differences.
4. **Polling.** If neither works, consider regional polling only when provider
   rules, latency, rate limits and event semantics meet the feature's needs.
5. **Unavailable.** If no option meets the requirements, explain the limitation.
   Do not silently broaden geography or permissions.

Verify current official documentation for OAuth, webhook filtering, scopes,
identity, revocation and distribution before choosing. An OAuth callback URL
does not route subsequent events. Multiple webhook subscriptions do not prove
selective delivery. Separate owner accounts are not inherently required.
Keep development registrations and data separate from production.

## Shared receiver requirements

- Verify the raw provider request before trusting its routing identity.
  Forward only to an authenticated, authorized regional destination.
- Store minimal installation-to-region mappings centrally. Keep customer tokens,
  content storage, jobs and API actions in regional workers.
- Do not persist payloads in shared logs or queues. Acknowledge only after durable
  regional acceptance. Design for provider deadlines/retries and regional outages;
  do not acknowledge then lose events. Regional handlers deduplicate deliveries.
- Reject or safely ignore forged, unknown, ambiguous, replayed or revoked routes
  as appropriate for the provider. Never trigger work without a valid binding.
  Never broadcast to both regions and discard the unwanted copy after delivery.
- Establish bindings through authenticated installation flows. A workspace ID
  may represent several grants. Resolve the [dual-region policy](architecture.md)
  before consolidation; disconnecting one connection must not revoke another
  without an explicit product decision.
- Disclose ingress location and transient payload processing. Receiving the full
  webhook is content processing, even without retention. Global edge hosting and
  geo-DNS do not identify the customer's selected region.

## App credentials and customer tokens

Review actual authority before sharing a credential. An OAuth client secret is
different from a customer token or an app key that can mint installation tokens.

For a single GitHub App, use a restricted issuer that authorizes the requesting
region and installation. Do not give regional workers unrestricted app-wide
authority. Two keys for one app do not isolate installations. Keep issued tokens
regional and out of shared logs/storage; document transient issuance separately.

## Existing provider constraints

Research baseline from 8 September 2026. Recheck before implementation.

| Provider | Starting point |
| --- | --- |
| GitHub | One app webhook, multiple OAuth callbacks, separate installation setup flow. App names are globally unique. Shared ingress and restricted token issuance need design. [Webhooks](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks), [registration](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app). |
| Slack | One Events API URL and app-wide interactivity URLs. Prefer shared ingress. Bot display name is separate from app name; distribution review is separate. [Request URLs](https://docs.slack.dev/apis/events-api/using-http-request-urls), [manifest](https://docs.slack.dev/reference/app-manifest/). |
| Linear | App-managed webhooks have one URL. API-created workspace webhooks require admin authority and may not replace Jori's app-specific events. Prefer shared ingress over broader permissions solely to avoid another app. [Webhooks](https://linear.app/developers/webhooks), [manifest](https://linear.app/developers/oauth-app-manifests). |
| Notion | Documented subscriptions do not establish installation filtering by region before delivery. Prefer shared ingress unless current provider capabilities establish direct selective delivery. [Webhooks](https://developers.notion.com/reference/webhooks). |

## Completing an integration change

Record the chosen branch, permissions, data destinations and provider evidence
in the task. Test meaningful failures: tenant/region mixups, forged and repeated
events, connection replacement/revocation, outages and unintended fallback.
Reuse existing tests. Follow `AGENTS.md` for gates, previews and authorized live
checks. Report revision, date, tested workflows and gaps; mocks and a successful
OAuth redirect do not prove a complete customer workflow.
