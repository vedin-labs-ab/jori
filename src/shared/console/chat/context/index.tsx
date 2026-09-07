import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type ChatContextUsage } from "../types"
import { ContextRing } from "./ring"
import {
  type ContextTone,
  contextFraction,
  contextPercent,
  contextTone,
  formatTokens,
  turnCost,
} from "./usage"

const toneClassName: Record<ContextTone, string> = {
  calm: "text-muted-foreground",
  critical: "text-destructive",
  warm: "text-amber-600 dark:text-amber-500",
}

/** How much of the model's window the run is using: a ring with the share
 *  beside it, the tokens on hover, and the last turn's breakdown and cost
 *  on click. Amber from 70% and the destructive color from 85%, just
 *  under the shares at which the run condenses its history. */
export function ContextIndicator({ usage }: { usage: ChatContextUsage }) {
  const fraction = contextFraction(usage)
  const percent = contextPercent(usage)
  const summary = tokensSummary(usage)

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            aria-label={`Context: ${percent}%, ${summary}`}
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-xs tabular-nums outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
              toneClassName[contextTone(fraction)]
            )}
            type="button"
          >
            <ContextRing fraction={fraction} />
            {percent}%
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{summary}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64">
        <ContextBreakdown percent={percent} summary={summary} usage={usage} />
      </PopoverContent>
    </Popover>
  )
}

function tokensSummary(usage: ChatContextUsage) {
  return `${formatTokens(usage.usedTokens)} of ${formatTokens(usage.windowTokens)} tokens`
}

/** The window's use, then the last turn's tokens and what they cost at
 *  list rates: the same receipt the Activity page shows per model step. */
function ContextBreakdown({
  percent,
  summary,
  usage,
}: {
  percent: number
  summary: string
  usage: ChatContextUsage
}) {
  const cost = turnCost(usage)

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-sm">Context</span>
          <span className="text-muted-foreground tabular-nums">{percent}%</span>
        </div>
        <Progress aria-label="Context used" className="h-1" value={percent} />
        <p className="text-muted-foreground">{summary}</p>
      </div>
      {usage.turn === null ? (
        <p className="text-muted-foreground">No turn has completed yet.</p>
      ) : (
        <dl className="grid gap-1">
          <dt className="font-medium">Last turn</dt>
          <TurnRow label="Input" value={formatTokens(usage.turn.input)} />
          <TurnRow label="Output" value={formatTokens(usage.turn.output)} />
          <TurnRow
            label="Reasoning"
            value={formatTokens(usage.turn.reasoning)}
          />
          <TurnRow label="Cached" value={formatTokens(usage.turn.cached)} />
          {cost === null ? null : <TurnRow label="Cost" value={cost} />}
        </dl>
      )}
    </div>
  )
}

function TurnRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
