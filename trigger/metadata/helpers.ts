import { type RuntimeToolMetadataItem } from "../types"

type MetadataKind = RuntimeToolMetadataItem["kind"]

const maxTextLength = 80
const maxItems = 3

export function compactMetadata(
  items: Array<RuntimeToolMetadataItem | undefined>
) {
  const seen = new Set<string>()
  const result: RuntimeToolMetadataItem[] = []

  for (const item of items) {
    if (item === undefined) {
      continue
    }

    const key = `${item.kind}:${item.text}`

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
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

export function arrayCount(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined
  }

  const entry = value[key]

  return Array.isArray(entry) ? entry.length : undefined
}

export function nestedArrayCount(
  value: unknown,
  key: string,
  childKey: string
) {
  if (!isRecord(value) || !isRecord(value[key])) {
    return undefined
  }

  const entry = value[key][childKey]

  return Array.isArray(entry) ? entry.length : undefined
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
