import { workspace } from "../sandbox/harness"
import { createBrokerMcpScript } from "./adapter"
import { getSurfaceToolDefinitions } from "./definitions"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "./policy"
import {
  type BrokeredToolArgs,
  type ToolBundle,
  type ToolPreflight,
} from "./types"

export function createBrokeredToolBundle(
  args: {
    broker: BrokeredToolArgs
    preflight: ToolPreflight
  } & ToolPermissionInput
): ToolBundle {
  const surface = args.preflight.type
  const scriptPath = `${workspace}/milo-${toKebabCase(surface)}-mcp.mjs`

  return {
    mcpServers: [
      {
        name: surface,
        command: "node",
        args: [scriptPath],
        env: {
          MILO_CONVEX_SITE_URL: args.broker.convexSiteUrl,
          MILO_EXECUTION_TOKEN: args.broker.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: scriptPath,
        content: createBrokerMcpScript({
          surface,
          tools: getSurfaceToolDefinitions(surface, args),
        }),
      },
    ],
    preflights: [args.preflight],
    promptedTools: getPromptedTools(args),
  }
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}
