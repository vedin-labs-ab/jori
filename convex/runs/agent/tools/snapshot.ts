import { type Infer } from "convex/values"
import { type toolSnapshot } from "../../schema"
import { type RuntimeToolCapability } from "./types"

export type RunToolSnapshot = Infer<typeof toolSnapshot>
export type RunToolSnapshotTool =
  RunToolSnapshot["groups"][number]["tools"][number]

export function createRunToolSnapshot(input: {
  activeSurfaceTools?: RunToolSnapshotTool[]
  capabilities: RuntimeToolCapability[]
  webSearch: boolean
}): RunToolSnapshot {
  return {
    groups: [
      ...activeSurfaceGroups(input.activeSurfaceTools),
      ...input.capabilities.map((capability) => ({
        surface: capability.surface,
        label: capability.label,
        tools: capability.tools,
      })),
    ],
    webSearch: input.webSearch,
  }
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
