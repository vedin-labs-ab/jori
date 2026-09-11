# Web search and page fetching

[Docs index](index.md) · [Residency](residency.md)

Parallel Search and Extract serve `web_search`, `web_fetch` and background
website discovery and monitoring. All callers use `convex/search`. Preserve
that boundary when adding callers or changing providers.

## Configuration

Each Convex deployment owns `PARALLEL_API_KEY`, `PARALLEL_SEARCH_BASE_URL` and
`PARALLEL_EXTRACT_BASE_URL`. The public origin is `https://api.parallel.ai`.
The adapter uses `/v1/search` and `/v1/extract`, aborts after 30 seconds and
rejects redirects. It does not retry or fall back to another endpoint.

One Parallel organization holds separate apps and keys for development, EU
production and US production. Retire preview keys after verification.
Organization names and separate keys do not establish residency. Never let a
user, tool argument or result choose the API origin.

| Deployment | Search origin | Extract origin |
| --- | --- | --- |
| Development and US production | `https://api.parallel.ai` | `https://api.parallel.ai` |
| EU production | `https://eu.parallel.ai` | `https://api.parallel.ai` |

## Residency gate

As reviewed on 11 September 2026, Parallel's [privacy policy](https://parallel.ai/privacy-policy)
explicitly describes EU processing and no content retention for Search requests
sent to its EU endpoint. It does not establish the same coverage for Extract.
Live testing found `https://eu.parallel.ai/v1/search` accepts the existing
self-serve key without extra setup. EU deployments use this route. Both
`/v1/extract` and legacy `/v1beta/extract` return 404 on that host, so fetching
still uses the default API. The SDK and public OpenAPI list only the default
origin; the account has no visible residency switch.

A successful EU Search call verifies access, not account entitlement or the
complete processing boundary. The default API is not a verified US-only
endpoint either.

Parallel is the selected provider with these known limits. Search and fetching
remain disclosed as processing that can leave the workspace region until
Parallel confirms:

- Whether the discovered EU route activates the policy's residency option,
  its account/key requirements, and any US-only endpoint.
- Coverage of both Search and Extract, including ingress, logs, caches,
  backups, support access and downstream processors.
- Retention and contractual terms for the actual account.

Then configure each operation independently, verify it live, and update the
adapter's processing declaration and public claims together. An EU Convex
preview proves where Jori runs, not where Parallel processes a request.

## Behavior to preserve

Search returns relevant excerpts; fetching returns full page Markdown.
Keep public-URL validation, domain restrictions, output limits, safe error
messages and provider attribution. Provider errors and warnings must not put
queries, credentials or returned error bodies into logs.

Website crawling discovers links from the returned Markdown. Freshness checks
use Parallel's minimum cache age of ten minutes and reject older-cache fallback
when a live fetch fails. This is not a forced origin fetch on every call.
Do not substitute excerpts for missing full content or treat an extraction
failure as an empty page to baseline.
