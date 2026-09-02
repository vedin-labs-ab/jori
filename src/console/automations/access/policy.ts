import { canUseAutomationTool } from "@contracts/permissions"
import { type ToolPermission } from "../../permissions/types"
import {
  type AutomationSurfaceFormValue,
  getAutomationSurfaceLabel,
} from "./catalog"

export type AutomationPolicyPermissions = ToolPermission[] | null | undefined

export function automationPolicyKey(permissions: AutomationPolicyPermissions) {
  if (permissions === undefined) {
    return "loading"
  }

  if (permissions === null) {
    return "unavailable"
  }

  return permissions
    .map((permission) => `${permission.tool}:${permission.mode}`)
    .sort()
    .join("|")
}

export function validateAutomationPolicy({
  permissions,
  surfaces,
}: {
  permissions: AutomationPolicyPermissions
  surfaces: AutomationSurfaceFormValue[]
}) {
  if (permissions === undefined) {
    return "Job permissions are still loading."
  }

  if (permissions === null) {
    return "Sign in again to manage job permissions."
  }

  const blockedSurface = surfaces.find((surface) =>
    isAutomationSurfacePolicyBlocked({ permissions, surface })
  )

  if (blockedSurface === undefined) {
    return undefined
  }

  return `${getAutomationSurfaceLabel(blockedSurface.integration)} has tools that are not available for jobs.`
}

export function isAutomationSurfacePolicyBlocked({
  permissions,
  surface,
}: {
  permissions: AutomationPolicyPermissions
  surface: AutomationSurfaceFormValue
}) {
  if (!Array.isArray(permissions) || surface.tools.length === 0) {
    return false
  }

  const permissionsByTool = new Map(
    permissions.map((permission) => [permission.tool, permission])
  )

  return surface.tools.some((tool) => {
    const permission = permissionsByTool.get(tool)

    return (
      permission === undefined ||
      permission.surface !== surface.integration ||
      !canUseAutomationTool(permission)
    )
  })
}
