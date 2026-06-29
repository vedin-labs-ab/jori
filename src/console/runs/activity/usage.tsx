import { Cpu } from "lucide-react"
import { type TokenUsage, visibleTokenUsageMetrics } from "./usage-data"

const tokenFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
})

export function ActivityTokenUsage({ usage }: { usage: TokenUsage }) {
  const metrics = visibleTokenUsageMetrics(usage)

  if (metrics.length === 0) {
    return null
  }

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden whitespace-nowrap text-muted-foreground text-xs">
      <Cpu className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">
        {metrics
          .map((metric) => `${metric.label} ${formatTokens(metric.value)}`)
          .join(" · ")}
      </span>
    </span>
  )
}

function formatTokens(value: number) {
  return tokenFormat.format(value)
}
