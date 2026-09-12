# Jori's engineering decisions

Start here when changing architecture, integrations, providers, or residency
claims. Read only the guide relevant to the task.

| Guide | What it answers |
| --- | --- |
| [Architecture](architecture.md) | Product priorities, regional defaults and when to revisit a decision. |
| [Chats](chats.md) | Filing, shared participation, execution identity and resource access. |
| [Integrations](integrations.md) | Registration choices, branding and reliable regional delivery. |
| [Web search](search.md) | Search and page fetching, endpoint configuration and residency verification. |
| [Sandboxes](sandboxes.md) | Regional sandbox setup, execution, cleanup and verification. |
| [Previews](previews.md) | Isolated regional Convex deployments for branch verification. |
| [Launch policies](legal.md) | Business scope, refunds, retention and checks before publication. |
| [Refunds](refunds.md) | Credit reservation, refund calculation and support execution. |
| [Exports](export.md) | Customer exports, controller exports and operator commands. |
| [Residency](residency.md) | Data boundaries, known exceptions and evidence for customer claims. |
| [Brand](brand.md) | Logo variants, clear space, browser and app icons, and social image regeneration. |
| [Layout stability](layout.md) | Loading geometry, changing labels and dialog state during exit. |

These guides record the current engineering decisions. Implementation
gaps are noted separately; guidance is not proof of production state.

Use source code for implementation details and current official documentation
for provider capabilities. Follow `AGENTS.md` for workflow and deployment rules.

Keep these guides short. Update the relevant decision when it changes; do not
append task logs, duplicate code documentation, or create competing plans.
