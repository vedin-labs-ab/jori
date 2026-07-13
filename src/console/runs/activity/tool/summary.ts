import { countLabel } from "@/lib/count"

/** Presentation summaries for grouped execution tools. */
export type ActivityToolKind =
  | "generic"
  | "read"
  | "reaction"
  | "send"
  | "web-fetch"
  | "web-search"

type ToolSummaryItem = {
  title: string
}

export function activityToolKind(items: ToolSummaryItem[]): ActivityToolKind {
  const firstItem = items[0]

  if (firstItem === undefined) {
    return "generic"
  }

  const firstKind = activityToolKindForTitle(firstItem.title)

  if (firstKind === "generic") {
    return "generic"
  }

  return items.every(
    (item) => activityToolKindForTitle(item.title) === firstKind
  )
    ? firstKind
    : "generic"
}

export function activityToolFailureSummary(title: string) {
  return [
    activityToolCount(1, activityToolKindForTitle(title)),
    countLabel(1, "error"),
  ].join(" · ")
}

export function activityToolOutcomeSummary({
  completed,
  failed,
  toolKind,
  total,
}: {
  completed: number
  failed: number
  toolKind: ActivityToolKind
  total: number
}) {
  const parts = [activityToolCount(total, toolKind)]

  if (completed > 0) {
    parts.push(countLabel(completed, "result"))
  }

  if (failed > 0) {
    parts.push(countLabel(failed, "error"))
  }

  return parts.join(" · ")
}

export function activityToolKindForTitle(title: string): ActivityToolKind {
  const normalizedTitle = title.toLowerCase()

  if (normalizedTitle.includes("search") && normalizedTitle.includes("web")) {
    return "web-search"
  }

  if (
    normalizedTitle.includes("fetch") &&
    titleIncludesAny(normalizedTitle, ["page", "web"])
  ) {
    return "web-fetch"
  }

  if (normalizedTitle.includes("reaction")) {
    return "reaction"
  }

  if (normalizedTitle.includes("send") || normalizedTitle.includes("reply")) {
    return "send"
  }

  if (normalizedTitle.includes("read")) {
    return "read"
  }

  return "generic"
}

function activityToolCount(count: number, toolKind: ActivityToolKind) {
  switch (toolKind) {
    case "generic":
      return countLabel(count, "action")
    case "read":
      return countLabel(count, "file")
    case "reaction":
      return countLabel(count, "reaction")
    case "send":
      return countLabel(count, "reply")
    case "web-fetch":
      return countLabel(count, "page")
    case "web-search":
      return countLabel(count, "query")
  }
}

function titleIncludesAny(title: string, terms: string[]) {
  return terms.some((term) => title.includes(term))
}
