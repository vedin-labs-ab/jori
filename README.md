# Milo

Milo is a message-triggered Codex runtime orchestrated by Convex.

## Runtime

Slack, Linear, and GitHub events create messages, activations, and executions in Convex. A relevant message activates its conversation, and each relevant or activated message creates its own execution. Convex only owns orchestration and lifecycle state. Each execution creates an ephemeral E2B sandbox, bootstraps Codex credentials, writes the provider MCP config for active integrations, runs token preflights from inside the sandbox, and lets Codex respond through the provider tools.

Slack uses one OAuth install. Milo stores the bot token for posting replies as Milo and the user token for reading/searching Slack context with the installing user's permissions. Codex sees these as separate MCP aliases so the final message tool is isolated from the context tools.

Convex does not post Slack replies through backend Slack chat APIs.

Microsoft Email and Microsoft Calendar use separate delegated OAuth connections. Each connection is user-scoped to the installing Milo user and only exposes Outlook mail or calendar tools when that user's integration is active for the execution.

Notion uses a public connection OAuth install. Milo stores workspace-level access for the pages and databases selected during Notion authorization, then exposes focused Notion context, page, record, block, and comment tools at runtime.

Microsoft Teams tenant-scoped ingestion is not active in this version.

## Local Setup

Create a local env file from the tracked template:

```sh
cp .env.local.example .env.local
```

Fill in every value, then run:

```sh
pnpm env:setup
pnpm env:check
```

`pnpm env:setup` copies the local values into the repository's git common
directory as `milo.env.local`. Git worktrees share that directory, so fresh
agent worktrees can run `pnpm run deploy` without manually copying ignored env
files into each worktree.

Required local variables:

- `CONVEX_DEPLOYMENT`: Convex deployment selected by `npx convex dev`.
- `VITE_CONVEX_URL`: client Convex URL.
- `VITE_CONVEX_SITE_URL`: client Convex site URL.
- `VITE_CLERK_PUBLISHABLE_KEY`: client Clerk publishable key.
- `CLERK_JWT_ISSUER_DOMAIN`: Clerk JWT issuer URL used by
  `convex/auth.config.ts` while Convex prepares a deploy.

## Required Convex Environment Variables

These are stored on the Convex deployment with `npx convex env set`.

- `E2B_API_KEY`: E2B API key for ephemeral sandboxes.
- `E2B_SANDBOX_TEMPLATE`: optional E2B sandbox template override. Defaults to `milo-codex`.
- `CODEX_AUTH_JSON_BASE64`: base64-encoded Codex `auth.json`.
- `OPENROUTER_API_KEY`: OpenRouter API key for server-side model calls.
- `OPENROUTER_APP_TITLE`: optional OpenRouter attribution title. Defaults to `Milo`.
- `OPENROUTER_HTTP_REFERER`: optional OpenRouter attribution URL. Defaults to `CONVEX_SITE_URL` when set.
- `OPENROUTER_APP_CATEGORIES`: optional OpenRouter attribution categories. Defaults to `cloud-agent`.
- `SLACK_CLIENT_ID`: Slack OAuth client ID.
- `SLACK_CLIENT_SECRET`: Slack OAuth client secret.
- `SLACK_SIGNING_SECRET`: Slack event and install state signing secret.
- `MICROSOFT_CLIENT_ID`: Microsoft Entra application client ID.
- `MICROSOFT_CLIENT_SECRET`: Microsoft Entra application client secret.
- `NOTION_CLIENT_ID`: Notion public connection OAuth client ID.
- `NOTION_CLIENT_SECRET`: Notion public connection OAuth client secret.

## E2B Sandbox Image

Build the pre-baked Codex sandbox image before running executions:

```sh
pnpm e2b:build
```

The image installs Node.js, git, `@openai/codex@0.139.0`, `slack-mcp-server@1.3.0`, and the workspace packages required by the provider MCP tools.
