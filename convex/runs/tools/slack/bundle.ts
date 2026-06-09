import { type SlackCredentials } from "../../../providers/slack/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { createSlackProxyScript } from "../proxy"
import { type ToolBundle } from "../types"
export function createSlackToolBundle(
  args: {
    accountId: string
    credentials: SlackCredentials
  } & ToolPermissionInput
): ToolBundle {
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
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
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
    promptedTools: getPromptedTools(args),
  }
}
