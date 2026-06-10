import {
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
} from "../../permissions/catalog"

export type ToolPermissionInput = {
  permissions: ToolPermission[]
  toolModes: ReadonlyMap<string, PermissionMode>
}

export function enabledToolsEnv(permissions: ToolPermission[]) {
  return permissions.map((permission) => permission.tool).join(",")
}

export function getPromptedTools(input: ToolPermissionInput) {
  return input.permissions.filter(
    (permission) =>
      resolveToolMode(input.toolModes, permission.tool) === "prompted"
  )
}
