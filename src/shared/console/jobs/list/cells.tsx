import { Workflow } from "lucide-react"
import { SeparatorDot } from "../../dot"
import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "../../materials/cells/name"
import { ConsoleLink } from "../../shell/link"
import { VisibilityNameMark } from "../../visibility/table"
import { JobStatus } from "../status"
import { type Job } from "../types"
import { jobTriggerSummary } from "./trigger"

/** Object identity leads; compact audience and lifecycle metadata follow
 * only while their full cells are hidden. */
export function JobNameCell({ job }: { job: Job }) {
  return (
    <MaterialNameCell icon={Workflow}>
      <ConsoleLink
        className={materialNameLinkClassName}
        draggable={false}
        params={{ jobId: job.id }}
        title={job.name}
        to="/jobs/$jobId"
      >
        {job.name}
      </ConsoleLink>
      {job.status === "active" ? null : (
        <span className="@md/list:hidden">
          <JobStatus status={job.status} />
        </span>
      )}
      <VisibilityNameMark
        visibility={job.visibility}
        folderId={job.folderId}
        ownerId={job.ownerId}
      />
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
      {job.status !== "active" ? (
        <>
          <SeparatorDot className="text-muted-foreground/60" />
          <JobStatus status={job.status} />
        </>
      ) : null}
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
