import { type Infer } from "convex/values"
import { type toolSnapshot } from "../../schema"
import { type RuntimeToolCapability } from "./types"

export type RunToolSnapshot = Infer<typeof toolSnapshot>
export type RunToolSnapshotTool =
  RunToolSnapshot["groups"][number]["tools"][number]
type RunToolSnapshotGroup = RunToolSnapshot["groups"][number]

export function createRunToolSnapshot(input: {
  activeSurfaceTools?: RunToolSnapshotTool[]
  capabilities: RuntimeToolCapability[]
  lifecycleTools?: RunToolSnapshotTool[]
  sandboxTools?: RunToolSnapshotTool[]
  webSearch: boolean
}): RunToolSnapshot {
  return {
    groups: consolidateMiloToolGroups([
      ...lifecycleGroups(input.lifecycleTools),
      ...activeSurfaceGroups(input.activeSurfaceTools),
      ...input.capabilities.map((capability) => ({
        surface: capability.surface,
        label: capability.label,
        tools: capability.tools,
      })),
      ...workspaceGroups(input.sandboxTools),
    ]),
    webSearch: input.webSearch,
  }
}

export function consolidateMiloToolGroups(
  groups: RunToolSnapshot["groups"]
): RunToolSnapshot["groups"] {
  const tools = miloTools(groups)

  if (tools.length === 0) {
    return groups
  }

  const result: RunToolSnapshot["groups"] = []
  let hasAddedMilo = false

  for (const group of groups) {
    if (group.surface !== "milo") {
      result.push(group)
      continue
    }

    if (!hasAddedMilo) {
      result.push({ surface: "milo", label: "Milo", tools })
      hasAddedMilo = true
    }
  }

  return result
}

function miloTools(groups: RunToolSnapshot["groups"]) {
  return groups.flatMap((group) => (isMiloGroup(group) ? group.tools : []))
}

function isMiloGroup(group: RunToolSnapshotGroup) {
  return group.surface === "milo"
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
