import {
  getToolPermission,
  isUserVisibleToolPermission,
  type ToolAccess,
  type ToolPermissionRoute,
} from "../../../contracts/permissions"
import { type RunToolSnapshotTool } from "../../runs/agent/tools/snapshot"

type NativeToolRoute = Exclude<ToolPermissionRoute, "broker">

export function nativeToolUsage(tool: string, route: NativeToolRoute) {
  return nativeToolPermission(tool, route).usage
}

export function visibleNativeToolSnapshots(
  tools: readonly {
    access: ToolAccess
    name: string
    route: NativeToolRoute
  }[]
): RunToolSnapshotTool[] {
  return tools.flatMap((tool) => {
    if (!isUserVisibleToolPermission(tool.name)) {
      return []
    }

    const permission = nativeToolPermission(tool.name, tool.route)

    return [
      {
        access: tool.access,
        description: permission.description,
        label: permission.label,
        tool: permission.tool,
      },
    ]
  })
}

function nativeToolPermission(tool: string, route: NativeToolRoute) {
  const permission = getToolPermission(tool)

  if (permission === undefined || permission.route !== route) {
    throw new Error(`Missing ${route} tool permission: ${tool}`)
  }

  return permission
}
