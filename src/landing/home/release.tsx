import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { Prop } from "../section"

type RowState = "blocked" | "waiting" | "ready"

const stateStyles = {
  blocked: "bg-destructive",
  waiting: "bg-warning",
  ready: "bg-primary",
} satisfies Record<RowState, string>

/** The hero app: what Milo leaves behind after it takes over a team's release
 *  checklist. Live state, one shared surface, kept current by a run. All prop
 *  content lives in the Copperline fiction. */
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
      <div className="px-5 pt-4 pb-2">
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-sm">Copperline 2.14</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            2 blocking
          </span>
        </p>
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          Cutting Thursday. Two items need a person before it can ship.
        </p>
      </div>
      <div className="divide-y border-t">
        <ReleaseRow
          note="Review docs came back with two signatures missing."
          owner="Jonas"
          reference="COP-73"
          state="blocked"
          title="Tip-pooling certification"
        />
        <ReleaseRow
          note="Failed twice on CI this week. Nobody assigned."
          reference="#491"
          state="blocked"
          title="Payroll sync test is flaky"
        />
        <ReleaseRow
          note="Approved by Priya, waiting on a second review."
          owner="Ada"
          reference="#512"
          state="waiting"
          title="Per-location split rollout"
        />
        <ReleaseRow
          note="Merged and deployed to staging."
          owner="Jonas"
          reference="COP-68"
          state="ready"
          title="Timesheet export fix"
        />
      </div>
      <p className="border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        Milo rechecks every morning and before the cut. Everyone sees the same
        page.
      </p>
    </Prop>
  )
}

function ReleaseRow({
  note,
  owner,
  reference,
  state,
  title,
}: {
  note: string
  owner?: string
  reference: string
  state: RowState
  title: string
}) {
  return (
    <div className="flex gap-3 px-5 py-3">
      <StateDot state={state} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {reference}
          </span>
          <span className="font-medium text-[13px] leading-snug">{title}</span>
        </p>
        <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
          {note}
        </p>
      </div>
      <Owner>{owner}</Owner>
    </div>
  )
}

function StateDot({ state }: { state: RowState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-1.5 size-1.5 shrink-0 rounded-full",
        stateStyles[state]
      )}
    />
  )
}

function Owner({ children }: { children: ReactNode }) {
  return (
    <span className="ml-auto shrink-0 pt-px text-muted-foreground text-xs">
      {children ?? "Unowned"}
    </span>
  )
}
