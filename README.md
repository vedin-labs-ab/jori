# Milo

Milo is a Slack-triggered Codex runtime orchestrated by Convex.

## Runtime

Slack events create source items, activations, and executions in Convex. Convex only owns orchestration and lifecycle state. Each execution creates an ephemeral E2B sandbox, bootstraps Codex credentials, writes the Slack MCP config for the triggering integration, runs a Slack token preflight from inside the sandbox, and lets Codex send exactly one Slack reply through Slack MCP.

Slack uses one OAuth install. Milo stores the bot token for posting replies as Milo and the user token for reading/searching Slack context with the installing user's permissions. Codex sees these as separate MCP aliases so the final message tool is isolated from the context tools.

Convex does not post Slack replies through backend Slack chat APIs.

## Required Convex Environment Variables

- `E2B_API_KEY`: E2B API key for ephemeral sandboxes.
- `CODEX_AUTH_JSON_BASE64`: base64-encoded Codex `auth.json`.
- `SLACK_CLIENT_ID`: Slack OAuth client ID.
- `SLACK_CLIENT_SECRET`: Slack OAuth client secret.
- `SLACK_SIGNING_SECRET`: Slack event and install state signing secret.
