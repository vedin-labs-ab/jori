import { canUseJobTool } from "@contracts/permissions"
import { isWebTool } from "@contracts/permissions/web"
import { type ToolPermission } from "../../permissions/types"
import {
  getJobSurfaceLabel,
  isJobSurfaceIntegration,
  type JobSurfaceFormValue,
  type JobSurfaceIntegration,
} from "./catalog"
import { type JobPolicyPermissions } from "./policy"
import { getJobSurfaceScopeIssue, type JobScope } from "./scope"

export type JobToolAccess =
  | { kind: "ready" | "builtIn" | "web" }
  | { integration: JobSurfaceIntegration; kind: "integration" }
  | { kind: "unavailable"; reason: string }

export function getDefaultJobSurfaceTools(
  integration: JobSurfaceIntegration,
  permissions: JobPolicyPermissions
) {
  if (!Array.isArray(permissions)) {
    return []
  }

  return permissions
    .filter(
      (permission) =>
        permission.surface === integration && canUseJobTool(permission)
    )
    .map((permission) => permission.tool)
}

export function jobToolModeDescription(permission: ToolPermission) {
  if (
    !canUseJobTool(permission) &&
    (permission.mode === "allowed" || permission.mode === "required")
  ) {
    return "This tool needs an active conversation and cannot run in jobs."
  }

  if (permission.mode === "prompted") {
    return "Requires approval in Integrations and cannot run in jobs."
  }

  if (permission.mode === "blocked") {
    return "Blocked in Integrations."
  }

  return permission.mode === "required"
    ? "Allowed in jobs."
    : "Allowed in Integrations."
}

export function resolveJobToolAccess({
  permission,
  surfaces,
  webSearch,
}: {
  permission: ToolPermission
  surfaces?: readonly JobSurfaceFormValue[]
  webSearch?: boolean
}): JobToolAccess {
  if (!canUseJobTool(permission)) {
    return {
      kind: "unavailable",
      reason: jobToolModeDescription(permission),
    }
  }

  if (isWebTool(permission.tool)) {
    return { kind: webSearch ? "ready" : "web" }
  }

  if (!isJobSurfaceIntegration(permission.surface)) {
    return { kind: "builtIn" }
  }

  const surface = surfaces?.find(
    (item) => item.integration === permission.surface
  )

  return surface?.tools.includes(permission.tool)
    ? { kind: "ready" }
    : { kind: "integration", integration: permission.surface }
}

export function jobToolReferenceIssue({
  permissions,
  scope,
  surfaces,
  tool,
  webSearch,
}: {
  permissions: JobPolicyPermissions
  scope: JobScope
  surfaces: readonly JobSurfaceFormValue[]
  tool: string
  webSearch: boolean
}) {
  if (!Array.isArray(permissions)) {
    return undefined
  }

  const permission = permissions.find((item) => item.tool === tool)

  if (permission === undefined) {
    return `#${tool} is not an available job tool.`
  }

  const scopeIssue = jobPermissionScopeIssue(permission, scope)

  if (scopeIssue !== undefined) {
    return scopeIssue
  }

  const access = resolveJobToolAccess({
    permission,
    surfaces,
    webSearch,
  })

  if (access.kind === "integration") {
    return `Give @${getJobSurfaceLabel(access.integration)} access to use #${tool}.`
  }
  if (access.kind === "web") {
    return `Enable web access to use #${tool}.`
  }
  if (access.kind === "unavailable") {
    return `#${tool} is not available in jobs.`
  }

  return undefined
}

export function jobToolScopeIssue({
  permissions,
  scope,
  tool,
}: {
  permissions: JobPolicyPermissions
  scope: JobScope
  tool: string
}) {
  if (!Array.isArray(permissions)) {
    return undefined
  }

  const permission = permissions.find((item) => item.tool === tool)

  return permission === undefined
    ? undefined
    : jobPermissionScopeIssue(permission, scope)
}

function jobPermissionScopeIssue(permission: ToolPermission, scope: JobScope) {
  return isJobSurfaceIntegration(permission.surface)
    ? getJobSurfaceScopeIssue(scope, permission.surface)
    : undefined
}
