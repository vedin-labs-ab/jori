import { Section } from "../section"
import { Row } from "./row"

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
          note="Prepaid in dollars. Every run shows its charge, and credit carries forward."
          term="Additional AI usage"
          value="Published model rates"
        />
        <Row
          note="Billed for the time you store it, under a limit you set."
          term="Additional file storage"
          value="$0.10 per GB-month"
        />
      </dl>
    </Section>
  )
}
