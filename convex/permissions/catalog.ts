import { toolPermissionRows } from "./data"

export const permissionModes = [
  "required",
  "allowed",
  "prompted",
  "blocked",
] as const
export const toolAccessLevels = ["read", "write"] as const

export type PermissionMode = (typeof permissionModes)[number]
export type ConfigurablePermissionMode = Exclude<PermissionMode, "required">
export type ToolAccess = (typeof toolAccessLevels)[number]
export type ToolProvider =
  | "milo"
  | "slack"
  | "linear"
  | "github"
  | "gmail"
  | "googleCalendar"
  | "notion"
  | "microsoftEmail"
  | "microsoftCalendar"

export type ToolPermission = {
  tool: string
  provider: ToolProvider
  label: string
  description: string
  access: ToolAccess
  defaultMode: PermissionMode
}

export type PermissionOverride = {
  tool: string
  mode: ConfigurablePermissionMode
}

export type ToolPermissionRow = readonly [
  provider: ToolProvider,
  tool: string,
  label: string,
  description: string,
  access: ToolAccess,
  defaultMode?: PermissionMode,
]

export const toolPermissions = toolPermissionRows.map(
  ([provider, tool, label, description, access, defaultMode]) => ({
    provider,
    tool,
    label,
    description,
    access,
    defaultMode: defaultMode ?? (access === "read" ? "allowed" : "prompted"),
  })
) satisfies ToolPermission[]

const toolPermissionsByName = new Map(
  toolPermissions.map((permission) => [permission.tool, permission])
)

export function getToolPermission(tool: string) {
  return toolPermissionsByName.get(tool)
}

export function getToolPermissionsByProvider(provider: ToolProvider) {
  return toolPermissions.filter(
    (permission) => permission.provider === provider
  )
}

export function resolveToolModes(overrides: PermissionOverride[]) {
  const modes = new Map<string, PermissionMode>(
    toolPermissions.map((permission) => [
      permission.tool,
      permission.defaultMode,
    ])
  )

  for (const override of overrides) {
    const permission = getToolPermission(override.tool)

    if (
      permission !== undefined &&
      permission.defaultMode !== "required" &&
      isModeAllowed(permission, override.mode)
    ) {
      modes.set(override.tool, override.mode)
    }
  }

  return modes
}

export function resolveToolMode(
  modes: ReadonlyMap<string, PermissionMode>,
  tool: string
) {
  return modes.get(tool) ?? getToolPermission(tool)?.defaultMode ?? "blocked"
}

export function isModeAllowed(
  permission: ToolPermission,
  mode: ConfigurablePermissionMode
) {
  if (permission.defaultMode === "required") {
    return false
  }

  return permission.access === "write" || mode !== "prompted"
}
