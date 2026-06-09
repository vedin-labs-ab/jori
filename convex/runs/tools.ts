import { type Doc } from "../_generated/dataModel"
import {
  type LinearCredentials,
  requireLinearCredentials,
} from "../providers/linear/credentials"
import {
  requireSlackCredentials,
  type SlackCredentials,
} from "../providers/slack/credentials"
import { createLinearProxyScript } from "./linear"
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

export type ToolPreflight =
  | {
      type: "linear"
      credentials: LinearCredentials
    }
  | {
      type: "slack"
      credentials: SlackCredentials
    }

export type RuntimeTarget =
  | {
      provider: "linear"
      issueId: string
      commentId?: string
    }
  | {
      provider: "slack"
      channelId: string
      threadId?: string
    }

export function assembleToolsForRun(args: {
  milo: {
    convexSiteUrl: string
    executionToken: string
  }
  integration?: {
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

  if (args.integration?.target.provider === "linear") {
    const credentials = requireLinearCredentials(args.integration.integration)

    bundles.push(
      createLinearToolBundle({
        credentials,
        issueId: args.integration.target.issueId,
      })
    )
  }

  if (args.integration?.target.provider === "slack") {
    const credentials = requireSlackCredentials(args.integration.integration)

    bundles.push(
      createSlackToolBundle({
        credentials,
        channelId: args.integration.target.channelId,
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

function createLinearToolBundle(args: {
  credentials: LinearCredentials
  issueId: string
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "linear",
        command: "node",
        args: ["/tmp/milo-workspace/milo-linear-mcp.mjs"],
        env: {
          MILO_LINEAR_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_LINEAR_ALLOWED_ISSUE_ID: args.issueId,
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-linear-mcp.mjs",
        content: createLinearProxyScript(),
      },
    ],
    preflights: [
      {
        type: "linear",
        credentials: args.credentials,
      },
    ],
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
