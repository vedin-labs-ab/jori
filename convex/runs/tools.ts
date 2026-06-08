import { type Doc } from "../_generated/dataModel"
import {
  requireSlackCredentials,
  type SlackCredentials,
} from "../providers/slack/credentials"
import { createMiloMcpScript } from "./milo"
import { createSlackProxyScript } from "./proxy"

export type ToolBundle = {
  mcpServers: McpServerConfig[]
  sandboxFiles: SandboxFile[]
  preflights: ToolPreflight[]
}

export type McpServerConfig = {
  name: string
  command: string
  args: string[]
  env: Record<string, string>
}

export type SandboxFile = {
  path: string
  content: string
}

export type ToolPreflight = {
  type: "slack"
  credentials: SlackCredentials
}

export type RuntimeTarget = {
  provider: "slack"
  channelId: string
  threadId?: string
}

export function assembleToolsForRun(args: {
  milo: {
    convexSiteUrl: string
    executionToken: string
  }
  slack?: {
    integration: Doc<"integrations">
    target: RuntimeTarget
  }
}): ToolBundle {
  const bundles = [
    createMiloToolBundle({
      convexSiteUrl: args.milo.convexSiteUrl,
      executionToken: args.milo.executionToken,
    }),
  ]

  if (args.slack?.target.provider === "slack") {
    const credentials = requireSlackCredentials(args.slack.integration)

    bundles.push(
      createSlackToolBundle({
        credentials,
        channelId: args.slack.target.channelId,
      })
    )
  }

  return {
    mcpServers: bundles.flatMap((bundle) => bundle.mcpServers),
    sandboxFiles: bundles.flatMap((bundle) => bundle.sandboxFiles),
    preflights: bundles.flatMap((bundle) => bundle.preflights),
  }
}

function createMiloToolBundle(args: {
  convexSiteUrl: string
  executionToken: string
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "milo",
        command: "node",
        args: ["/tmp/milo-workspace/milo-mcp.mjs"],
        env: {
          MILO_CONVEX_SITE_URL: args.convexSiteUrl,
          MILO_EXECUTION_TOKEN: args.executionToken,
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
  }
}

function createSlackToolBundle(args: {
  credentials: SlackCredentials
  channelId: string
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "slack",
        command: "node",
        args: ["/tmp/milo-workspace/milo-slack-mcp-proxy.mjs"],
        env: {
          MILO_SLACK_ALLOWED_CHANNEL_ID: args.channelId,
          MILO_SLACK_BOT_TOKEN: args.credentials.bot,
          MILO_SLACK_USER_TOKEN: args.credentials.user,
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-slack-mcp-proxy.mjs",
        content: createSlackProxyScript(),
      },
    ],
    preflights: [
      {
        type: "slack",
        credentials: args.credentials,
      },
    ],
  }
}
