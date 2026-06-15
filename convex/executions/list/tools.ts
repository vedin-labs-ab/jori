import { type Doc } from "../../_generated/dataModel"
import { compactDetails, detail, type ExecutionDetailGroup } from "./detail"

type ToolSnapshot = Doc<"executions">["toolSnapshot"]

export function toolDetails(input: {
  includeWebSearch: boolean
  snapshot: ToolSnapshot
}) {
  if (input.snapshot === undefined) {
    return []
  }

  const tools = toolsDetail(input.snapshot.groups)

  return compactDetails([
    tools === undefined
      ? undefined
      : detail("tools", tools.label, { groups: tools.groups }),
    input.includeWebSearch
      ? detail(
          "web_search",
          input.snapshot.webSearch === true ? "Allowed" : "Blocked"
        )
      : undefined,
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
            values: group.tools,
          } satisfies ExecutionDetailGroup)
    )
    .filter(isPresent)

  if (detailGroups.length === 0) {
    return undefined
  }

  return {
    groups: detailGroups,
    label: detailGroups
      .map((group) => `${group.label} · ${group.values.join(", ")}`)
      .join(" · "),
  }
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined
}
