import {
  getToolPermissionsBySurface,
  type PermissionMode,
  type ToolPermission,
  type ToolSurface,
} from "../../../../contracts/permissions"
import { holdsTool } from "../../access"
import { type AgentRuntimeInput } from "../input"
import { canUseToolPermission, toolExecutionType } from "./policy"

/**
 * The broker tools a run may call, grouped by surface: Jori's first, then
 * each of the run's integrations. A tool is in when the run holds it and the
 * organization's mode lets this kind of run use it.
 */
export function permissionGroups(
  input: AgentRuntimeInput,
  toolModes: ReadonlyMap<string, PermissionMode>
) {
  const executionType = toolExecutionType(input.type)
  const surfaces = new Set<ToolSurface>([
    "jori",
    ...input.integrations.map((integration) => integration.integration),
  ])
  const groups: Array<{
    permissions: ToolPermission[]
    surface: ToolSurface
  }> = [...surfaces].map((surface) => ({
    surface,
    permissions: getToolPermissionsBySurface(surface, {
      routes: ["broker"],
    }).filter(
      (permission) =>
        holdsTool(input, permission) &&
        canUseToolPermission({ executionType, permission, toolModes })
    ),
  }))

  return groups.filter((group) => group.permissions.length > 0)
}
