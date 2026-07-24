import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ProviderLogo } from "@/shared/logo/provider"
import { Prop } from "../section"

export type Receipt = {
  at: string
  step: string
  /** The line under the step: what it touched, in the run's own words. */
  detail?: string
  /** Drawn in the node. A provider logo when the step used that tool, a
   *  lucide icon when the step is Milo's own. */
  surface?: string
  icon?: LucideIcon
  /** The step that ended the run. Takes the accent, once. */
  done?: boolean
}

/**
 * A run's activity in the shape the console draws it: a rail through circular
 * nodes, each carrying the tool the step used, with the step above its detail
 * and the clock on the right. Compact enough for a marketing prop, close
 * enough that the console is recognisable from it.
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
        <span
          className={cn(
            "relative z-10 mt-1.5 grid size-6 place-items-center rounded-full border bg-background",
            receipt.done
              ? "border-primary/50 bg-primary/5 text-primary"
              : "text-muted-foreground"
          )}
        >
          {receipt.surface === undefined ? null : (
            <ProviderLogo className="size-3" surface={receipt.surface} />
          )}
          {Icon === undefined ? null : <Icon className="size-3" />}
        </span>
      </div>
      <div className="flex min-w-0 items-baseline gap-3 pt-1.5 pb-3.5">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[13px] leading-snug">{receipt.step}</p>
          {receipt.detail === undefined ? null : (
            <p className="mt-0.5 truncate text-muted-foreground text-xs">
              {receipt.detail}
            </p>
          )}
        </div>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {receipt.at}
        </span>
      </div>
    </li>
  )
}
