# One Jori, regional workspaces

[Docs index](index.md)

## Priorities

1. Preserve tenant authorization, credential security and customer commitments.
2. Keep workspace storage and core agent work in the selected EU or US region.
   Track specific exceptions in [Residency](residency.md).
3. Keep Jori recognizable and installation straightforward. Use regional app
   registrations where needed, with consistent branding.
4. Choose the simplest implementation that meets these requirements. Add shared
   infrastructure only when it solves a concrete problem.

## Defaults

- One product, with regional application deployments and customer stores.
  Region is a deployment property; domain code uses its own provider adapters.
- Customer tokens, imported content, jobs and integration processing stay
  regional. Follow the [integration decision tree](integrations.md).
- Jori starts the correct regional installation flow. One product identity does
  not require one provider registration or global authentication.
- Region selection must not silently copy sessions, merge identities or migrate
  customer records. An outage must not trigger cross-region processing or weaker
  model privacy settings.
- Keep separate regional apps for the four integrations listed in the guide.
  A shared webhook router or credential issuer is not planned.

## When to revisit

Revisit a provider's registration choice when its capabilities change, its
customer experience becomes a problem, or a concrete distribution requirement
cannot be met. New shared processing needs a scoped proposal covering data,
credentials, locations, retention and failure handling for Albin to decide.

Resolve routine implementation choices autonomously. Do not build stricter
editions or custom deployments without a concrete customer need. Prioritize
regional event reliability and the E2B/Exa residency gaps over shared routing.
