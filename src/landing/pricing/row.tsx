import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"

/** One line of an offer: what it covers, what you get, and the sentence
 *  that qualifies it. The plans and the extras share it so a reader who has
 *  learned to scan one list can scan the next. */
export function Row({
  icon: Icon,
  note,
  term,
  value,
}: {
  icon?: LucideIcon
  note: ReactNode
  term: string
  value: string
}) {
  return (
    <div className="grid gap-x-8 gap-y-1 py-5 sm:grid-cols-2 sm:items-baseline">
      <dt className="flex items-center gap-2.5 font-medium">
        {Icon === undefined ? null : (
          <Icon className="size-4 shrink-0 text-muted-foreground" />
        )}
        {term}
      </dt>
      <dd>
        <span className="font-medium">{value}</span>
        <span className="mt-0.5 block text-muted-foreground text-sm leading-relaxed">
          {note}
        </span>
      </dd>
    </div>
  )
}
