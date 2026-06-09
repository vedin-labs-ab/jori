import { type NotionCredentials } from "../../../providers/notion/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type ToolBundle } from "../types"
import { createNotionProxyScript } from "./script"

export function createNotionToolBundle(
  args: {
    credentials: NotionCredentials
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: "notion",
        command: "node",
        args: ["/tmp/milo-workspace/milo-notion-mcp.mjs"],
        env: {
          MILO_NOTION_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-notion-mcp.mjs",
        content: createNotionProxyScript(),
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
