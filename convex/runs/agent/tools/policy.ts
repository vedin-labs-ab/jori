import {
  canUseToolMode,
  isInteractiveTool,
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
} from "../../../permissions/catalog"

export type ToolExecutionType = "automation" | "message"
export type RuntimeExecutionType = ToolExecutionType | "instruction"

export type ToolPermissionInput = {
  executionType: ToolExecutionType
  permissions: ToolPermission[]
  toolModes: ReadonlyMap<string, PermissionMode>
}

export function getPromptedTools(input: ToolPermissionInput) {
  if (input.executionType === "automation") {
    return []
  }

  return input.permissions.filter(
    (permission) =>
      resolveToolMode(input.toolModes, permission.tool) === "prompted"
  )
}

export function canUseToolPermission(input: {
  executionType: ToolExecutionType
  permission: ToolPermission
  toolModes: ReadonlyMap<string, PermissionMode>
}) {
  if (
    input.executionType === "automation" &&
    isInteractiveTool(input.permission.tool)
  ) {
    return false
  }

  return canUseToolMode(
    resolveToolMode(input.toolModes, input.permission.tool),
    input.executionType
  )
}

export function toolExecutionType(
  executionType: RuntimeExecutionType
): ToolExecutionType {
  return executionType === "automation" ? "automation" : "message"
}
