export type RuntimeValueSummary =
  | { kind: "string"; preview: string; length: number }
  | { kind: "number"; preview: string }
  | { kind: "boolean" }
  | { kind: "null" }
  | { kind: "array"; size: number }
  | {
      hasMore?: boolean
      itemCount?: number
      itemKey?: string
      kind: "object"
      size: number
    }

export type RuntimeModelUsage = {
  durationMs: number
  inputTokens: number
  inputCacheReadTokens: number
  inputCacheWriteTokens: number
  inputUncachedTokens: number
  outputTokens: number
  reasoningTokens: number
  totalTokens: number
  toolCalls: number
}
