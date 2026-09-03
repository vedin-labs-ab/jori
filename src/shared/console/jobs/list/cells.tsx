import { Pause } from "lucide-react"
import { SeparatorDot } from "../../dot"
import { RowMark } from "../../list/mark"
import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "../../materials/cells/name"
import { ConsoleLink } from "../../shell/link"
import { VisibilityMark } from "../../visibility/badge"
import { type Job } from "../types"
import { jobTriggerSummary, jobTypeIcon } from "./trigger"

/** Name column: the job's kind as its icon, a link to the job's page, the
 *  visibility mark for anything narrower than the organization, and the
 *  pause mark while the job is paused. */
export function JobNameCell({ job }: { job: Job }) {
  return (
    <MaterialNameCell icon={jobTypeIcon(job)}>
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

/** Trigger column: the kind and its detail on one line — "Recurring ·
 *  Fridays at 16:00", "Event · GitHub", "One-time · Sep 12". */
export function JobTriggerCell({ job }: { job: Job }) {
  const trigger = jobTriggerSummary(job)

  return (
    <span className="flex min-w-0 max-w-64 items-center gap-1.5">
      <span className="shrink-0 font-medium">{trigger.title}</span>
      <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      <span
        className="min-w-0 truncate text-muted-foreground"
        title={trigger.detailTitle}
      >
        {trigger.detail}
      </span>
    </span>
  )
}
