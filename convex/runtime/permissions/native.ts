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

export function nativeToolSnapshot(args: {
  access: ToolAccess
  route: NativeToolRoute
  tool: string
}): RunToolSnapshotTool {
  const permission = nativeToolPermission(args.tool, args.route)

  return {
    access: args.access,
    description: permission.description,
    label: permission.label,
    tool: permission.tool,
  }
}

export function visibleNativeToolSnapshot(args: {
  access: ToolAccess
  route: NativeToolRoute
  tool: string
}): RunToolSnapshotTool | undefined {
  return isUserVisibleToolPermission(args.tool)
    ? nativeToolSnapshot(args)
    : undefined
}

export function visibleNativeToolSnapshots(
  tools: readonly {
    access: ToolAccess
    name: string
    route: NativeToolRoute
  }[]
): RunToolSnapshotTool[] {
  return tools.flatMap((tool) => {
    const snapshot = visibleNativeToolSnapshot({
      access: tool.access,
      route: tool.route,
      tool: tool.name,
    })

    return snapshot === undefined ? [] : [snapshot]
  })
}

function nativeToolPermission(tool: string, route: NativeToolRoute) {
  const permission = getToolPermission(tool)

  if (permission === undefined || permission.route !== route) {
    throw new Error(`Missing ${route} tool permission: ${tool}`)
  }

  return permission
}
