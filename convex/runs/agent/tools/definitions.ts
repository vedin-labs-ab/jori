import { withApprovalSchema } from "../../../../contracts/approvals"
import {
  getToolPermissionsBySurface,
  resolveToolMode,
  type ToolSurface,
} from "../../../permissions/catalog"
import { type ToolExecutionType, type ToolPermissionInput } from "./policy"
import { emptyObjectSchema, getToolInputSchema } from "./schemas"

export type McpToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export function getSurfaceToolDefinitions(
  surface: ToolSurface,
  input: Pick<ToolPermissionInput, "toolModes"> & {
    executionType?: ToolExecutionType
  }
) {
  const executionType = input.executionType ?? "message"

  return getToolPermissionsBySurface(surface).map((permission) => ({
    name: permission.tool,
    description: permission.usage,
    inputSchema:
      executionType === "message" &&
      resolveToolMode(input.toolModes, permission.tool) === "prompted"
        ? withApprovalSchema(getToolInputSchema(permission.tool))
        : (getToolInputSchema(permission.tool) ?? emptyObjectSchema()),
  })) satisfies McpToolDefinition[]
}
