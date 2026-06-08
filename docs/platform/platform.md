# Platform

Milo's platform is the runtime model behind the companyOS.

## Responsibility

Defines the smallest runtime model that lets people bring Milo into company activity, run work, and understand what happened.

## Runtime Loop

A person, system, schedule, or signal creates a trigger. A trigger may create or update an activation or start an execution. An execution runs Milo, uses configured integrations, records traces, and replies back to the source when useful.

Identity comes from Clerk or WorkOS. Milo stores external tenant and user identifiers directly on records instead of maintaining local organization, user, membership, or external-identity tables.

Daytona sandbox identity is stored directly on executions. There is no separate sandbox model in the first version.

## First Version

Milo should be useful with a simple setup: connect one collaboration tool, receive messages or events, recognize when Milo is asked to work, run the work, and record enough trace data to debug what happened.

## Schema Conventions

- Use `tenantId` for the Clerk or WorkOS tenant identifier.
- Use provider-native identifiers directly, without local identity mapping tables.
- Use `type` for compact category fields.
- Use `data` only for provider or trace details that do not deserve first-class columns yet.
- Rely on Convex creation time for record creation timestamps.

## Models

Context:

- [Sources](./context/sources.md)
- [Integrations](./context/integrations.md)

Attention:

- [Triggers](./attention/triggers.md)
- [Activations](./attention/activations.md)

Runs:

- [Execution](./runs/execution.md)
- [Traces](./runs/traces.md)

## Deferred

These are intentionally not first-version models:

- Local organizations, users, memberships, and external identities.
- Conversation scopes as a separate model.
- Sandboxes as a separate model.
- Execution events as a separate model.
- Agents, reviews, permissions, memory, artifacts, skills, tools, and dreaming.
