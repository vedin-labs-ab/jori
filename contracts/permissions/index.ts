import { type ToolSurface } from "../integrations"
import { toolPermissionRows } from "./catalog"
import {
  type PermissionMode,
  type PermissionOverride,
  type ToolCapability,
  type ToolPermission,
  type ToolPermissionRoute,
} from "./types"

export type { ToolSurface } from "../integrations"
export type {
  ConfigurablePermissionMode,
  PermissionMode,
  PermissionOverride,
  ToolAccess,
  ToolCapability,
  ToolPermission,
  ToolPermissionRoute,
  UserVisibleToolPermission,
} from "./types"

export function summarizeToolCapabilities(
  tools: readonly Pick<ToolCapability, "access" | "requiresApproval">[]
) {
  const summary = {
    read: 0,
    readRequiresApproval: false,
    write: 0,
    writeRequiresApproval: false,
  }

  for (const tool of tools) {
    summary[tool.access] += 1

    if (tool.requiresApproval === true) {
      if (tool.access === "read") {
        summary.readRequiresApproval = true
      } else {
        summary.writeRequiresApproval = true
      }
    }
  }

  return summary
}

export const internalRequiredToolNames = [
  "finish_run",
  "send_reply",
  "add_reaction",
] as const
/** Tools that need a person in the conversation, so automations never get them. */
const interactiveToolNames = [
  "offer_integration",
  "cancel_integration_offer",
] as const

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

function isInteractiveTool(tool: string) {
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

export function canUseAutomationTool(input: {
  mode: PermissionMode
  tool: string
}) {
  return !isInteractiveTool(input.tool) && isUnattendedToolMode(input.mode)
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
