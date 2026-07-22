import { type ReactNode } from "react"
import { Prop } from "../section"

type Receipt = {
  at: string
  step: string
  done?: boolean
}

/** A run's activity as timestamped receipts, ending on the one primary dot. */
export function ReceiptsTimeline({
  label,
  receipts,
}: {
  label: ReactNode
  receipts: readonly Receipt[]
}) {
  return (
    <Prop label={label}>
      <ol className="space-y-2.5 px-5 py-4">
        {receipts.map((receipt) => (
          <li className="flex items-center gap-3" key={receipt.step}>
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                receipt.done ? "bg-primary" : "bg-border"
              }`}
            />
            <span className="flex-1 text-sm">{receipt.step}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {receipt.at}
            </span>
          </li>
        ))}
      </ol>
    </Prop>
  )
}
