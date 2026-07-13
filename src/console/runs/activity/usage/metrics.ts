import { type ActivityItem } from "../types"

export type TokenUsage = NonNullable<ActivityItem["tokenUsage"]>

type TokenUsageMetric = {
  label: string
  value: number
}

export function hasVisibleTokenUsage(usage: TokenUsage) {
  return visibleTokenUsageMetrics(usage).length > 0
}

export function visibleTokenUsageMetrics(
  usage: TokenUsage
): TokenUsageMetric[] {
  return [
    { label: "in", value: usage.input },
    { label: "out", value: usage.output },
    { label: "reasoning", value: usage.reasoning },
    { label: "total", value: usage.total },
  ].filter((metric) => metric.value !== 0)
}
