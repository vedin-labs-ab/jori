import { Cpu } from "lucide-react"
import { type ActivityItem } from "./types"

type TokenUsage = NonNullable<ActivityItem["tokenUsage"]>

const tokenFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
})

export function ActivityTokenUsage({ usage }: { usage: TokenUsage }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
      <Cpu className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">
        {`in ${formatTokens(usage.input)} · out ${formatTokens(usage.output)} · reasoning ${formatTokens(usage.reasoning)} · total ${formatTokens(usage.total)}`}
      </span>
    </span>
  )
}

function formatTokens(value: number) {
  return tokenFormat.format(value)
}
