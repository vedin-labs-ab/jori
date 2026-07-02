import { type RunToolSnapshotTool } from "../../runs/agent/tools/snapshot"
import { nativeToolSnapshot } from "../permissions/native"
import { type RunLifecycleTool } from "./tools"

export function runLifecycleToolSnapshot(
  tools: RunLifecycleTool[]
): RunToolSnapshotTool[] {
  return tools.map((tool) =>
    nativeToolSnapshot({
      access: tool.access,
      route: tool.route,
      tool: tool.name,
    })
  )
}
