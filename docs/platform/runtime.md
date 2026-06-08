# Runtime V1

## Responsibility

Defines the minimum runtime model needed to trigger Milo from Slack and user-managed schedules.

## Runtime Loop

A Slack message creates a message record. If the message asks Milo to work, Milo creates a trigger, activates the conversation, starts an execution, runs Codex in an E2B sandbox, stores the full trace as a Convex file, and lets Codex reply through Slack MCP.

A schedule stores future work, an explicit output target, and either a one-shot UTC ISO timestamp or a recurring UTC cron expression. When the schedule fires, Milo creates the same kind of execution and runs Codex in E2B with the scheduled task name, description, metadata, and output target.

Identity and organizations come from Clerk. Milo stores Clerk organization IDs as `tenantId` and Clerk user IDs as `createdBy`. There are no local organization, user, membership, or identity-mapping tables.

E2B sandbox identity is stored directly on executions. There is no sandbox table. The Convex backend orchestrates the sandbox and execution lifecycle, but Slack communication belongs to Codex through Slack MCP servers.

Codex authentication is stored as a Convex environment variable and copied into the ephemeral E2B sandbox as `auth.json` at runtime. Slack MCP is configured per execution from the active integration. The runtime exposes a user-token MCP alias for reading/searching Slack context and a bot-token MCP alias for sending the final reply as Milo. Milo MCP is configured per execution with a one-time token whose hash is stored on the active execution; MCP requests derive `tenantId` from that token. Each sandbox only receives the MCP tokens for the tenant and workspace that triggered the execution.

Required Convex environment variables:

- `E2B_API_KEY`: E2B API key for creating ephemeral sandboxes.
- `CODEX_AUTH_JSON_BASE64`: base64-encoded Codex `auth.json`.
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_SIGNING_SECRET`: Slack app install and event verification secrets.

## Onboarding

The first onboarding flow should be simple and mostly Clerk-native:

1. User signs up with Clerk.
2. User creates an organization.
3. User enters the organization name.
4. User optionally enters the organization website.
5. User connects Slack as the first integration.

Slack installs use one OAuth flow that requests both bot scopes and user scopes. The bot token needs `app_mentions:read` and `chat:write`; the user token needs Slack read/search scopes such as `channels:history`, `groups:history`, `im:history`, `mpim:history`, `search:read`, and `users:read`.

Use Clerk's out-of-the-box components wherever possible. Styling may be adjusted to match Milo's theme, but identity and organization behavior should remain Clerk-owned. Store organization setup details, such as website, in Clerk organization metadata unless Milo needs to query them frequently.

## UI Scope

The first UI should only cover sign-up, organization creation, website entry, Slack connection, and basic connection status. There should be no dashboard, run console, memory UI, agent builder, settings area, or artifact browser in the first version.

## Schema Conventions

- Use `tenantId` for the Clerk organization ID.
- Use `createdBy` for the Clerk user ID when a person creates the record.
- Use `provider` for the integration type, such as Slack, Teams, Jira, or Linear.
- Use `accountId` for the provider account connected to an integration.
- Use `type` for compact message and trigger categories.
- Use `externalId` for the provider-native message identifier.
- Use `conversationId` for the durable discussion or work surface Milo is listening to.
- Use `data` only for provider-specific details that do not deserve first-class columns yet.
- Use `createdAt` for explicit creation timestamps.

## Models

Context:

- [Messages](./context/messages.md)
- [Integrations](./context/integrations.md)

Attention:

- [Triggers](./attention/triggers.md)
- [Activations](./attention/activations.md)

Runs:

- [Executions](./runs/executions.md)
- [Traces](./runs/traces.md)

Scheduling:

- [Schedules](./scheduling.md)

## Code Ownership

The implementation follows the domain map in [Structure](./structure.md). Framework-owned Convex entry points stay at the root, while Milo-owned backend code lives under `identity`, `context`, `skills`, `attention`, `runs`, `scheduling`, and `providers`.

## Deferred

These are intentionally not first-version models:

- Local organizations, users, memberships, and identity mappings.
- Conversation scopes, sandboxes, execution events, agents, reviews, permissions, memory, artifacts, skills, tools, and dreaming.
