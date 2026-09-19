import {
  getToolPermissionsBySurface,
  type PermissionMode,
  resolveToolMode,
  type ToolAccess,
  type ToolPermission,
  type ToolSurface,
} from "../../contracts/permissions"
import { permissionGroups } from "../runs/agent/tools/resolve"
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
  return permissionGroups(context.input, context.toolModes).map((group) =>
    capabilityGroup(
      group.surface,
      group.permissions.map((permission) =>
        capabilityTool(permission, context.toolModes)
      )
    )
  )
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
          getBrokerPermissions(surface).map((permission) =>
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
      getBrokerPermissions(surface).map((permission) =>
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

function getBrokerPermissions(surface: ToolSurface) {
  return getToolPermissionsBySurface(surface, { routes: ["broker"] })
}

function connectedSurfaceSet(
  integrations: ApprovalBrokerContext["connectedIntegrations"]
) {
  return new Set(integrations.map((integration) => integration.integration))
}
