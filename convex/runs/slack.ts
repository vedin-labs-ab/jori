import { slackBotScopes, slackUserScopes } from "../providers/slack/config"
import { type SlackCredentials } from "../providers/slack/credentials"
import { createSlackProxyScript } from "./proxy"
import { type ToolBundle } from "./tools"

export function createSlackToolBundle(args: {
  accountId: string
  credentials: SlackCredentials
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "slack",
        command: "node",
        args: ["/tmp/milo-workspace/milo-slack-mcp-proxy.mjs"],
        env: {
          MILO_SLACK_CACHE_KEY: args.accountId,
          MILO_SLACK_BOT_TOKEN: args.credentials.bot,
          MILO_SLACK_USER_TOKEN: args.credentials.user,
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-slack-mcp-proxy.mjs",
        content: createSlackProxyScript(),
      },
    ],
    preflights: [
      {
        type: "slack",
        credentials: args.credentials,
      },
    ],
  }
}

export function createSlackTokenPreflightCommand() {
  return slackTokenPreflightCommand
}

const slackTokenPreflightCommand = [
  "node <<'NODE'",
  `const requiredBotScopes = ${JSON.stringify(slackBotScopes)};`,
  `const requiredUserScopes = ${JSON.stringify(slackUserScopes)};`,
  "",
  "async function main() {",
  "  await verifyToken('bot', process.env.MILO_SLACK_BOT_TOKEN, requiredBotScopes);",
  "  await verifyToken('user', process.env.MILO_SLACK_USER_TOKEN, requiredUserScopes);",
  "  console.log('Slack token preflight passed');",
  "}",
  "",
  "async function verifyToken(label, token, requiredScopes) {",
  "  if (!token) {",
  "    throw new Error('Missing Slack ' + label + ' token');",
  "  }",
  "",
  "  const response = await fetch('https://slack.com/api/auth.test', {",
  "    headers: { authorization: 'Bearer ' + token },",
  "  });",
  "  const body = await response.json();",
  "",
  "  if (!response.ok || body.ok !== true) {",
  "    throw new Error('Slack ' + label + ' token auth.test failed: ' + JSON.stringify(body));",
  "  }",
  "",
  "  const scopes = new Set(",
  "    (response.headers.get('x-oauth-scopes') ?? '')",
  "      .split(',')",
  "      .map((scope) => scope.trim())",
  "      .filter(Boolean)",
  "  );",
  "  const missingScopes = requiredScopes.filter((scope) => !scopes.has(scope));",
  "",
  "  if (missingScopes.length > 0) {",
  "    throw new Error('Slack ' + label + ' token is missing scopes: ' + missingScopes.join(', '));",
  "  }",
  "}",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")
