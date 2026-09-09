# One Jori, regional workspaces

[Docs index](index.md)

## Direction

Jori is one product with one public identity. Customers choose an EU or US
workspace. Store workspace content and perform core agent work in that region,
with specific exceptions for shared integration infrastructure and supporting
services. See [the residency boundary](residency.md).

Offer one default product. Do not build stricter regional editions, sovereign
hosting, or custom customer deployments without a concrete customer need.

## Priorities

1. Preserve tenant authorization, credential security, lawful processing and
   applicable customer commitments. Branding never overrides these requirements.
2. Keep workspace storage and core work regional. Exceptions describe particular
   data flows; they do not exempt an entire provider from review.
3. Present one Jori identity and a consistent Connect flow. Limited shared
   integration infrastructure is an accepted direction, subject to its design.
4. Choose the simplest implementation that satisfies these requirements. Avoid
   duplicate accounts, extra permissions and new services without a concrete need.

## Technical defaults

- Keep the regional application deployments and customer stores. Region is a
  deployment property; domain code uses its own database and provider adapters.
- Keep customer tokens, imported content, jobs and substantive integration work
  regional. Use [the integration decision tree](integrations.md) for app identity
  and webhook delivery.
- One public name does not require global authentication. Region selection must
  not silently copy sessions, merge identities or migrate customer records.
- Fail visibly when a required regional capability is unavailable. Never route
  to another region or weaken model privacy settings as an outage fallback.

## Decided direction, unfinished design

The current implementation still has separate EU/US integration registrations.
Shared ingress and restricted GitHub token issuance are future work. This guidance
replaces the earlier rule forbidding all shared integration infrastructure.

| Open choice | How to resolve it |
| --- | --- |
| Shared ingress and credential issuer | Agent proposes location, data flows, access controls, retention and failure handling. Albin confirms the resulting scope before enabling it. No host is selected yet. |
| One external installation in both Jori regions | Prefer one owning region for simplicity. Agent checks provider grant semantics; Albin confirms the product rule. Do not restrict existing connections based on this proposal alone. |
| E2B and Exa replacements | Agent compares regional options and feature/cost tradeoffs. Albin selects any new provider commitment. |
| Customer commitments | Agent prepares the data-flow evidence and draft wording. Albin and counsel settle contracts, retention periods and public guarantees. |

Resolve routine implementation choices within these rules autonomously. For a
new boundary tradeoff, present the concrete options and continue independent
authorized work. This document does not authorize production changes.
