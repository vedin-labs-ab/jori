import { type Integration } from "@contracts/integrations"
import { BrandIcon } from "@/shared/brand"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Prop } from "../section"

type Blocker = {
  integration: Integration
  note: string
  owner: string
  reference: string
  title: string
}

/** Only what needs a person. The rest of the release is a number. */
const blockers: readonly Blocker[] = [
  {
    integration: "linear",
    note: "Review docs came back with two signatures missing.",
    owner: "Jonas",
    reference: "COP-73",
    title: "Tip-pooling certification",
  },
  {
    integration: "github",
    note: "Failed twice on CI this week. Nobody assigned.",
    owner: "Unowned",
    reference: "#491",
    title: "Payroll sync test is flaky",
  },
]

/**
 * The hero app.
 *
 * It has one job: show that this is a page a team opens, not a message. So it
 * answers the three questions a page like that exists to answer, in order.
 * Where does the release stand, what is stopping it, and is this current.
 *
 * A finished item earns no room here. Listing what already shipped fills the
 * card with rows nobody has to act on, and the reason to open the page is the
 * two that somebody does. The source logos carry the rest of the argument:
 * this is assembled across tools, which is the part no single one of them
 * gives you.
 */
export function ReleaseApp() {
  return (
    <Prop
      label={
        <>
          <BrandIcon className="size-4" />
          <span className="font-medium text-foreground">Release readiness</span>
          <span className="ml-auto">Updated 4m ago</span>
        </>
      }
    >
      <div className="px-5 pt-4 pb-3.5">
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-sm">Copperline 2.14</span>
          <span className="text-muted-foreground text-xs">Cuts Thursday</span>
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs">
          <Count label="blocking" tone="text-destructive" value={2} />
          <Separator />
          <Count label="in review" tone="text-warning" value={1} />
          <Separator />
          <Count label="ready" tone="text-primary" value={11} />
        </p>
      </div>
      <p className="border-t bg-muted/30 px-5 py-2 text-muted-foreground text-xs">
        Needs a person
      </p>
      <div className="divide-y border-t">
        {blockers.map((blocker) => (
          <BlockerRow blocker={blocker} key={blocker.reference} />
        ))}
      </div>
      <p className="border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        Jori rechecks every morning and before the cut. Everyone opens the same
        page.
      </p>
    </Prop>
  )
}

function Count({
  label,
  tone,
  value,
}: {
  label: string
  tone: string
  value: number
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={`font-medium tabular-nums ${tone}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-border">
      ·
    </span>
  )
}

function BlockerRow({ blocker }: { blocker: Blocker }) {
  return (
    <div className="px-5 py-3">
      <p className="flex flex-wrap items-center gap-x-2">
        <IntegrationLogo
          className="size-3.5"
          integration={blocker.integration}
        />
        <span className="text-muted-foreground text-xs tabular-nums">
          {blocker.reference}
        </span>
        <span className="font-medium text-[13px] leading-snug">
          {blocker.title}
        </span>
        <span className="ml-auto shrink-0 text-muted-foreground text-xs">
          {blocker.owner}
        </span>
      </p>
      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
        {blocker.note}
      </p>
    </div>
  )
}
