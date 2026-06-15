import { type Doc } from "../../_generated/dataModel"
import {
  compactDetails,
  detail,
  type ExecutionDetailGroup,
} from "../display/detail"

type ToolSnapshot = Doc<"executions">["toolSnapshot"]

export function toolDetails(snapshot: ToolSnapshot) {
  if (snapshot === undefined) {
    return []
  }

  const tools = toolsDetail(snapshot.groups)

  return compactDetails([
    tools === undefined
      ? undefined
      : detail("tools", tools.label, { groups: tools.groups }),
    detail("web_search", snapshot.webSearch === true ? "Allowed" : "Blocked"),
  ])
}

function toolsDetail(groups: NonNullable<ToolSnapshot>["groups"]) {
  const detailGroups = groups
    .map((group) =>
      group.tools.length === 0
        ? undefined
        : ({
            type: group.provider,
            label: group.label,
            tools: group.tools,
          } satisfies ExecutionDetailGroup)
    )
    .filter(isPresent)

  if (detailGroups.length === 0) {
    return undefined
  }

  return {
    groups: detailGroups,
    label: detailGroups.map(toolGroupLabel).join(" · "),
  }
}

function toolGroupLabel(group: ExecutionDetailGroup) {
  const counts = countTools(group.tools)
  const approval = counts.approval === 0 ? "" : ` · Approval ${counts.approval}`

  return `${group.label} · Read ${counts.read} · Write ${counts.write}${approval}`
}

function countTools(tools: ExecutionDetailGroup["tools"]) {
  const counts = { read: 0, write: 0, approval: 0 }

  for (const tool of tools) {
    counts[tool.access] += 1
    if (tool.requiresApproval === true) {
      counts.approval += 1
    }
  }

  return counts
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined
}
