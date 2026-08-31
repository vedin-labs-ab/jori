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

/** Every token the turn was billed for. `input` and `output` carry the two
 *  quantities the rate table prices — the same pair the ledger stores — and
 *  the rest break those down. */
export type RuntimeModelTokens = {
  cacheRead: number
  cacheWrite: number
  input: number
  output: number
  reasoning: number
  total: number
  uncached: number
}

export type RuntimeModelUsage = {
  durationMs: number
  tokens: RuntimeModelTokens
  toolCalls: number
}
