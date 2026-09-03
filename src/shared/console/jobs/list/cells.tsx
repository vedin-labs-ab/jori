import { Pause, Workflow } from "lucide-react"
import { SeparatorDot } from "../../dot"
import { RowMark } from "../../list/mark"
import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "../../materials/cells/name"
import { ConsoleLink } from "../../shell/link"
import { VisibilityMark } from "../../visibility/badge"
import { type Job } from "../types"
import { jobTriggerSummary } from "./trigger"

/** Name column: the mark every surface files jobs under, a link to the
 *  job's page, the visibility mark for anything narrower than the
 *  organization, and the pause mark while the job is paused. What the job
 *  waits on is the Trigger column's to say. */
export function JobNameCell({ job }: { job: Job }) {
  return (
    <MaterialNameCell icon={Workflow}>
      <ConsoleLink
        className={materialNameLinkClassName}
        params={{ jobId: job.id }}
        title={job.name}
        to="/jobs/$jobId"
      >
        {job.name}
      </ConsoleLink>
      {job.visibility.mode === "organization" ? null : (
        <VisibilityMark visibility={job.visibility} />
      )}
      {job.status === "paused" ? (
        <RowMark icon={<Pause />} label="Paused" />
      ) : null}
    </MaterialNameCell>
  )
}

/** Trigger column, cadence first: "Weekly · Fri 15:00", "Monthly · 3rd
 *  08:00", "Event · Slack", "Once · Sep 12". The zone and the spelled-out
 *  day wait in the cell's title, and on the job's own page. */
export function JobTriggerCell({ job }: { job: Job }) {
  const trigger = jobTriggerSummary(job)

  return (
    <span className="flex min-w-0 max-w-64 items-center gap-1.5">
      <span className="shrink-0 font-medium">{trigger.title}</span>
      {trigger.detail === undefined ? null : (
        <>
          <SeparatorDot className="shrink-0 text-muted-foreground/60" />
          <span
            className="min-w-0 truncate text-muted-foreground"
            title={trigger.full}
          >
            {trigger.detail}
          </span>
        </>
      )}
    </span>
  )
}
