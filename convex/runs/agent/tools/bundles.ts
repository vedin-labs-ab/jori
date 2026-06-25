import {
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
  type ToolSurface,
} from "../../../permissions/catalog"
import { toolSurfaceLabel } from "../../../shared/integrations"
import { type RuntimeToolCapability } from "./types"

export function createRuntimeToolCapability(
  surface: ToolSurface,
  permissions: ToolPermission[],
  toolModes: ReadonlyMap<string, PermissionMode>
): RuntimeToolCapability {
  return {
    surface,
    label: toolSurfaceLabel(surface),
    tools: permissions.map((permission) => ({
      access: permission.access,
      description: permission.usage,
      label: permission.label,
      ...(resolveToolMode(toolModes, permission.tool) === "prompted"
        ? { requiresApproval: true }
        : {}),
      tool: permission.tool,
    })),
  }
}
