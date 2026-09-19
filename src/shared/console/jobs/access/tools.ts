import { canUseJobTool, isCoreTool } from "@contracts/permissions"
import { isWebTool } from "@contracts/permissions/web"
import { type ToolPermission } from "@/shared/console/tools/model"
import {
  getJobSurfaceLabel,
  type JobSurfaceFormValue,
  type JobSurfaceIntegration,
} from "./catalog"
import { type JobPolicyPermissions } from "./policy"
import { getJobSurfaceScopeIssue, type JobScope } from "./scope"

export type JobToolAccess =
  | { kind: "ready" | "core" }
  | { integration: JobSurfaceIntegration; kind: "integration" }
  | { kind: "unavailable"; reason: string }

/** The tools of a surface a job can be granted. Core tools need no grant,
 *  so they are never offered as one. */
export function getJobSurfacePermissions(
  integration: JobSurfaceIntegration,
  permissions: ToolPermission[]
) {
  return permissions.filter(
    (permission) =>
      permission.surface === integration && !isCoreTool(permission.tool)
  )
}

/** What naming a surface grants before anyone opens its tools. An
 *  integration starts with everything a job may use. Jori starts with reading
 *  the organization's own tables, stores, files, jobs, and runs: writing, the
 *  web, the sandbox, and agents reach further, so a person turns those on. */
export function getDefaultJobSurfaceTools(
  integration: JobSurfaceIntegration,
  permissions: JobPolicyPermissions
) {
  if (!Array.isArray(permissions)) {
    return []
  }

  return getJobSurfacePermissions(integration, permissions)
    .filter(
      (permission) =>
        canUseJobTool(permission) &&
        (integration !== "jori" || readsOwnMaterials(permission))
    )
    .map((permission) => permission.tool)
}

function readsOwnMaterials(permission: ToolPermission) {
  return (
    permission.access === "read" &&
    permission.route === "broker" &&
    !isWebTool(permission.tool)
  )
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
}: {
  permission: ToolPermission
  surfaces?: readonly JobSurfaceFormValue[]
}): JobToolAccess {
  if (!canUseJobTool(permission)) {
    return {
      kind: "unavailable",
      reason: jobToolModeDescription(permission),
    }
  }

  if (isCoreTool(permission.tool)) {
    return { kind: "core" }
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
}: {
  permissions: JobPolicyPermissions
  scope: JobScope
  surfaces: readonly JobSurfaceFormValue[]
  tool: string
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

  const access = resolveJobToolAccess({ permission, surfaces })

  if (access.kind === "integration") {
    return `Give @${getJobSurfaceLabel(access.integration)} access to use #${tool}.`
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
  return getJobSurfaceScopeIssue(scope, permission.surface)
}
