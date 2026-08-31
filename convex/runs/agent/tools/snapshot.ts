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
    groups: consolidateJoriToolGroups([
      ...joriGroups("Run", input.lifecycleTools),
      ...joriGroups("Active surface", input.activeSurfaceTools),
      ...input.capabilities.map((capability) => ({
        surface: capability.surface,
        label: capability.label,
        tools: capability.tools,
      })),
      ...joriGroups("Workspace", input.sandboxTools),
    ]),
    webSearch: input.webSearch,
  }
}

export function consolidateJoriToolGroups(
  groups: RunToolSnapshot["groups"]
): RunToolSnapshot["groups"] {
  const tools = joriTools(groups)

  if (tools.length === 0) {
    return groups
  }

  const result: RunToolSnapshot["groups"] = []
  let hasAddedJori = false

  for (const group of groups) {
    if (group.surface !== "jori") {
      result.push(group)
      continue
    }

    if (!hasAddedJori) {
      result.push({ surface: "jori", label: "Jori", tools })
      hasAddedJori = true
    }
  }

  return result
}

function joriTools(groups: RunToolSnapshot["groups"]) {
  return groups.flatMap((group) => (isJoriGroup(group) ? group.tools : []))
}

function isJoriGroup(group: RunToolSnapshotGroup) {
  return group.surface === "jori"
}

/** A Jori-surface group under `label`, or nothing when the run prepared no
 *  tools of that kind. */
function joriGroups(label: string, tools: RunToolSnapshotTool[] | undefined) {
  return tools === undefined || tools.length === 0
    ? []
    : [{ surface: "jori" as const, label, tools }]
}
