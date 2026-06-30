import { type ModelUsage } from "./types"

export function readModelUsage(response: { usage?: unknown }): ModelUsage {
  const usage = readRecord(response.usage)
  const inputTokenDetails = readRecord(usage?.inputTokenDetails)
  const outputTokenDetails = readRecord(usage?.outputTokenDetails)

  return {
    inputTokens: readNumber(usage?.inputTokens),
    inputCacheReadTokens: readNumber(inputTokenDetails?.cacheReadTokens),
    inputCacheWriteTokens: readNumber(inputTokenDetails?.cacheWriteTokens),
    inputUncachedTokens: readNumber(inputTokenDetails?.noCacheTokens),
    outputTokens: readNumber(usage?.outputTokens),
    reasoningTokens:
      readOptionalNumber(outputTokenDetails?.reasoningTokens) ??
      readNumber(usage?.reasoningTokens),
    totalTokens: readNumber(usage?.totalTokens),
  }
}

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined
}

function readNumber(value: unknown) {
  return readOptionalNumber(value) ?? 0
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
