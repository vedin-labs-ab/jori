import { canUseJobTool } from "@contracts/permissions"
import { type ToolPermission } from "../../permissions/types"
import { getJobSurfaceLabel, type JobSurfaceFormValue } from "./catalog"

export type JobPolicyPermissions = ToolPermission[] | null | undefined

export function jobPolicyKey(permissions: JobPolicyPermissions) {
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

export function validateJobPolicy({
  permissions,
  surfaces,
}: {
  permissions: JobPolicyPermissions
  surfaces: JobSurfaceFormValue[]
}) {
  if (permissions === undefined) {
    return "Job permissions are still loading."
  }

  if (permissions === null) {
    return "Sign in again to manage job permissions."
  }

  const blockedSurface = surfaces.find((surface) =>
    isJobSurfacePolicyBlocked({ permissions, surface })
  )

  if (blockedSurface === undefined) {
    return undefined
  }

  return `${getJobSurfaceLabel(blockedSurface.integration)} has tools that are not available for jobs.`
}

export function isJobSurfacePolicyBlocked({
  permissions,
  surface,
}: {
  permissions: JobPolicyPermissions
  surface: JobSurfaceFormValue
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
      !canUseJobTool(permission)
    )
  })
}
