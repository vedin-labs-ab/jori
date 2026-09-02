import { type ToolPermission } from "@/shared/console/tools/model"
import { type JobSurfaceAccess, type JobSurfaceFormValue } from "./catalog"

export function hasJobWriteSurface(
  surfaces: JobSurfaceFormValue[],
  permissions: ToolPermission[]
) {
  return surfaces.some((surface) =>
    getSelectedJobSurfacePermissions(surface, permissions).some(
      (permission) => permission.access === "write"
    )
  )
}

export function getJobSurfaceAccess(
  surface: JobSurfaceFormValue,
  permissions: ToolPermission[] | null | undefined
): JobSurfaceAccess | "" {
  if (!Array.isArray(permissions)) {
    return surface.tools.length === 0 ? "" : "both"
  }

  const selected = getSelectedJobSurfacePermissions(surface, permissions)
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

export function getJobSurfaceAccessLabel(access: JobSurfaceAccess | "") {
  if (access === "") {
    return "No tools"
  }
  if (access === "both") {
    return "Read/write"
  }

  return access === "read" ? "Read" : "Write"
}

function getSelectedJobSurfacePermissions(
  surface: JobSurfaceFormValue,
  permissions: ToolPermission[]
) {
  const selectedTools = new Set(surface.tools)

  return permissions.filter(
    (permission) =>
      permission.surface === surface.integration &&
      selectedTools.has(permission.tool)
  )
}
