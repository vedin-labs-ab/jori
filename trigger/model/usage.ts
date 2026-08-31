import { type RuntimeModelTokens } from "../../contracts/runtime/trace"

export function readModelTokens(response: {
  usage?: unknown
}): RuntimeModelTokens {
  const usage = readRecord(response.usage)
  const inputTokenDetails = readRecord(usage?.inputTokenDetails)
  const outputTokenDetails = readRecord(usage?.outputTokenDetails)

  return {
    cacheRead: readNumber(inputTokenDetails?.cacheReadTokens),
    cacheWrite: readNumber(inputTokenDetails?.cacheWriteTokens),
    input: readNumber(usage?.inputTokens),
    output: readNumber(usage?.outputTokens),
    reasoning:
      readOptionalNumber(outputTokenDetails?.reasoningTokens) ??
      readNumber(usage?.reasoningTokens),
    total: readNumber(usage?.totalTokens),
    uncached: readNumber(inputTokenDetails?.noCacheTokens),
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
