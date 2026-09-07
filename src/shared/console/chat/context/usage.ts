import { formatUsd, priceModelTokens } from "@contracts/billing"
import { type ChatContextUsage } from "../types"

export type ContextTone = "calm" | "critical" | "warm"

/** Amber from 70% of the window and the destructive color from 85%: each
 *  sits just under the share at which the run itself condenses. */
export const contextTones = { critical: 0.85, warm: 0.7 }

const tokenFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
})

/** The share of the window in use, clamped to the window. */
export function contextFraction(usage: ChatContextUsage) {
  if (usage.windowTokens <= 0) {
    return 0
  }

  return Math.min(1, Math.max(0, usage.usedTokens / usage.windowTokens))
}

export function contextPercent(usage: ChatContextUsage) {
  return Math.round(contextFraction(usage) * 100)
}

export function contextTone(fraction: number): ContextTone {
  if (fraction >= contextTones.critical) {
    return "critical"
  }

  return fraction >= contextTones.warm ? "warm" : "calm"
}

export function formatTokens(value: number) {
  return tokenFormat.format(value)
}

/** The last turn priced the way the ledger prices it; nothing until a turn
 *  has completed. Output already counts the reasoning. */
export function turnCost(usage: ChatContextUsage) {
  if (usage.turn === null) {
    return null
  }

  const micros = priceModelTokens(usage.model, {
    input: usage.turn.input,
    output: usage.turn.output,
  })

  return micros > 0 ? formatUsd(micros) : null
}
