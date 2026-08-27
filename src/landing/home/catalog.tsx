import { Section } from "../section"

type Playbook = {
  description: string
  name: string
  tag: string
}

/** Two cards, both real. An invented playbook is scope nobody asked for; the
 *  catalog grows from what pilot teams hand over, and the lede already says
 *  so. */
const playbooks: readonly Playbook[] = [
  {
    description:
      "One live page your leadership team opens before the sync. Every line linked to where it came from.",
    name: "The Monday pre-read",
    tag: "Flagship",
  },
  {
    description:
      "Who you're meeting, what's moved since last time, and what to raise.",
    name: "Meeting briefing",
    tag: "Playbook",
  },
]

/** Where the pre-read lives now: demoted from the product's identity to its
 *  flagship, still carrying the concrete day-one story. */
export function Catalog() {
  return (
    <Section
      lede="Playbooks and skills come out of the box, and the catalog grows with the work teams actually hand over. Most teams turn on the pre-read first and walk into Monday knowing what moved, what stalled, and what shipped, with nothing typed in."
      support
      title="Start with a job it already does"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        {playbooks.map((playbook) => (
          <PlaybookCard key={playbook.name} playbook={playbook} />
        ))}
      </div>
    </Section>
  )
}

function PlaybookCard({ playbook }: { playbook: Playbook }) {
  return (
    <div className="rounded-xl border bg-card p-5 text-card-foreground">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {playbook.tag}
      </p>
      <p className="mt-2 font-medium">{playbook.name}</p>
      <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
        {playbook.description}
      </p>
    </div>
  )
}
