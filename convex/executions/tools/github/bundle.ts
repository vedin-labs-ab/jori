import { type GitHubCredentials } from "../../../providers/github/credentials"
import { createBrokerMcpScript } from "../adapter"
import { getProviderToolDefinitions } from "../definitions"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type BrokeredToolArgs, type ToolBundle } from "../types"

export function createGitHubToolBundle(
  args: {
    broker: BrokeredToolArgs
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
        args: ["/home/user/milo-workspace/milo-github-mcp.mjs"],
        env: {
          MILO_CONVEX_SITE_URL: args.broker.convexSiteUrl,
          MILO_EXECUTION_TOKEN: args.broker.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/home/user/milo-workspace/milo-github-mcp.mjs",
        content: createBrokerMcpScript({
          provider: "github",
          tools: getProviderToolDefinitions("github", args),
        }),
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
