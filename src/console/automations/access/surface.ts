import { type ToolPermission } from "../../permissions/types"
import {
  type AutomationSurfaceAccess,
  type AutomationSurfaceFormValue,
} from "./catalog"

export function hasAutomationWriteSurface(
  surfaces: AutomationSurfaceFormValue[],
  permissions: ToolPermission[]
) {
  return surfaces.some((surface) =>
    getSelectedAutomationSurfacePermissions(surface, permissions).some(
      (permission) => permission.access === "write"
    )
  )
}

export function getAutomationSurfaceAccess(
  surface: AutomationSurfaceFormValue,
  permissions: ToolPermission[] | null | undefined
): AutomationSurfaceAccess | "" {
  if (!Array.isArray(permissions)) {
    return surface.tools.length === 0 ? "" : "both"
  }

  const selected = getSelectedAutomationSurfacePermissions(surface, permissions)
  const read = selected.some((permission) => permission.access === "read")
  const write = selected.some((permission) => permission.access === "write")

  if (read && write) {
    return "both"
  }
  if (read) {
    return "read"
  }

  return write ? "write" : ""
}

export function getAutomationSurfaceAccessLabel(
  access: AutomationSurfaceAccess | ""
) {
  if (access === "") {
    return "No tools"
  }
  if (access === "both") {
    return "Read/write"
  }

  return access === "read" ? "Read" : "Write"
}

export function getSelectedAutomationSurfacePermissions(
  surface: AutomationSurfaceFormValue,
  permissions: ToolPermission[]
) {
  const selectedTools = new Set(surface.tools)

  return permissions.filter(
    (permission) =>
      permission.surface === surface.integration &&
      selectedTools.has(permission.tool)
  )
}
