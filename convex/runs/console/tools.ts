import {
  getToolPermission,
  isUserVisibleToolPermission,
} from "../../permissions/catalog"
import {
  consolidateMiloToolGroups,
  type RunToolSnapshot,
} from "../agent/tools/snapshot"
import {
  compactDetails,
  detail,
  type ExecutionDetailGroup,
  type ExecutionDetailTool,
} from "../display/detail"

export function toolDetails(snapshot: RunToolSnapshot | undefined) {
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

function toolsDetail(groups: RunToolSnapshot["groups"]) {
  const detailGroups = consolidateMiloToolGroups(groups)
    .map(displayGroup)
    .filter(isPresent)

  if (detailGroups.length === 0) {
    return undefined
  }

  return {
    groups: detailGroups,
    label: detailGroups.map(toolGroupLabel).join(" · "),
  }
}

function displayGroup(
  group: RunToolSnapshot["groups"][number]
): ExecutionDetailGroup | undefined {
  const tools = group.tools.map(displayTool).filter(isPresent)

  return tools.length === 0
    ? undefined
    : {
        type: group.surface,
        label: group.label,
        tools,
      }
}

function displayTool(
  tool: ExecutionDetailTool
): ExecutionDetailTool | undefined {
  if (!isUserVisibleToolPermission(tool.tool)) {
    return undefined
  }

  const permission = getToolPermission(tool.tool)

  return permission === undefined
    ? {
        ...tool,
        description: safeDescription(tool.description),
      }
    : {
        ...tool,
        description: permission.description,
        label: permission.label,
      }
}

function safeDescription(description: string) {
  return leaksInternalGuidance(description)
    ? "Tool available to this run."
    : description
}

function leaksInternalGuidance(description: string) {
  return /\/home\/user|<repo>|workspace-relative|args without|cwd|MCP|sandbox/i.test(
    description
  )
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
