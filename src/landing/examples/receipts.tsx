import { type LucideIcon, Timer } from "lucide-react"
import { type ReactNode } from "react"
import { Separator } from "@/components/ui/separator"
import { ProviderLogo } from "@/shared/logo/provider"
import { Prop } from "../section"

export type Receipt = {
  /** Wall clock, because the promise on this page is a timestamped record. */
  at: string
  /** What the step did. */
  step: string
  /** The console draws the kind of work in the node, not the tool: reading,
   *  writing, sending. The tool itself is named in the metadata. */
  icon: LucideIcon
  /** Which connected account the step went through. */
  surface: string
  source: string
  /** What it touched, in the run's own words. */
  detail: string
  /** How long it took, already formatted the way the console formats it. */
  duration: string
}

/**
 * A run's activity in the shape the console draws it: a rail through kind
 * icons, then a metadata line that names the account, what it touched, and
 * how long it took, separated the way the console separates them.
 *
 * Every row carries the same three metadata parts, so every row is the same
 * height. A receipt where some entries are taller than others reads as a
 * summary someone wrote; an even rail reads as a record something kept.
 */
export function ReceiptsTimeline({
  label,
  receipts,
}: {
  label: ReactNode
  receipts: readonly Receipt[]
}) {
  return (
    <Prop label={label}>
      <ol className="grid px-5 py-4">
        {receipts.map((receipt, index) => (
          <ReceiptRow
            isFirst={index === 0}
            isLast={index === receipts.length - 1}
            key={receipt.step}
            receipt={receipt}
          />
        ))}
      </ol>
    </Prop>
  )
}

function ReceiptRow({
  isFirst,
  isLast,
  receipt,
}: {
  isFirst: boolean
  isLast: boolean
  receipt: Receipt
}) {
  const Icon = receipt.icon

  return (
    <li className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center">
        {isFirst ? null : (
          <span className="absolute top-0 h-1.5 w-px bg-border" />
        )}
        {isLast ? null : (
          <span className="absolute top-7 bottom-0 w-px bg-border" />
        )}
        <span className="relative z-10 mt-1.5 grid size-6 place-items-center rounded-full border bg-background text-muted-foreground">
          <Icon className="size-3" />
        </span>
      </div>
      <div className="flex min-w-0 items-baseline gap-3 pt-1.5 pb-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[13px] leading-snug">{receipt.step}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-muted-foreground text-xs">
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <ProviderLogo className="size-3.5" surface={receipt.surface} />
              {receipt.source}
            </span>
            <ReceiptSeparator />
            <span className="min-w-0 truncate">{receipt.detail}</span>
            <ReceiptSeparator />
            <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
              <Timer className="size-3.5" />
              {receipt.duration}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {receipt.at}
        </span>
      </div>
    </li>
  )
}

function ReceiptSeparator() {
  return (
    <Separator
      className="shrink-0 data-vertical:h-3 data-vertical:self-center"
      orientation="vertical"
    />
  )
}
