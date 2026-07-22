import { type ToolSurface } from "../integrations"

export type PermissionMode = "required" | "allowed" | "prompted" | "blocked"
export type ConfigurablePermissionMode = Exclude<PermissionMode, "required">
export type ToolPermissionRoute =
  | "broker"
  | "sandbox"
  | "agent"
  | "run"
  | "surface"
export type ToolAccess = "read" | "write"
export type ToolPermission = {
  tool: string
  surface: ToolSurface
  label: string
  /** User-facing: shown in permission settings and capability lists. */
  description: string
  /** Agent-facing: the tool description the model reads when choosing to call. */
  usage: string
  route: ToolPermissionRoute
  access: ToolAccess
  defaultMode: PermissionMode
}

export type ToolCapability = Pick<
  ToolPermission,
  "access" | "description" | "label" | "tool"
> & {
  requiresApproval?: boolean
}

export type UserVisibleToolPermission = Omit<
  ToolPermission,
  "defaultMode" | "usage"
> & {
  defaultMode?: PermissionMode
  mode: PermissionMode
  overrideMode: ConfigurablePermissionMode | null
}

export type PermissionOverride = {
  tool: string
  mode: ConfigurablePermissionMode
}

export type ToolPermissionRow = readonly [
  surface: ToolSurface,
  tool: string,
  label: string,
  description: string,
  usage: string,
  access: ToolAccess,
  defaultMode?: PermissionMode,
  route?: ToolPermissionRoute,
]
