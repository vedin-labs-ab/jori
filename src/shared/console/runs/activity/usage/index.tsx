import { formatUsd, priceModelTokens } from "@contracts/billing"
import { isModelSlug } from "@contracts/models/catalog"
import { Cpu } from "lucide-react"
import { type TokenUsage, visibleTokenUsageMetrics } from "./metrics"

const tokenFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
})

export function ActivityTokenUsage({ usage }: { usage: TokenUsage }) {
  const metrics = visibleTokenUsageMetrics(usage)

  if (metrics.length === 0) {
    return null
  }

  // The receipt line: the same list-rate pricing the ledger debits with,
  // for the model the step ran on; a model outside the catalog has none.
  const costMicros = isModelSlug(usage.model)
    ? priceModelTokens(usage.model, usage)
    : 0

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden whitespace-nowrap text-muted-foreground text-xs">
      <Cpu className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">
        {[
          ...metrics.map(
            (metric) => `${metric.label} ${formatTokens(metric.value)}`
          ),
          ...(costMicros > 0 ? [formatUsd(costMicros)] : []),
        ].join(" · ")}
      </span>
    </span>
  )
}

function formatTokens(value: number) {
  return tokenFormat.format(value)
}
