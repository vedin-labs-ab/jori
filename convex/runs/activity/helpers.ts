import { type ActivityMetadataItem } from "./types"

type MetadataKind = ActivityMetadataItem["kind"]

const maxTextLength = 80
const maxItems = 3

export function repositoryLabel(input: Record<string, unknown>) {
  const owner = readString(input.owner)
  const repo = readString(input.repo)

  return owner === undefined || repo === undefined
    ? undefined
    : `${owner}/${repo}`
}

export function issueOrPullTarget(input: Record<string, unknown>) {
  const repo = repositoryLabel(input)
  const number = readNumber(input.issueNumber) ?? readNumber(input.pullNumber)

  return repo === undefined || number === undefined
    ? undefined
    : `${repo}#${number}`
}

export function fileTarget(input: Record<string, unknown>) {
  const repo = repositoryLabel(input)
  const path = readString(input.path)

  if (path === undefined) {
    return repo
  }

  return repo === undefined ? path : `${repo}/${path}`
}

export function domainScope(value: unknown, prefix: string) {
  const domains = readStringArray(value)

  return domains === undefined || domains.length === 0
    ? undefined
    : item("scope", `${prefix} ${domains.slice(0, 2).join(", ")}`)
}

export function channelLabel(value: unknown) {
  const channel = readString(value)

  return channel === undefined
    ? undefined
    : channel.startsWith("#")
      ? channel
      : `channel ${channel}`
}

export function targetObjectLabel(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const id = readString(value.id)
  const type = readString(value.type)

  if (id === undefined) {
    return undefined
  }

  return type === undefined ? id : `${type} ${id}`
}

export function noun(tool: string) {
  if (tool.includes("thread")) {
    return "thread"
  }

  if (tool.includes("message")) {
    return "message"
  }

  if (tool.includes("file")) {
    return "file"
  }

  return tool.includes("issue") ? "issue" : "result"
}

export function compactMetadata(
  items: Array<ActivityMetadataItem | undefined>
) {
  const seen = new Set<string>()
  const result: ActivityMetadataItem[] = []

  for (const item of items) {
    if (item === undefined || seen.has(`${item.kind}:${item.text}`)) {
      continue
    }

    seen.add(`${item.kind}:${item.text}`)
    result.push(item)
  }

  return result.slice(0, maxItems)
}

export function item(kind: MetadataKind, value: string | undefined) {
  const text = cleanText(value)

  return text === undefined ? undefined : { kind, text }
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

export function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const items = value.filter((item): item is string => typeof item === "string")

  return items.length === 0 ? undefined : items
}

export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : undefined
}

export function displayUrl(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  try {
    const url = new URL(value)
    const path = url.pathname === "/" ? "" : url.pathname

    return `${url.hostname}${path}`
  } catch {
    return value
  }
}

export function countText(count: number | undefined, singular: string) {
  if (count === undefined) {
    return undefined
  }

  return count === 1 ? `1 ${singular}` : `${count} ${singular}s`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function cleanText(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  const text = value.replace(/\s+/g, " ").trim()

  if (text === "") {
    return undefined
  }

  return text.length <= maxTextLength
    ? text
    : `${text.slice(0, maxTextLength - 1).trimEnd()}...`
}
