import { type Doc } from "../_generated/dataModel"
import {
  type GitHubCredentials,
  requireGitHubCredentials,
} from "../providers/github/credentials"
import {
  type GoogleCredentials,
  requireGoogleCredentials,
} from "../providers/google/credentials"
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
import { createGitHubToolBundle } from "./github"
import { createGmailToolBundle, createGoogleCalendarToolBundle } from "./google"
import { createLinearProxyScript } from "./linear"
import { createMicrosoftToolBundle } from "./microsoft"
import { createMiloMcpScript } from "./milo"
import { createSlackToolBundle } from "./slack"

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
      type: "github"
      credentials: GitHubCredentials
      owner: string
      repo: string
    }
  | {
      type: "linear"
      credentials: LinearCredentials
    }
  | {
      type: "slack"
      credentials: SlackCredentials
    }
  | {
      type: "gmail"
      credentials: GoogleCredentials
    }
  | {
      type: "googleCalendar"
      credentials: GoogleCredentials
    }
  | {
      type: "microsoft"
      credentials: MicrosoftCredentials
    }

export type RuntimeTarget =
  | {
      provider: "github"
      owner: string
      repo: string
      repositoryId?: number
      issueNumber?: number
      pullNumber?: number
      commentId: string
      commentKind: string
    }
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
  integrations: Doc<"integrations">[]
  target: RuntimeTarget
}): ToolBundle {
  const bundles = [
    createMiloToolBundle({
      convexSiteUrl: args.milo.convexSiteUrl,
      executionToken: args.milo.executionToken,
    }),
  ]

  for (const integration of args.integrations) {
    const integrationBundle = createIntegrationToolBundle({
      integration,
      target: args.target,
    })

    if (integrationBundle !== null) {
      bundles.push(integrationBundle)
    }
  }

  return {
    mcpServers: bundles.flatMap((bundle) => bundle.mcpServers),
    sandboxFiles: bundles.flatMap((bundle) => bundle.sandboxFiles),
    preflights: bundles.flatMap((bundle) => bundle.preflights),
  }
}

function createIntegrationToolBundle(args: {
  integration: Doc<"integrations">
  target: RuntimeTarget
}) {
  if (args.integration.provider === "linear") {
    const credentials = requireLinearCredentials(args.integration)

    return createLinearToolBundle({
      credentials,
      defaultIssueId:
        args.target.provider === "linear" ? args.target.issueId : undefined,
    })
  }

  if (
    args.integration.provider === "github" &&
    args.target.provider === "github"
  ) {
    const credentials = requireGitHubCredentials(args.integration)

    return createGitHubToolBundle({
      credentials,
      owner: args.target.owner,
      repo: args.target.repo,
      issueNumber: args.target.issueNumber,
      pullNumber: args.target.pullNumber,
      commentId: args.target.commentId,
      commentKind: args.target.commentKind,
    })
  }

  if (args.integration.provider === "slack") {
    const credentials = requireSlackCredentials(args.integration)

    return createSlackToolBundle({
      accountId: args.integration.accountId,
      credentials,
    })
  }

  if (args.integration.provider === "gmail") {
    const credentials = requireGoogleCredentials(args.integration)

    return createGmailToolBundle({
      accountEmail: args.integration.accountId,
      credentials,
    })
  }

  if (args.integration.provider === "googleCalendar") {
    const credentials = requireGoogleCredentials(args.integration)

    return createGoogleCalendarToolBundle({
      credentials,
    })
  }

  if (args.integration.provider === "microsoft") {
    const credentials = requireMicrosoftCredentials(args.integration)

    return createMicrosoftToolBundle({
      credentials,
      target: args.target.provider === "microsoft" ? args.target : {},
    })
  }

  return null
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
  defaultIssueId?: string
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "linear",
        command: "node",
        args: ["/tmp/milo-workspace/milo-linear-mcp.mjs"],
        env: {
          MILO_LINEAR_ACCESS_TOKEN: args.credentials.accessToken,
          ...(args.defaultIssueId === undefined
            ? {}
            : { MILO_LINEAR_DEFAULT_ISSUE_ID: args.defaultIssueId }),
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
