# Milo

Milo is a message-triggered Codex runtime orchestrated by Convex.

## Runtime

Slack, Linear, and Microsoft Teams events create messages, activations, and executions in Convex. Convex only owns orchestration and lifecycle state. Each execution creates an ephemeral E2B sandbox, bootstraps Codex credentials, writes the provider MCP config for the triggering integration, runs a token preflight from inside the sandbox, and lets Codex respond through the provider tools.

Slack uses one OAuth install. Milo stores the bot token for posting replies as Milo and the user token for reading/searching Slack context with the installing user's permissions. Codex sees these as separate MCP aliases so the final message tool is isolated from the context tools.

Convex does not post Slack replies through backend Slack chat APIs.

Microsoft installs start with tenant admin consent, then delegated OAuth for the connected Microsoft account. Teams notifications are ingested through Microsoft Graph change notifications at `/microsoft/events`; runtime tools are scoped to the triggering Teams chat or channel thread, with on-demand Graph reads for mail, calendar, and files only when the request needs them.

## Required Convex Environment Variables

- `E2B_API_KEY`: E2B API key for ephemeral sandboxes.
- `CODEX_AUTH_JSON_BASE64`: base64-encoded Codex `auth.json`.
- `SLACK_CLIENT_ID`: Slack OAuth client ID.
- `SLACK_CLIENT_SECRET`: Slack OAuth client secret.
- `SLACK_SIGNING_SECRET`: Slack event and install state signing secret.
- `MICROSOFT_CLIENT_ID`: Microsoft Entra application client ID.
- `MICROSOFT_CLIENT_SECRET`: Microsoft Entra application client secret.
- `MICROSOFT_GRAPH_CLIENT_STATE`: shared secret used to verify Microsoft Graph change notifications.
