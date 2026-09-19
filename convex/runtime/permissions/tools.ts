import { withApprovalSchema } from "../../../contracts/approvals"
import {
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
  type ToolSurface,
} from "../../../contracts/permissions"
import {
  emptyObjectSchema,
  getRuntimeToolInputSchema,
  withOptionalFieldGuidance,
} from "../../../contracts/tools"

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
