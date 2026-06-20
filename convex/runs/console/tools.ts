import { type Doc } from "../../_generated/dataModel"
import {
  compactDetails,
  detail,
  type ExecutionDetailGroup,
} from "../display/detail"

type ToolSnapshot = Doc<"runs">["toolSnapshot"]

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
            type: group.surface,
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
  const countLabels = [
    toolCountLabel("Read", counts.read, counts.readRequiresApproval),
    toolCountLabel("Write", counts.write, counts.writeRequiresApproval),
  ].filter(isPresent)

  return [group.label, ...countLabels].join(" · ")
}

function toolCountLabel(
  label: string,
  value: number,
  requiresApproval: boolean
) {
  return value > 0
    ? `${label} ${value}${requiresApproval ? "*" : ""}`
    : undefined
}

function countTools(tools: ExecutionDetailGroup["tools"]) {
  const counts = {
    read: 0,
    readRequiresApproval: false,
    write: 0,
    writeRequiresApproval: false,
  }

  for (const tool of tools) {
    counts[tool.access] += 1
    if (tool.requiresApproval === true) {
      if (tool.access === "read") {
        counts.readRequiresApproval = true
      } else {
        counts.writeRequiresApproval = true
      }
    }
  }

  return counts
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined
}
