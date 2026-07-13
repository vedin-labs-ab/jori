import {
  type ToolPermission,
  type ToolSurface,
} from "../../../../contracts/permissions"

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
