# Platform

Milo's platform is the runtime model behind the companyOS.

## Responsibility

Defines the smallest runtime model that lets people bring Milo into company activity, delegate work to an agent, execute work, ask for review, and understand what happened.

## Runtime Loop

A person, system, schedule, or signal creates a trigger. A trigger may create or update an activation, start an execution, or route a review. An execution runs Milo, uses configured integrations, records traces, and replies back to the source when useful.

Identity comes from Clerk or WorkOS. Milo stores external tenant and user identifiers directly on records instead of maintaining local organization, user, membership, or external-identity tables.

Daytona sandbox identity is stored directly on executions. There is no separate sandbox model in the first version.

## First Version

Milo should be useful with a simple setup: connect one collaboration tool, receive messages or events, recognize when Milo is asked to work, run one default agent, ask for review when needed, and record enough trace data to debug what happened.

## Models

Context:

- [Sources](./context/sources.md)
- [Integrations](./context/integrations.md)

Agents:

- [Agents](./agents/agents.md)

Attention:

- [Triggers](./attention/triggers.md)
- [Activations](./attention/activations.md)
- [Reviews](./attention/reviews.md)

Runs:

- [Execution](./runs/execution.md)
- [Traces](./runs/traces.md)

## Deferred

These are intentionally not first-version models:

- Local organizations, users, memberships, and external identities.
- Conversation scopes as a separate model.
- Sandboxes as a separate model.
- Execution events as a separate model.
- Permissions, memory, artifacts, skills, tools, and dreaming.
