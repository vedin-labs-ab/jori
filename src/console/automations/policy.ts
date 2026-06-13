import { type ToolAccess, type ToolPermission } from "../permissions/controller"
import {
  type AutomationReadScope,
  type AutomationSurfaceFormValue,
  type AutomationSurfaceProvider,
  getAutomationSurfaceAccessLabel,
  getAutomationSurfaceLabel,
} from "./surfaces"

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
  readScope,
  surfaces,
}: {
  permissions: AutomationPolicyPermissions
  readScope: AutomationReadScope
  surfaces: AutomationSurfaceFormValue[]
}) {
  if (permissions === undefined) {
    return "Automation permissions are still loading."
  }

  if (permissions === null) {
    return "Sign in again to manage automation permissions."
  }

  const blockedSurface = surfaces.find((surface) =>
    isAutomationSurfacePolicyBlocked({ permissions, readScope, surface })
  )

  if (blockedSurface === undefined) {
    return undefined
  }

  return `${getAutomationSurfaceLabel(blockedSurface.provider)} ${blockedAccessLabel(
    blockedSurface,
    readScope,
    permissions
  )} access is not available for automations.`
}

export function isAutomationSurfacePolicyBlocked({
  permissions,
  readScope,
  surface,
}: {
  permissions: AutomationPolicyPermissions
  readScope: AutomationReadScope
  surface: AutomationSurfaceFormValue
}) {
  if (!Array.isArray(permissions) || surface.access === "") {
    return false
  }

  return requiredToolAccesses(surface.access, readScope).some(
    (access) =>
      !canUseAutomationProviderAccess(permissions, surface.provider, access)
  )
}

function blockedAccessLabel(
  surface: AutomationSurfaceFormValue,
  readScope: AutomationReadScope,
  permissions: ToolPermission[]
) {
  const blockedAccesses = requiredToolAccesses(
    surface.access,
    readScope
  ).filter(
    (access) =>
      !canUseAutomationProviderAccess(permissions, surface.provider, access)
  )

  if (blockedAccesses.length === 1) {
    return blockedAccesses[0]
  }

  return getAutomationSurfaceAccessLabel(surface.access).toLowerCase()
}

function canUseAutomationProviderAccess(
  permissions: ToolPermission[],
  provider: AutomationSurfaceProvider,
  access: ToolAccess
) {
  return permissions.some(
    (permission) =>
      permission.provider === provider &&
      permission.access === access &&
      isUnattendedMode(permission.mode)
  )
}

function isUnattendedMode(mode: ToolPermission["mode"]) {
  return mode === "allowed" || mode === "required"
}

function requiredToolAccesses(
  access: AutomationSurfaceFormValue["access"],
  readScope: AutomationReadScope
): ToolAccess[] {
  if (access === "both") {
    return readScope === "allConnected" ? ["write"] : ["read", "write"]
  }

  return access === "" ? [] : [access]
}
