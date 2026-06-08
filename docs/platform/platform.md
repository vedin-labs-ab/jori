# Platform V1

## Responsibility

Defines the minimum runtime model needed to trigger Milo from Slack.

## Runtime Loop

A Slack message creates a message record. If the message asks Milo to work, Milo creates a trigger, activates the thread, starts an execution, stores the full trace as a Convex file, and replies in Slack when useful.

Identity and organizations come from Clerk. Milo stores Clerk organization IDs as `tenantId` and Clerk user IDs as `createdById`. There are no local organization, user, membership, or identity-mapping tables.

Daytona sandbox identity is stored directly on executions. There is no sandbox table.

## Onboarding

The first onboarding flow should be simple and mostly Clerk-native:

1. User signs up with Clerk.
2. User creates an organization.
3. User enters the organization name.
4. User optionally enters the organization website.
5. User connects Slack as the first integration.

Use Clerk's out-of-the-box components wherever possible. Styling may be adjusted to match Milo's theme, but identity and organization behavior should remain Clerk-owned. Store organization setup details, such as website, in Clerk organization metadata unless Milo needs to query them frequently.

## UI Scope

The first UI should only cover sign-up, organization creation, website entry, Slack connection, and basic connection status. There should be no dashboard, run console, memory UI, agent builder, settings area, or artifact browser in the first version.

## Schema Conventions

- Use `tenantId` for the Clerk organization ID.
- Use `createdById` for the Clerk user ID when a person creates the record.
- Use Slack-native identifiers directly.
- Use `type` for compact category fields.
- Use `data` only for Slack details that do not deserve first-class columns yet.
- Use `createdAt` for explicit creation timestamps.

## Models

Context:

- [Messages](./context/messages.md)
- [Integrations](./context/integrations.md)

Attention:

- [Triggers](./attention/triggers.md)
- [Activations](./attention/activations.md)

Runs:

- [Executions](./runs/execution.md)
- [Traces](./runs/traces.md)

## Deferred

These are intentionally not first-version models:

- Local organizations, users, memberships, and identity mappings.
- Conversation scopes, sandboxes, execution events, agents, reviews, permissions, memory, artifacts, skills, tools, and dreaming.
