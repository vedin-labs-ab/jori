import { type ToolSurface } from "../integrations"
import { toolPermissionRows } from "./data"

export type { ToolSurface } from "../integrations"

export const internalRequiredToolNames = [
  "finish_run",
  "send_reply",
  "add_reaction",
] as const
/** Tools that need a person in the conversation, so automations never get them. */
export const interactiveToolNames = [
  "offer_integration",
  "cancel_integration_offer",
] as const

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
const internalRequiredTools = new Set<string>(internalRequiredToolNames)
const interactiveTools = new Set<string>(interactiveToolNames)

export function getToolPermission(tool: string) {
  return toolPermissionsByName.get(tool)
}

export function isInteractiveTool(tool: string) {
  return interactiveTools.has(tool)
}

export function isUserVisibleToolPermission(tool: string) {
  return !internalRequiredTools.has(tool)
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

    if (permission !== undefined && isToolPermissionConfigurable(permission)) {
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

export function isToolPermissionConfigurable(permission: ToolPermission) {
  return permission.defaultMode !== "required"
}

function matchesPermissionRoute(
  permission: ToolPermission,
  routes: readonly ToolPermissionRoute[] | undefined
) {
  return routes === undefined || routes.includes(permission.route)
}
