import { type ChatUsage } from "@openrouter/sdk/models"
import { type RuntimeModelTokens } from "../../../contracts/runtime/trace"

// OpenRouter reports prompt tokens inclusive of the cached ones, so the
// uncached count is the remainder.
export function readModelTokens(
  usage: ChatUsage | undefined
): RuntimeModelTokens {
  const input = usage?.promptTokens ?? 0
  const cacheRead = usage?.promptTokensDetails?.cachedTokens ?? 0

  return {
    cacheRead,
    cacheWrite: usage?.promptTokensDetails?.cacheWriteTokens ?? 0,
    input,
    output: usage?.completionTokens ?? 0,
    reasoning: usage?.completionTokensDetails?.reasoningTokens ?? 0,
    total: usage?.totalTokens ?? 0,
    uncached: Math.max(0, input - cacheRead),
  }
}
