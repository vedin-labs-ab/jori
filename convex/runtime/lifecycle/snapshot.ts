import { type RunToolSnapshotTool } from "../../runs/agent/tools/snapshot"
import { type RunLifecycleTool } from "./tools"

export function runLifecycleToolSnapshot(
  tools: RunLifecycleTool[]
): RunToolSnapshotTool[] {
  return tools.map((tool) => ({
    access: tool.access,
    description: tool.description,
    label: "Finish run",
    tool: tool.name,
  }))
}
