# Milo

Milo is a message-triggered Codex runtime orchestrated by Convex.

## Runtime

Slack, Linear, and GitHub events create messages, activations, and executions in Convex. Convex only owns orchestration and lifecycle state. Each execution creates an ephemeral E2B sandbox, bootstraps Codex credentials, writes the provider MCP config for active integrations, runs token preflights from inside the sandbox, and lets Codex respond through the provider tools.

Slack uses one OAuth install. Milo stores the bot token for posting replies as Milo and the user token for reading/searching Slack context with the installing user's permissions. Codex sees these as separate MCP aliases so the final message tool is isolated from the context tools.

Convex does not post Slack replies through backend Slack chat APIs.

Microsoft Email and Microsoft Calendar use separate delegated OAuth connections. Each connection is user-scoped to the installing Milo user and only exposes Outlook mail or calendar tools when that user's integration is active for the execution.

Microsoft Teams tenant-scoped ingestion is not active in this version.

## Required Convex Environment Variables

- `E2B_API_KEY`: E2B API key for ephemeral sandboxes.
- `CODEX_AUTH_JSON_BASE64`: base64-encoded Codex `auth.json`.
- `SLACK_CLIENT_ID`: Slack OAuth client ID.
- `SLACK_CLIENT_SECRET`: Slack OAuth client secret.
- `SLACK_SIGNING_SECRET`: Slack event and install state signing secret.
- `MICROSOFT_CLIENT_ID`: Microsoft Entra application client ID.
- `MICROSOFT_CLIENT_SECRET`: Microsoft Entra application client secret.
