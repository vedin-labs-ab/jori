# Platform

Milo's platform is the runtime model behind the companyOS.

## Responsibility

Defines the domains that let people bring Milo into company activity, delegate work to agents, execute work in Daytona sandboxes, use tools safely, remember what happened, and improve future agent behavior.

## Runtime Loop

A person, system, schedule, or signal asks Milo to pay attention. Attention can create an activation, route a review, or start an execution. A sandboxed agent plans and acts with tools, models, integrations, and a Daytona environment. The execution produces artifacts and traces. Context and memory update from those traces. Dreaming studies company activity and prior executions to improve skills and future delegation.

## Onboarding Baseline

Milo should be useful with a simple setup: connect collaboration and work tools, identify users, understand roles, choose where Milo is available, and optionally provide the organization website so Milo can gather initial company context. Company memory, organization-wide skills, and deeper customization can accumulate after the organization starts using Milo.

## Models

Identity:

- [Organizations](./identity/organizations.md)
- [Users](./identity/users.md)
- [Permissions](./identity/permissions.md)

Context:

- [Sources](./context/sources.md)
- [Integrations](./context/integrations.md)
- [Memory](./context/memory.md)

Agents:

- [Agents](./agents/agents.md)
- [Skills](./agents/skills.md)
- [Tools](./agents/tools.md)

Attention:

- [Triggers](./attention/triggers.md)
- [Activations](./attention/activations.md)
- [Reviews](./attention/reviews.md)

Runs:

- [Execution](./runs/execution.md)
- [Sandboxes](./runs/sandboxes.md)
- [Artifacts](./runs/artifacts.md)
- [Traces](./runs/traces.md)

Dreaming:

- [Dreams](./dreaming/dreaming.md)
