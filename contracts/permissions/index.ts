import { type ToolSurface } from "../integrations"
import { toolPermissionRows } from "./data"

export type { ToolSurface } from "../integrations"

export const permissionModes = [
  "required",
  "allowed",
  "prompted",
  "blocked",
] as const
export const toolPermissionRoutes = [
  "broker",
  "sandbox",
  "agent",
  "run",
  "surface",
] as const
export const toolAccessLevels = ["read", "write"] as const

export type PermissionMode = (typeof permissionModes)[number]
export type ConfigurablePermissionMode = Exclude<PermissionMode, "required">
export type ToolPermissionRoute = (typeof toolPermissionRoutes)[number]
export type ToolAccess = (typeof toolAccessLevels)[number]
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

export type ResolvedToolPermission = Omit<ToolPermission, "defaultMode"> & {
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

export const toolPermissions = toolPermissionRows.map(
  ([surface, tool, label, description, usage, access, defaultMode, route]) => ({
    surface,
    tool,
    label,
    description,
    usage,
    access,
    defaultMode: defaultMode ?? "allowed",
    route: route ?? "broker",
  })
) satisfies ToolPermission[]

const toolPermissionsByName = new Map(
  toolPermissions.map((permission) => [permission.tool, permission])
)

export function getToolPermission(tool: string) {
  return toolPermissionsByName.get(tool)
}

export function getToolPermissionsBySurface(
  surface: ToolSurface,
  options: {
    routes?: readonly ToolPermissionRoute[]
  } = {}
) {
  return toolPermissions.filter(
    (permission) =>
      permission.surface === surface &&
      matchesPermissionRoute(permission, options.routes)
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

export function canUseToolMode(
  mode: PermissionMode,
  executionType: "automation" | "message"
) {
  if (mode === "blocked") {
    return false
  }

  return executionType === "message" || mode !== "prompted"
}

export function isUnattendedToolMode(mode: PermissionMode) {
  return mode === "allowed" || mode === "required"
}

export function isModeAllowed(
  permission: ToolPermission,
  _mode: ConfigurablePermissionMode
) {
  return permission.defaultMode !== "required"
}

function matchesPermissionRoute(
  permission: ToolPermission,
  routes: readonly ToolPermissionRoute[] | undefined
) {
  return routes === undefined || routes.includes(permission.route)
}
