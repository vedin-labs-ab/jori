export type ActivityToolKind =
  | "generic"
  | "read"
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

  const firstKind = activityToolFamily(firstItem.title)

  if (firstKind === "generic") {
    return "generic"
  }

  return items.every((item) => activityToolFamily(item.title) === firstKind)
    ? firstKind
    : "generic"
}

export function activityToolFailureSummary(title: string) {
  return [
    activityToolCount(1, activityToolFamily(title)),
    countText(1, "error"),
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
    parts.push(countText(completed, "result"))
  }

  if (failed > 0) {
    parts.push(countText(failed, "error"))
  }

  return parts.join(" · ")
}

function activityToolFamily(title: string): ActivityToolKind {
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
      return countText(count, "action")
    case "read":
      return countText(count, "file")
    case "send":
      return countText(count, "reply")
    case "web-fetch":
      return countText(count, "page")
    case "web-search":
      return countText(count, "query")
  }
}

function countText(count: number, singular: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${pluralize(singular)}`
}

function pluralize(singular: string) {
  return singular.endsWith("y") ? `${singular.slice(0, -1)}ies` : `${singular}s`
}

function titleIncludesAny(title: string, terms: string[]) {
  return terms.some((term) => title.includes(term))
}
