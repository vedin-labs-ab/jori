import { storageUsdPerGbMonth } from "@contracts/billing"
import { type ReactNode } from "react"
import { Section } from "../section"

/** What the cloud plan grows into, at the rates it grows at. Both draw on
 *  prepaid credit under a limit the organization sets, so the page never
 *  has to say "no surprise invoice": there is no invoice to surprise. */
export function Extras() {
  return (
    <Section
      beside
      lede="Cloud includes room to start. Add more when there's a reason to."
      support
      title="Grow the work. Keep the plan."
    >
      <dl className="divide-y border-y">
        <Row
          note="Prepaid in dollars. Every run shows its charge, and purchased credit carries forward."
          term="Additional AI usage"
          value="Published model rates"
        />
        <Row
          note="Billed for the time you store it, under a limit you set."
          term="Additional file storage"
          value={`$${storageUsdPerGbMonth.toFixed(2)} per GB-month`}
        />
      </dl>
    </Section>
  )
}

function Row({
  note,
  term,
  value,
}: {
  note: ReactNode
  term: string
  value: string
}) {
  return (
    <div className="grid gap-x-8 gap-y-1 py-5 sm:grid-cols-2 sm:items-baseline">
      <dt className="font-medium">{term}</dt>
      <dd>
        <span className="font-medium">{value}</span>
        <span className="mt-0.5 block text-muted-foreground text-sm leading-relaxed">
          {note}
        </span>
      </dd>
    </div>
  )
}
