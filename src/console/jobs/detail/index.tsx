import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { AskJoriAction } from "@/shared/console/chat/pane/ask"
import { moveTarget } from "@/shared/console/folders/types"
import { JobDetail } from "@/shared/console/jobs/detail"
import { JobHeaderActions } from "@/shared/console/jobs/detail/header"
import { JobLead, JobTitleMenu } from "@/shared/console/jobs/list/actions"
import { type Job } from "@/shared/console/jobs/types"
import { ConsolePageLayout } from "@/shared/console/layout"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { useDocumentTitle } from "@/shared/console/shell/title"
import { api } from "../../../../convex/_generated/api"
import { MoveResourceDialog } from "../../folders/move"
import { ConsolePage } from "../../page"
import { useJobEditorHost } from "../editor/host"
import { useJobOverview } from "./overview"

/** Member view of one job: its overview and its runs, inside the console
 *  chrome, with the editor its Edit opens. */
export function JobView({ jobId }: { jobId: GenericId<"jobs"> }) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <JobViewContent jobId={jobId} organizationId={organizationId} />
      )}
    </ConsolePage>
  )
}

function JobViewContent({
  jobId,
  organizationId,
}: {
  jobId: GenericId<"jobs">
  organizationId: string
}) {
  const result = useQuery(api.jobs.console.get, { organizationId, jobId })

  if (result === undefined) {
    return <MaterialPlaceholder noun="job" status="loading" />
  }

  if (result.status === "unauthorized") {
    return (
      <MaterialPlaceholder
        message={result.message}
        noun="job"
        status="unauthorized"
      />
    )
  }

  if (result.status === "not_found") {
    return <MaterialPlaceholder noun="job" status="not_found" />
  }

  return <JobReadyView job={result.job} organizationId={organizationId} />
}

/** One bag of page state, so the view and its crumb stay small. */
function useJobPage(organizationId: string, job: Job) {
  const navigate = useNavigate()
  const host = useJobEditorHost(organizationId)
  const [isMoving, setIsMoving] = useState(false)

  return {
    host,
    isMoving,
    overview: useJobOverview(organizationId, job, host.permissions),
    /** Leaves for the list once the job is gone; a failed delete stays. */
    removeAndLeave: () => {
      void host.editor.deleteJob(job).then((deleted) => {
        if (deleted) {
          void navigate({ to: "/jobs" })
        }
      })
    },
    setIsMoving,
  }
}

function JobReadyView({
  job,
  organizationId,
}: {
  job: Job
  organizationId: string
}) {
  const page = useJobPage(organizationId, job)
  const { editor } = page.host
  const setPaused = (target: Job, paused: boolean) =>
    void editor.setJobPaused(target, paused)

  useDocumentTitle(`${job.name} · Jori`)
  useJobCrumb(job, page, setPaused)

  return (
    <ConsolePageLayout>
      <JobHeaderActions
        isControlling={editor.controllingJobId === job.id}
        job={job}
        onEdit={editor.openEditForm}
        onPausedChange={setPaused}
      >
        <AskJoriAction target={{ kind: "job", id: job.id }} />
      </JobHeaderActions>
      <JobDetail {...page.overview} showAudience={false} />
      <MoveResourceDialog
        onClose={() => page.setIsMoving(false)}
        organizationId={organizationId}
        resource={page.isMoving ? moveTarget("job", job.id, job) : undefined}
      />
      {page.host.dialog}
    </ConsolePageLayout>
  )
}

/** The header crumb: the folders the job is filed under, then its name
 *  with its menu. An unfiled job sits under the Jobs surface instead. The
 *  crumb is rebuilt with the page; republishing it is harmless, since the
 *  shell's children keep their identity and bail out of the re-render. */
function useJobCrumb(
  job: Job,
  page: ReturnType<typeof useJobPage>,
  setPaused: (job: Job, paused: boolean) => void
) {
  const { editor } = page.host

  useMaterialBreadcrumb(
    job.name,
    <JobTitleMenu
      isControlling={editor.controllingJobId === job.id}
      isDeleting={editor.deletingJobId === job.id}
      job={job}
      lead={<JobLead job={job} />}
      onDelete={page.removeAndLeave}
      onEdit={editor.openEditForm}
      onMoveToFolder={() => page.setIsMoving(true)}
      onPausedChange={setPaused}
    />
  )
}
