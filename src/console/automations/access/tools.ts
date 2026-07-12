import { canUseAutomationTool } from "@contracts/permissions"
import { type Scope } from "@contracts/permissions/scope"
import { isWebTool } from "@contracts/permissions/web"
import { type ToolPermission } from "../../permissions/types"
import {
  type AutomationSurfaceFormValue,
  type AutomationSurfaceIntegration,
  getAutomationSurfaceLabel,
  isAutomationSurfaceIntegration,
} from "./catalog"
import { getAutomationSurfaceScopeIssue } from "./scope"

export type AutomationToolPermissions = ToolPermission[] | null | undefined
export type AutomationToolAccess =
  | { kind: "ready" | "builtIn" | "web" }
  | { integration: AutomationSurfaceIntegration; kind: "integration" }
  | { kind: "unavailable"; reason: string }

export function getDefaultAutomationSurfaceTools(
  integration: AutomationSurfaceIntegration,
  permissions: AutomationToolPermissions
) {
  if (!Array.isArray(permissions)) {
    return []
  }

  return permissions
    .filter(
      (permission) =>
        permission.surface === integration &&
        isAutomationToolSelectable(permission)
    )
    .map((permission) => permission.tool)
}

export function isAutomationToolSelectable(permission: ToolPermission) {
  return canUseAutomationTool(permission)
}

export function automationToolModeDescription(permission: ToolPermission) {
  if (
    !canUseAutomationTool(permission) &&
    (permission.mode === "allowed" || permission.mode === "required")
  ) {
    return "This tool needs an active conversation and cannot run in automations."
  }

  if (permission.mode === "prompted") {
    return "Requires approval in Integrations and cannot run in automations."
  }

  if (permission.mode === "blocked") {
    return "Blocked in Integrations."
  }

  return permission.mode === "required"
    ? "Allowed for automations."
    : "Allowed in Integrations."
}

export function resolveAutomationToolAccess({
  permission,
  surfaces,
  webSearch,
}: {
  permission: ToolPermission
  surfaces?: readonly AutomationSurfaceFormValue[]
  webSearch?: boolean
}): AutomationToolAccess {
  if (!isAutomationToolSelectable(permission)) {
    return {
      kind: "unavailable",
      reason: automationToolModeDescription(permission),
    }
  }

  if (isWebTool(permission.tool)) {
    return { kind: webSearch ? "ready" : "web" }
  }

  if (!isAutomationSurfaceIntegration(permission.surface)) {
    return { kind: "builtIn" }
  }

  const surface = surfaces?.find(
    (item) => item.integration === permission.surface
  )

  return surface?.tools.includes(permission.tool)
    ? { kind: "ready" }
    : { kind: "integration", integration: permission.surface }
}

export function automationToolReferenceIssue({
  permissions,
  scope,
  surfaces,
  tool,
  webSearch,
}: {
  permissions: AutomationToolPermissions
  scope: Scope
  surfaces: readonly AutomationSurfaceFormValue[]
  tool: string
  webSearch: boolean
}) {
  if (!Array.isArray(permissions)) {
    return undefined
  }

  const permission = permissions.find((item) => item.tool === tool)

  if (permission === undefined) {
    return `#${tool} is not an available automation tool.`
  }

  const scopeIssue = automationPermissionScopeIssue(permission, scope)

  if (scopeIssue !== undefined) {
    return scopeIssue
  }

  const access = resolveAutomationToolAccess({
    permission,
    surfaces,
    webSearch,
  })

  if (access.kind === "integration") {
    return `Give @${getAutomationSurfaceLabel(access.integration)} access to use #${tool}.`
  }
  if (access.kind === "web") {
    return `Enable web access to use #${tool}.`
  }
  if (access.kind === "unavailable") {
    return `#${tool} is not available in automations.`
  }

  return undefined
}

export function automationToolScopeIssue({
  permissions,
  scope,
  tool,
}: {
  permissions: AutomationToolPermissions
  scope: Scope
  tool: string
}) {
  if (!Array.isArray(permissions)) {
    return undefined
  }

  const permission = permissions.find((item) => item.tool === tool)

  return permission === undefined
    ? undefined
    : automationPermissionScopeIssue(permission, scope)
}

function automationPermissionScopeIssue(
  permission: ToolPermission,
  scope: Scope
) {
  return isAutomationSurfaceIntegration(permission.surface)
    ? getAutomationSurfaceScopeIssue(scope, permission.surface)
    : undefined
}
