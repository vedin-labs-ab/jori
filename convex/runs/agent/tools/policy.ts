import {
  canUseJobTool,
  canUseToolMode,
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
} from "../../../../contracts/permissions"

export type ToolExecutionType = "job" | "message"
type RuntimeExecutionType = ToolExecutionType | "instruction"

type ToolPermissionInput = {
  executionType: ToolExecutionType
  permissions: ToolPermission[]
  toolModes: ReadonlyMap<string, PermissionMode>
}

export function getPromptedTools(input: ToolPermissionInput) {
  if (input.executionType === "job") {
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
  const mode = resolveToolMode(input.toolModes, input.permission.tool)

  return input.executionType === "job"
    ? canUseJobTool({ mode, tool: input.permission.tool })
    : canUseToolMode(mode, input.executionType)
}

export function toolExecutionType(
  executionType: RuntimeExecutionType
): ToolExecutionType {
  return executionType === "job" ? "job" : "message"
}
