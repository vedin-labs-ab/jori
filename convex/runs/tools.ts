import { type Doc } from "../_generated/dataModel"
import {
  type LinearCredentials,
  requireLinearCredentials,
} from "../providers/linear/credentials"
import {
  type MicrosoftCredentials,
  requireMicrosoftCredentials,
} from "../providers/microsoft/credentials"
import {
  requireSlackCredentials,
  type SlackCredentials,
} from "../providers/slack/credentials"
import { createLinearProxyScript } from "./linear"
import { createMicrosoftGraphMcpScript } from "./microsoft"
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
  | {
      type: "microsoft"
      credentials: MicrosoftCredentials
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
  | {
      provider: "microsoft"
      chatId?: string
      teamId?: string
      channelId?: string
      messageId?: string
      replyId?: string
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

  if (args.integration?.target.provider === "microsoft") {
    const credentials = requireMicrosoftCredentials(
      args.integration.integration
    )

    bundles.push(
      createMicrosoftToolBundle({
        credentials,
        target: args.integration.target,
      })
    )
  }

  return {
    mcpServers: bundles.flatMap((bundle) => bundle.mcpServers),
    sandboxFiles: bundles.flatMap((bundle) => bundle.sandboxFiles),
    preflights: bundles.flatMap((bundle) => bundle.preflights),
  }
}

function createMicrosoftToolBundle(args: {
  credentials: MicrosoftCredentials
  target: Extract<RuntimeTarget, { provider: "microsoft" }>
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "microsoft",
        command: "node",
        args: ["/tmp/milo-workspace/milo-microsoft-mcp.mjs"],
        env: {
          MILO_MICROSOFT_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_MICROSOFT_TARGET_JSON: JSON.stringify(args.target),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-microsoft-mcp.mjs",
        content: createMicrosoftGraphMcpScript(),
      },
    ],
    preflights: [
      {
        type: "microsoft",
        credentials: args.credentials,
      },
    ],
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
