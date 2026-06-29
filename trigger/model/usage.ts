import { type ModelUsage } from "./types"

export function readModelUsage(response: {
  usage?: unknown
}): ModelUsage | undefined {
  const usage = response.usage

  if (typeof usage !== "object" || usage === null) {
    return undefined
  }

  const outputTokenDetails = readRecord(usage, "outputTokenDetails")

  return compactUsage({
    inputTokens: readNumber(usage, "inputTokens"),
    ...readInputTokenUsage(usage),
    outputTokens: readNumber(usage, "outputTokens"),
    reasoningTokens:
      readNumber(outputTokenDetails, "reasoningTokens") ??
      readNumber(usage, "reasoningTokens"),
    totalTokens: readNumber(usage, "totalTokens"),
  })
}

function readInputTokenUsage(usage: object): ModelUsage {
  const inputTokenDetails = readRecord(usage, "inputTokenDetails")

  return {
    inputCacheReadTokens: readNumber(inputTokenDetails, "cacheReadTokens"),
    inputCacheWriteTokens: readNumber(inputTokenDetails, "cacheWriteTokens"),
    inputUncachedTokens: readNumber(inputTokenDetails, "noCacheTokens"),
  }
}

function compactUsage(usage: ModelUsage) {
  const entries = Object.entries(usage).filter(
    ([, value]) => value !== undefined
  )

  return entries.length === 0
    ? undefined
    : (Object.fromEntries(entries) as ModelUsage)
}

function readRecord(record: object, key: string) {
  if (!(key in record)) {
    return undefined
  }

  const value = record[key as keyof typeof record]

  return typeof value === "object" && value !== null ? value : undefined
}

function readNumber(record: object | undefined, key: string) {
  if (record === undefined || !(key in record)) {
    return undefined
  }

  const value = record[key as keyof typeof record]

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
