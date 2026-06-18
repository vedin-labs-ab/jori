import { codexHome, workspace } from "../../sandbox/harness"
import { createToolDefinitionsEnv } from "../adapter"
import { getSurfaceToolDefinitions } from "../definitions"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type ToolBundle } from "../types"
import {
  createArtifactBuilderConfigFile,
  createArtifactBuilderFiles,
  createArtifactTemplateFiles,
} from "./artifacts"
import { createMiloMcpFiles, createMiloMcpScript } from "./script"

export function createMiloToolBundle(
  args: {
    convexSiteUrl: string
    executionToken: string
  } & ToolPermissionInput
): ToolBundle {
  const tools = getSurfaceToolDefinitions("milo", args)

  return {
    mcpServers: [
      {
        name: "milo",
        command: "node",
        args: [
          "--experimental-strip-types",
          "/home/user/milo-workspace/milo-mcp.ts",
        ],
        env: {
          MILO_CONVEX_SITE_URL: args.convexSiteUrl,
          MILO_CODEX_HOME: codexHome,
          MILO_EXECUTION_TOKEN: args.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
          MILO_TOOL_DEFINITIONS_BASE64: createToolDefinitionsEnv(tools),
          MILO_WORKSPACE: workspace,
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/home/user/milo-workspace/milo-mcp.ts",
        content: createMiloMcpScript({
          tools,
        }),
      },
      ...createMiloMcpFiles(),
      ...createArtifactBuilderFiles(),
      createArtifactBuilderConfigFile(),
      ...createArtifactTemplateFiles(),
    ],
    preflights: [],
    promptedTools: getPromptedTools(args),
  }
}
