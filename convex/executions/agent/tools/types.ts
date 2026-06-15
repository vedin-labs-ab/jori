import {
  type ToolPermission,
  type ToolSurface,
} from "../../../permissions/catalog"
import { type GitHubCredentials } from "../../../providers/github/credentials"
import { type GoogleCredentials } from "../../../providers/google/credentials"
import { type LinearCredentials } from "../../../providers/linear/credentials"
import { type MicrosoftCredentials } from "../../../providers/microsoft/credentials"
import { type NotionCredentials } from "../../../providers/notion/credentials"
import { type SlackCredentials } from "../../../providers/slack/credentials"

export type ToolBundle = {
  mcpServers: McpServerConfig[]
  sandboxFiles: SandboxFile[]
  preflights: ToolPreflight[]
  promptedTools: ToolPermission[]
}

export type RuntimeToolBundle = ToolBundle & {
  skillNames: string[]
  capabilities: RuntimeToolCapability[]
}

export type RuntimeToolCapability = {
  provider: ToolSurface
  label: string
  tools: RuntimeToolCapabilityTool[]
}

export type RuntimeToolCapabilityTool = Pick<
  ToolPermission,
  "access" | "description" | "label" | "tool"
>

export type McpServerConfig = {
  name: string
  command: string
  args: string[]
  env: Record<string, string>
}

export type BrokeredToolArgs = {
  convexSiteUrl: string
  executionToken: string
}

export type SandboxFile = {
  path: string
  content: string
}

export type ToolPreflight =
  | {
      type: "github"
      credentials: GitHubCredentials
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
      type: "googleDrive"
      credentials: GoogleCredentials
    }
  | {
      type: "notion"
      credentials: NotionCredentials
    }
  | {
      type: "microsoftEmail"
      credentials: MicrosoftCredentials
    }
  | {
      type: "microsoftCalendar"
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
