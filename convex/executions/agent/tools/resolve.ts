import {
  getToolPermissionsBySurface,
  type PermissionMode,
  type ToolSurface,
} from "../../../permissions/catalog"
import { canUseToolPermission, type ToolExecutionType } from "./policy"

export function getEnabledToolPermissions(
  surface: ToolSurface,
  toolModes: ReadonlyMap<string, PermissionMode>,
  executionType: ToolExecutionType = "message",
  selectedTools?: readonly string[]
) {
  const selectedToolSet =
    selectedTools === undefined ? null : new Set(selectedTools)

  return getToolPermissionsBySurface(surface).filter(
    (permission) =>
      (selectedToolSet === null || selectedToolSet.has(permission.tool)) &&
      canUseToolPermission({ executionType, permission, toolModes })
  )
}
