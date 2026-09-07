# Web search processing

All search, page fetching, and organization website crawling use
`convex/search` through a provider-neutral client. The client requires the
deployment's `JORI_REGION`. Callers cannot select another instance's region or
credentials. Each deployment must have its own `EXA_API_KEY`.

The current Exa adapter explicitly maps both EU and US deployments to
`https://api.exa.ai`. Its processing classification is `global`, meaning Jori
does not enforce regional processing at this provider. This is a known
exception, not a claim that Exa operates in every country. Separate keys do not
guarantee separate storage, retention, or processing at Exa.

The adapter receives search queries, domain filters, requested URLs, and optional
highlight queries. Organization onboarding and website monitoring also call it,
even when no user invokes the web search tool. It does not receive Jori user
identifiers, session credentials, or complete conversation histories. Queries
and URLs can still contain customer information. Provider error messages are
not copied into persisted tool errors because they may echo request data.

Exa's [Search API](https://exa.ai/docs/reference/search) and
[Contents API](https://exa.ai/docs/reference/get-contents) document the global
API endpoint. Its [security documentation](https://exa.ai/docs/reference/security)
offers zero data retention through an Enterprise discussion. Neither endpoint
selection nor a self-serve API key establishes EU-only processing or zero data
retention. Confirm account-specific terms before making either claim.

To replace Exa, implement `SearchClient` with normalized requests and results,
then select the appropriate adapter by deployment region in
`convex/search/index.ts`. The broker and organization crawler must not import a
provider SDK. Tests cover both regions, missing configuration, both caller
paths, and redaction of provider errors. Production verification must separately
exercise each deployment's key; unit tests use synthetic responses.
