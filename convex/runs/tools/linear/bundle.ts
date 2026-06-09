import { type LinearCredentials } from "../../../providers/linear/credentials"
import { createBrokerMcpScript } from "../adapter"
import { getProviderToolDefinitions } from "../definitions"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type BrokeredToolArgs, type ToolBundle } from "../types"

export function createLinearToolBundle(
  args: {
    broker: BrokeredToolArgs
    credentials: LinearCredentials
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: "linear",
        command: "node",
        args: ["/home/user/milo-workspace/milo-linear-mcp.mjs"],
        env: {
          MILO_CONVEX_SITE_URL: args.broker.convexSiteUrl,
          MILO_EXECUTION_TOKEN: args.broker.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/home/user/milo-workspace/milo-linear-mcp.mjs",
        content: createBrokerMcpScript({
          provider: "linear",
          tools: getProviderToolDefinitions("linear"),
        }),
      },
    ],
    preflights: [
      {
        type: "linear",
        credentials: args.credentials,
      },
    ],
    promptedTools: getPromptedTools(args),
  }
}
