import { codexHome, workspace } from "../../sandbox/harness"
import { getSurfaceToolDefinitions } from "../definitions"
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
        args: ["/home/user/milo-workspace/milo-mcp.mjs"],
        env: {
          MILO_CONVEX_SITE_URL: args.convexSiteUrl,
          MILO_CODEX_HOME: codexHome,
          MILO_EXECUTION_TOKEN: args.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
          MILO_WORKSPACE: workspace,
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/home/user/milo-workspace/milo-mcp.mjs",
        content: createMiloMcpScript({
          tools: getSurfaceToolDefinitions("milo", args),
        }),
      },
    ],
    preflights: [],
    promptedTools: getPromptedTools(args),
  }
}
