import { type Doc } from "../../../_generated/dataModel"
import { countText, item, readStringArray } from "../helpers"

export function agentWaitMetadata(
  tool: string,
  input: Record<string, unknown> | undefined,
  agents: Doc<"runs">[]
) {
  if (tool !== "wait_for_agents" || input === undefined) {
    return []
  }

  const runIds = readStringArray(input.runIds)

  if (runIds === undefined) {
    return []
  }

  const selected = new Set(runIds)
  const statuses = agents
    .filter((agent) => selected.has(agent._id))
    .map((agent) => agent.status)
  const metadata = [
    statusItem(statuses, ["queued", "running"], "ongoing"),
    statusItem(statuses, ["completed"], "succeeded"),
    statusItem(statuses, ["failed"], "failed"),
    statusItem(statuses, ["stopped"], "stopped"),
  ].filter((entry) => entry !== undefined)

  return metadata.length > 0
    ? metadata
    : [item("target", countText(runIds.length, "agent"))]
}

function statusItem(
  statuses: Doc<"runs">["status"][],
  matches: Doc<"runs">["status"][],
  label: string
) {
  const count = statuses.filter((status) => matches.includes(status)).length

  return count === 0 ? undefined : item("outcome", `${count} ${label}`)
}
