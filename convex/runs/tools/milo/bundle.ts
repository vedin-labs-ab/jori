import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type ToolBundle } from "../types"
import { createMiloMcpScript } from "./script"

export function createMiloToolBundle(
  args: {
    convexSiteUrl: string
    executionToken: string
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: "milo",
        command: "node",
        args: ["/tmp/milo-workspace/milo-mcp.mjs"],
        env: {
          MILO_CONVEX_SITE_URL: args.convexSiteUrl,
          MILO_EXECUTION_TOKEN: args.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-mcp.mjs",
        content: createMiloMcpScript(),
      },
    ],
    preflights: [],
    promptedTools: getPromptedTools(args),
  }
}
