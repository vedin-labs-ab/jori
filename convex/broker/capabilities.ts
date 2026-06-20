import { isWebTool } from "../../contracts/permissions/web"
import { getIntegrationTools } from "../automations/access"
import {
  getToolPermissionsBySurface,
  type PermissionMode,
  resolveToolMode,
  type ToolAccess,
  type ToolPermission,
  type ToolSurface,
} from "../permissions/catalog"
import { type AgentRuntimeInput } from "../runs/agent/input"
import {
  canUseToolPermission,
  toolExecutionType,
} from "../runs/agent/tools/policy"
import {
  integrations as integrationCatalog,
  toolSurfaceLabel,
} from "../shared/integrations"
import { type ApprovalBrokerContext } from "./approval"

type CapabilityTool = {
  access: ToolAccess
  description: string
  label: string
  mode: PermissionMode
  tool: string
}

type CapabilityGroup = {
  label: string
  surface: ToolSurface
  tools: CapabilityTool[]
}

type AvailableCapabilityGroup = CapabilityGroup & {
  status: "not_connected"
}

export function listCapabilities(context: ApprovalBrokerContext) {
  const connectedSurfaces = connectedSurfaceSet(context.connectedIntegrations)

  return {
    run: runCapabilityGroups(context),
    connected: connectedCapabilityGroups(context),
    available: integrationCatalog
      .filter((surface) => !connectedSurfaces.has(surface))
      .map((surface) => availableCapabilityGroup(surface, context.toolModes)),
  }
}

function runCapabilityGroups(context: ApprovalBrokerContext) {
  const surfaces = runSurfaces(context.input)

  return surfaces.flatMap((surface) => {
    const tools = getToolPermissionsBySurface(surface)
      .filter((permission) => isRunPermission(context, permission))
      .map((permission) => capabilityTool(permission, context.toolModes))

    return tools.length === 0 ? [] : [capabilityGroup(surface, tools)]
  })
}

function connectedCapabilityGroups(context: ApprovalBrokerContext) {
  return integrationCatalog.flatMap((surface) => {
    const integrations = context.connectedIntegrations.filter(
      (integration) => integration.integration === surface
    )

    if (integrations.length === 0) {
      return []
    }

    return [
      {
        ...capabilityGroup(
          surface,
          getToolPermissionsBySurface(surface).map((permission) =>
            capabilityTool(permission, context.toolModes)
          )
        ),
        integrationIds: integrations.map((integration) => integration._id),
        status: "connected" as const,
      },
    ]
  })
}

function availableCapabilityGroup(
  surface: ToolSurface,
  toolModes: ReadonlyMap<string, PermissionMode>
): AvailableCapabilityGroup {
  return {
    ...capabilityGroup(
      surface,
      getToolPermissionsBySurface(surface).map((permission) =>
        capabilityTool(permission, toolModes)
      )
    ),
    status: "not_connected",
  }
}

function capabilityGroup(
  surface: ToolSurface,
  tools: CapabilityTool[]
): CapabilityGroup {
  return {
    surface,
    label: toolSurfaceLabel(surface),
    tools,
  }
}

function capabilityTool(
  permission: ToolPermission,
  toolModes: ReadonlyMap<string, PermissionMode>
): CapabilityTool {
  return {
    access: permission.access,
    description: permission.description,
    label: permission.label,
    mode: resolveToolMode(toolModes, permission.tool),
    tool: permission.tool,
  }
}

function isRunPermission(
  context: ApprovalBrokerContext,
  permission: ToolPermission
) {
  return (
    isSelectedForRun(context.input, permission) &&
    canUseToolPermission({
      executionType: toolExecutionType(context.input.type),
      permission,
      toolModes: context.toolModes,
    })
  )
}

function isSelectedForRun(
  input: AgentRuntimeInput,
  permission: ToolPermission
) {
  if (input.type !== "automation") {
    return true
  }

  if (permission.surface === "milo") {
    return !isWebTool(permission.tool) || input.automation.access.web
  }

  const integration = input.integrations.find(
    (candidate) => candidate.integration === permission.surface
  )

  return (
    integration !== undefined &&
    getIntegrationTools(input.automation.access, integration._id).includes(
      permission.tool
    )
  )
}

function runSurfaces(input: AgentRuntimeInput) {
  const surfaces: ToolSurface[] = ["milo"]
  const seen = new Set<ToolSurface>(surfaces)

  for (const integration of input.integrations) {
    if (!seen.has(integration.integration)) {
      seen.add(integration.integration)
      surfaces.push(integration.integration)
    }
  }

  return surfaces
}

function connectedSurfaceSet(
  integrations: ApprovalBrokerContext["connectedIntegrations"]
) {
  return new Set(integrations.map((integration) => integration.integration))
}
