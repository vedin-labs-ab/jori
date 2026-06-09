import { type GitHubCredentials } from "../../../providers/github/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type ToolBundle } from "../types"

import { createGitHubMcpScript } from "./script"

export function createGitHubToolBundle(
  args: {
    credentials: GitHubCredentials
  } & ToolPermissionInput
): ToolBundle {
  if (args.credentials.token === undefined) {
    throw new Error("Missing GitHub runtime token")
  }

  return {
    mcpServers: [
      {
        name: "github",
        command: "node",
        args: ["/tmp/milo-workspace/milo-github-mcp.mjs"],
        env: {
          MILO_GITHUB_TOKEN: args.credentials.token,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-github-mcp.mjs",
        content: createGitHubMcpScript(),
      },
    ],
    preflights: [
      {
        type: "github",
        credentials: args.credentials,
      },
    ],
    promptedTools: getPromptedTools(args),
  }
}
