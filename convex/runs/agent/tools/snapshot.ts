import { type Infer } from "convex/values"
import { type toolSnapshot } from "../../schema"
import { type RuntimeToolCapability } from "./types"

export type RunToolSnapshot = Infer<typeof toolSnapshot>
export type RunToolSnapshotTool =
  RunToolSnapshot["groups"][number]["tools"][number]

export function createRunToolSnapshot(input: {
  activeSurfaceTools?: RunToolSnapshotTool[]
  capabilities: RuntimeToolCapability[]
  lifecycleTools?: RunToolSnapshotTool[]
  sandboxTools?: RunToolSnapshotTool[]
  webSearch: boolean
}): RunToolSnapshot {
  return {
    groups: [
      ...lifecycleGroups(input.lifecycleTools),
      ...activeSurfaceGroups(input.activeSurfaceTools),
      ...input.capabilities.map((capability) => ({
        surface: capability.surface,
        label: capability.label,
        tools: capability.tools,
      })),
      ...workspaceGroups(input.sandboxTools),
    ],
    webSearch: input.webSearch,
  }
}

function lifecycleGroups(tools: RunToolSnapshotTool[] | undefined) {
  return tools === undefined || tools.length === 0
    ? []
    : [
        {
          surface: "milo" as const,
          label: "Run",
          tools,
        },
      ]
}

function activeSurfaceGroups(tools: RunToolSnapshotTool[] | undefined) {
  return tools === undefined || tools.length === 0
    ? []
    : [
        {
          surface: "milo" as const,
          label: "Active surface",
          tools,
        },
      ]
}

function workspaceGroups(tools: RunToolSnapshotTool[] | undefined) {
  return tools === undefined || tools.length === 0
    ? []
    : [
        {
          surface: "milo" as const,
          label: "Workspace",
          tools,
        },
      ]
}
