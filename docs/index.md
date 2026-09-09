# Jori's engineering decisions

Start here when changing architecture, integrations, providers, or residency
claims. Read only the guide relevant to the task.

| Guide | What it answers |
| --- | --- |
| [Architecture](architecture.md) | What are we optimizing for? What is decided, and what still needs a product decision? |
| [Integrations](integrations.md) | One app or two? Direct regional delivery or shared ingress? What must remain isolated? |
| [Residency](residency.md) | Which data stays regional? What are the exceptions? What evidence supports a claim? |

These guides record the direction agreed on 9 September 2026. They distinguish
the intended architecture from existing implementation and unresolved choices.
They are not proof of production state or permission to deploy.

Use source code for implementation details and current official documentation
for provider capabilities. Earlier research and verification logs remain in Git
history. Follow `AGENTS.md` for workflow and deployment rules.

Keep these guides short. Update the relevant decision when it changes; do not
append task logs, duplicate code documentation, or create competing plans.
