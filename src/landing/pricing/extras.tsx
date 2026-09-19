import { storageUsdPerGbMonth } from "@contracts/billing"
import { type ReactNode } from "react"
import { Section } from "../section"

export function Extras() {
  return (
    <Section
      beside
      lede="Add AI credit or file storage when you need more than the plan includes."
      support
      title="Need more usage or storage?"
    >
      <dl className="divide-y border-y">
        <Row
          note="Prepaid in dollars. Every run shows its charge, and purchased credit carries forward."
          term="Additional AI usage"
          value="Published model rates"
        />
        <Row
          note="Choose extra capacity that renews monthly. File storage and search indexing are included."
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
