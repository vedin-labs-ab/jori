import { type RunToolSnapshotTool } from "../../runs/agent/tools/snapshot"
import { visibleNativeToolSnapshot } from "../permissions/native"
import { type RunLifecycleTool } from "./tools"

export function runLifecycleToolSnapshot(
  tools: RunLifecycleTool[]
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
