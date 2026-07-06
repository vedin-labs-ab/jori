import { withApprovalSchema } from "../../../contracts/approvals"
import { isWebTool } from "../../../contracts/permissions/web"
import { type Id } from "../../_generated/dataModel"
import {
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
  type ToolSurface,
} from "../../permissions/catalog"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { toolExecutionType } from "../../runs/agent/tools/policy"
import { getEnabledToolPermissions } from "../../runs/agent/tools/resolve"
import {
  emptyObjectSchema,
  getRuntimeToolInputSchema,
  withOptionalFieldGuidance,
} from "../../runs/agent/tools/schemas"
import { getIntegrationTools } from "../../shared/integrations"

export function permissionGroups(
  input: AgentRuntimeInput,
  toolModes: ReadonlyMap<string, PermissionMode>
) {
  const executionType = toolExecutionType(input.type)
  const groups: Array<{
    permissions: ToolPermission[]
    surface: ToolSurface
  }> = [
    {
      surface: "milo" as const,
      permissions: filterWebPermissions(
        input,
        getEnabledToolPermissions("milo", toolModes, executionType)
      ),
    },
  ]
  const seen = new Set<ToolSurface>(["milo"])

  for (const integration of input.integrations) {
    const surface = integration.integration as ToolSurface

    if (seen.has(surface)) {
      continue
    }

    seen.add(surface)
    groups.push({
      surface,
      permissions: getEnabledToolPermissions(
        surface,
        toolModes,
        executionType,
        selectedTools(input, integration._id)
      ),
    })
  }

  return groups.filter((group) => group.permissions.length > 0)
}

export function toolDescriptor(
  surface: ToolSurface,
  permission: ToolPermission,
  toolModes: ReadonlyMap<string, PermissionMode>,
  skillNames: readonly string[] = []
) {
  const mode = resolveToolMode(toolModes, permission.tool)
  const inputSchema =
    getRuntimeToolInputSchema(permission.tool, { skillNames }) ??
    emptyObjectSchema()

  return {
    access: permission.access,
    name: permission.tool,
    description: permission.usage,
    inputSchema:
      mode === "prompted"
        ? withOptionalFieldGuidance(withApprovalSchema(inputSchema))
        : inputSchema,
    mode,
    route: "convex" as const,
    surface,
  }
}

function filterWebPermissions(
  input: AgentRuntimeInput,
  permissions: ToolPermission[]
) {
  const access = inputAccess(input)

  if (access === undefined || access.web) {
    return permissions
  }

  return permissions.filter((permission) => !isWebTool(permission.tool))
}

function selectedTools(
  input: AgentRuntimeInput,
  integrationId: Id<"integrations">
) {
  const access = inputAccess(input)

  return access === undefined
    ? undefined
    : getIntegrationTools(access, integrationId)
}

/** The run's tool contract; undefined grants the full tool surface. */
function inputAccess(input: AgentRuntimeInput) {
  if (input.type === "automation") {
    return input.automation.access
  }

  return input.type === "instruction" ? input.access : undefined
}
