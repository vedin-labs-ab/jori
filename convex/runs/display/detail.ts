export type ExecutionDetailType =
  | "channel"
  | "comment"
  | "decision"
  | "issue"
  | "message"
  | "next"
  | "page"
  | "pull_request"
  | "repository"
  | "status"
  | "stopped"
  | "tools"
  | "web_search"

export type ExecutionDetailGroup = {
  type: string
  label: string
  tools: ExecutionDetailTool[]
}

export type ExecutionDetailTool = {
  access: "read" | "write"
  description: string
  label: string
  requiresApproval?: boolean
  tool: string
}

export type ExecutionDetail = {
  type: ExecutionDetailType
  label: string
  url?: string
  at?: number
  groups?: ExecutionDetailGroup[]
}

export function detail(
  type: ExecutionDetailType,
  label: string | undefined,
  options: {
    at?: number
    groups?: ExecutionDetailGroup[]
    url?: string
  } = {}
): ExecutionDetail | undefined {
  const normalizedLabel = label?.trim()

  if (normalizedLabel === undefined || normalizedLabel === "") {
    return undefined
  }

  return {
    type,
    label: normalizedLabel,
    ...(options.url === undefined || options.url === ""
      ? {}
      : { url: options.url }),
    ...(options.at === undefined ? {} : { at: options.at }),
    ...(options.groups === undefined || options.groups.length === 0
      ? {}
      : { groups: options.groups }),
  }
}

export function compactDetails(details: Array<ExecutionDetail | undefined>) {
  return details.filter(
    (detail): detail is ExecutionDetail => detail !== undefined
  )
}

export function uniqueDetails(details: Array<ExecutionDetail | undefined>) {
  const seenLabels = new Set<string>()
  const seenUrls = new Set<string>()
  const result: ExecutionDetail[] = []

  for (const detail of compactDetails(details)) {
    const labelKey = `${detail.type}:${detail.label.toLowerCase()}`
    const urlKey =
      detail.url === undefined ? undefined : `${detail.type}:${detail.url}`

    if (
      seenLabels.has(labelKey) ||
      (urlKey !== undefined && seenUrls.has(urlKey))
    ) {
      continue
    }

    seenLabels.add(labelKey)
    if (urlKey !== undefined) {
      seenUrls.add(urlKey)
    }
    result.push(detail)
  }

  return result
}

export function snippet(value: string | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim()

  if (normalized === undefined || normalized === "") {
    return undefined
  }

  return normalized.length > 140
    ? `${normalized.slice(0, 137).trimEnd()}...`
    : normalized
}

export function commentLabel(commentId: string | undefined) {
  return commentId === undefined ? undefined : `Comment ${commentId}`
}

export function compactText(parts: Array<string | undefined>) {
  const present = parts.filter((part) => part !== undefined && part !== "")

  return present.length === 0 ? undefined : present.join(" ")
}
