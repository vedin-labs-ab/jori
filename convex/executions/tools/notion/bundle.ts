import { type NotionCredentials } from "../../../providers/notion/credentials"
import { createBrokerMcpScript } from "../adapter"
import { getProviderToolDefinitions } from "../definitions"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type BrokeredToolArgs, type ToolBundle } from "../types"

export function createNotionToolBundle(
  args: {
    broker: BrokeredToolArgs
    credentials: NotionCredentials
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: "notion",
        command: "node",
        args: ["/home/user/milo-workspace/milo-notion-mcp.mjs"],
        env: {
          MILO_CONVEX_SITE_URL: args.broker.convexSiteUrl,
          MILO_EXECUTION_TOKEN: args.broker.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/home/user/milo-workspace/milo-notion-mcp.mjs",
        content: createBrokerMcpScript({
          provider: "notion",
          tools: getProviderToolDefinitions("notion", args),
        }),
      },
    ],
    preflights: [
      {
        type: "notion",
        credentials: args.credentials,
      },
    ],
    promptedTools: getPromptedTools(args),
  }
}
