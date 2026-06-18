import { type ToolPermission } from "../../permissions/types"
import { type AutomationSurfaceIntegration } from "./catalog"

export type AutomationToolPermissions = ToolPermission[] | null | undefined

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
  return permission.mode === "allowed" || permission.mode === "required"
}

export function automationToolModeDescription(permission: ToolPermission) {
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
