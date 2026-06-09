import { type LinearCredentials } from "../../../providers/linear/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type ToolBundle } from "../types"

import { createLinearProxyScript } from "./script"

export function createLinearToolBundle(
  args: {
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
          MILO_LINEAR_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/home/user/milo-workspace/milo-linear-mcp.mjs",
        content: createLinearProxyScript(),
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
