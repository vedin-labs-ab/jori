# Residency and claims

[Docs index](index.md) · [Architecture](architecture.md) · [Integrations](integrations.md)

## Intended boundary

| Data or operation | Treatment |
| --- | --- |
| Chats, files, imported content, summaries and embeddings | Regional storage and processing, including caches, backups, replicas and content-bearing logs. |
| Customer tokens, OAuth state, connection records, jobs | Regional storage and execution. |
| Inference, images, search, indexing and sandbox work | Regional processing through provider adapters. Current gaps are below. |
| App registrations | Share only where required flows remain regional. A name or developer account does not determine data geography. |
| Webhook receipt and app credentials | Regional by default. Any shared receiver or credential service needs a provider-specific exception review. |
| Billing, edge, support and provider administration | Review and disclose actual datasets, access, locations and retention. Minimize customer content. |
| Customer-connected services and chosen recipients | Their own processing follows their terms and customer instructions. Jori's imported copies and processing remain in this boundary. |

An integration platform Jori hires to relay requests, hold tokens or execute
connectors belongs in Jori's processing chain. Do not exempt it simply because
a customer enables the destination integration. Determine legal roles from the
actual relationship and processing.

A shared receiver processes incoming payloads even without storing them. Scope
exceptions to actual data flows, including logs and scheduled arguments. Verify
processing and access locations with providers, including any edge services.

## Current setup and exceptions

Sandbox configuration updated 11 September 2026. Other provider findings date
from 9 September; this is not proof of provider contracts.

- **Blaxel:** sandbox execution and file transfers use Frankfurt for EU and
  North Virginia for US, with separate workspace credentials. See
  [Sandboxes](sandboxes.md). Provider control-plane metadata, internal telemetry,
  backups and access remain subject to the applicable provider terms and evidence.
- **Parallel:** handles search, fetching and background website crawling.
  EU Search uses the tested EU endpoint; fetching uses the default API.
  Albin approved treating EU Search as regional for rollout. Provider terms,
  full processing boundaries and a US-only commitment remain to be verified
  alongside DPAs. Fetching remains global.
  See [Web search](search.md).
- **Stripe:** long-term billing exception. Keep prompts/documents out of billing
  metadata. Duplicate accounts do not create regional processing guarantees.
- **Other providers:** regional Convex, Vercel, OpenRouter, Google images, Bird
  and PostHog configuration is recorded. Verify backups, retention and access.
  Vercel/PostHog edge and provider operations remain separately scoped exceptions.
- **Email and images:** recipient mail systems are outside Jori's control.
  Google image abuse monitoring has separate retention terms; images also reach the regional Blaxel sandbox.
- **Legal:** public privacy/terms pages were placeholders at review. Executed
  agreements and complete retention rules are not established by this repository.

## Evidence before claims

For each provider or shared service, record purpose, legal role, data categories,
storage/processing/access locations, retention, downstream processors, transfer
mechanism, account-specific configuration evidence and review date. Keep entries
in one maintained provider register when preparing the offering; do not invent
contractual facts or store credentials/private payloads in documentation.

Albin and counsel settle customer/provider DPAs, subprocessor notices, transfer
arrangements, retention/deletion periods and support access. Engineering verifies
the matching implementation. Regional hosting, no training, zero retention and
GDPR compliance are separate claims. Selecting a region proves none of the others.

GDPR permits certain international transfers with the applicable mechanism and
safeguards. Documenting an exception does not make it lawful or satisfy an EU-only
customer contract. See [IMY transfer guidance](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/overforing-till-tredje-land/)
and [EDPB processor responsibilities](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en).

The approved public summary groups workspace data, web search and code execution
under the selected EU or US region, with page fetching and billing as exceptions.
Keep the provider verification work above open; this wording does not establish
contractual coverage. Avoid "all data stays in your region",
"EU-only", "EU sovereign", or an undefined "regional core infrastructure*".
Use EU, EEA and Europe precisely. An internal policy is not a signed agreement.
