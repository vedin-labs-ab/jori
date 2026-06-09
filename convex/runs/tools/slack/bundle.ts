import { type SlackCredentials } from "../../../providers/slack/credentials"
import { createBrokerMcpScript } from "../adapter"
import { getProviderToolDefinitions } from "../definitions"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type BrokeredToolArgs, type ToolBundle } from "../types"
export function createSlackToolBundle(
  args: {
    accountId: string
    broker: BrokeredToolArgs
    credentials: SlackCredentials
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: "slack",
        command: "node",
        args: ["/home/user/milo-workspace/milo-slack-mcp.mjs"],
        env: {
          MILO_CONVEX_SITE_URL: args.broker.convexSiteUrl,
          MILO_EXECUTION_TOKEN: args.broker.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/home/user/milo-workspace/milo-slack-mcp.mjs",
        content: createBrokerMcpScript({
          provider: "slack",
          tools: getProviderToolDefinitions("slack"),
        }),
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
