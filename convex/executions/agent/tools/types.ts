import {
  type ToolPermission,
  type ToolSurface,
} from "../../../permissions/catalog"

export type RuntimeToolCapability = {
  surface: ToolSurface
  label: string
  tools: RuntimeToolCapabilityTool[]
}

export type RuntimeToolCapabilityTool = Pick<
  ToolPermission,
  "access" | "description" | "label" | "tool"
> & {
  requiresApproval?: boolean
}

export type RuntimeTarget =
  | {
      integration: "github"
      owner: string
      repo: string
      repositoryId?: number
      issueNumber?: number
      pullNumber?: number
      commentId: string
      commentKind: string
    }
  | {
      integration: "linear"
      issueId: string
      commentId?: string
    }
  | {
      integration: "slack"
      channelId: string
      threadId?: string
    }
