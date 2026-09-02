import { BrandIcon } from "@/shared/brand"
import { Definition, Prop, Section } from "../section"

type Renewal = {
  account: string
  renewal: string
  state: "At risk" | "On track"
}

/** The same company as the rest of the page: the escalation the hero's
 *  pre-read flagged is the renewal at risk here. */
const renewals: readonly Renewal[] = [
  { account: "Harbor House", renewal: "Sep 24", state: "At risk" },
  { account: "Beacon Works", renewal: "Oct 2", state: "On track" },
  { account: "Juniper Supply", renewal: "Oct 9", state: "On track" },
]

/** The materials pillar. The four object kinds compress to two terms plus
 *  the payoff; the taxonomy belongs in docs, and the page sells shared
 *  materials plus the correctability that makes them trustworthy. */
export function Materials() {
  return (
    <Section
      lede="The workspace holds what the team knows. You and Jori read and edit the same materials under the same permissions, so anything it keeps current is something anyone can check and correct."
      title="It works on your materials"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <dl className="space-y-8">
          <Definition term="Files and knowledge">
            Upload files as raw storage, or index them into knowledge Jori
            searches while it works.
          </Definition>
          <Definition term="Tables and stores">
            Structured data Jori maintains and people edit by hand. A table is a
            table, not a chat transcript.
          </Definition>
          <Definition term="One page, not one per person">
            Every material has a live, read-only page. Send it with a link that
            expires, readable without signing in to anything.
          </Definition>
        </dl>
        <RenewalsTable />
      </div>
    </Section>
  )
}

/** A table a job keeps and a person can correct, which is the whole
 *  section's claim in one prop. Only the at-risk row earns a tone: the table
 *  exists for the row somebody has to act on. */
function RenewalsTable() {
  return (
    <Prop
      label={
        <>
          <BrandIcon className="size-4" />
          <span className="font-medium text-foreground">Customer renewals</span>
          <span className="ml-auto">Updated 07:10</span>
        </>
      }
    >
      <div className="divide-y">
        {renewals.map((row) => (
          <RenewalRow key={row.account} row={row} />
        ))}
      </div>
      <p className="border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        Kept current by a job. Anyone can correct a cell.
      </p>
    </Prop>
  )
}

function RenewalRow({ row }: { row: Renewal }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="min-w-0 flex-1 truncate font-medium text-[13px]">
        {row.account}
      </span>
      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
        {row.renewal}
      </span>
      <span
        className={`w-14 shrink-0 text-right text-xs ${
          row.state === "At risk" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {row.state}
      </span>
    </div>
  )
}
