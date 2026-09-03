import { ClipboardList, Folder, Globe, UserRound, Wrench } from "lucide-react"
import { type ReactNode } from "react"
import { SeparatorDot } from "../../dot"
import { MaterialFolderCell } from "../../materials/cells/folder"
import { MaterialOwnerCell } from "../../materials/cells/owner"
import { type FolderNames } from "../../materials/folders"
import { materialOwner } from "../../materials/owners"
import { DetailLine, DetailRow, DetailValue } from "../../runs/details"
import { RunSectionLabel } from "../../runs/section"
import { absoluteTime, relativeTime } from "../../time"
import { ToolGroupsValue } from "../../tools/groups"
import { visibilityIcon, visibilityLabel } from "../../visibility/marks"
import { jobTriggerSummary, jobTypeIcon, nextRunAt } from "../list/trigger"
import { type Job } from "../types"
import { jobToolGroups } from "./tools"

export type JobDetailProps = {
  folders: FolderNames | undefined
  /** The Instructions row's body. The host loads the renderer, which
   *  carries the markdown codec, so the page's own chunk stays light. */
  instructions: ReactNode
  job: Job
  now: number
  /** The Runs section's rows, over the host's own query. */
  runs: ReactNode
}

/** A job's page: an overview that reads like a run's opened detail — the
 *  brief, how it starts, what it may touch, where it is filed and who
 *  sees it — then the runs it has left behind. */
export function JobDetail({
  folders,
  instructions,
  job,
  now,
  runs,
}: JobDetailProps) {
  const groups = jobToolGroups(job)
  const toolCount = groups.reduce((sum, group) => sum + group.tools.length, 0)

  return (
    <>
      <section
        aria-label="Overview"
        className="divide-y rounded-md bg-background ring-1 ring-foreground/10 ring-inset"
      >
        <DetailRow icon={ClipboardList} label="Instructions">
          {instructions}
        </DetailRow>
        <DetailRow icon={jobTypeIcon(job)} label="Trigger">
          <JobTriggerLine job={job} now={now} />
        </DetailRow>
        <DetailRow
          icon={Wrench}
          label={
            <RunSectionLabel label={{ count: toolCount, singular: "Tool" }} />
          }
        >
          <DetailLine>
            {groups.length === 0 ? (
              <DetailValue>No tools</DetailValue>
            ) : (
              <ToolGroupsValue
                description="Tools this job runs with."
                groups={groups}
              />
            )}
          </DetailLine>
        </DetailRow>
        <DetailRow icon={Globe} label="Web search">
          <DetailLine>
            <DetailValue>
              {job.access.webSearch ? "Allowed" : "Blocked"}
            </DetailValue>
          </DetailLine>
        </DetailRow>
        <DetailRow icon={Folder} label="Folder">
          <DetailLine>
            <MaterialFolderCell folderId={job.folderId} folders={folders} />
          </DetailLine>
        </DetailRow>
        <DetailRow
          icon={visibilityIcon(job.visibility.mode)}
          label="Visibility"
        >
          <DetailLine>
            <DetailValue>{visibilityLabel(job.visibility)}</DetailValue>
          </DetailLine>
        </DetailRow>
        <DetailRow icon={UserRound} label="Created">
          <DetailLine>
            <MaterialOwnerCell compact owner={materialOwner(job)} />
            <SeparatorDot className="text-muted-foreground/60" />
            <span className="text-muted-foreground">
              {absoluteTime(job.createdAt)}
            </span>
          </DetailLine>
        </DetailRow>
      </section>
      <section aria-labelledby="job-runs" className="grid gap-3">
        <h2 className="font-medium text-sm" id="job-runs">
          Runs
        </h2>
        {runs}
      </section>
    </>
  )
}

/** How the job starts, and when it next will: the list's trigger cell
 *  with the next run beside it, or the reason there is none. */
function JobTriggerLine({ job, now }: { job: Job; now: number }) {
  const trigger = jobTriggerSummary(job)
  const next = nextRunAt(job)

  return (
    <DetailLine>
      <DetailValue>{trigger.title}</DetailValue>
      <SeparatorDot className="text-muted-foreground/60" />
      <span
        className="min-w-0 truncate text-muted-foreground"
        title={trigger.detailTitle}
      >
        {trigger.detail}
      </span>
      {next === undefined && job.status === "active" ? null : (
        <>
          <SeparatorDot className="text-muted-foreground/60" />
          <span
            className="text-muted-foreground"
            title={next === undefined ? undefined : absoluteTime(next)}
          >
            {next === undefined
              ? job.status === "paused"
                ? "Paused"
                : "Completed"
              : `Next ${relativeTime(next, now)}`}
          </span>
        </>
      )}
    </DetailLine>
  )
}
