import { useContext, useMemo, useState } from "react"
import { AskJoriAction } from "@/shared/console/chat/pane/ask"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { JobDetail } from "@/shared/console/jobs/detail"
import { JobHeaderActions } from "@/shared/console/jobs/detail/header"
import { JobInstructions } from "@/shared/console/jobs/detail/instructions"
import { JobTitleMenu } from "@/shared/console/jobs/list/actions"
import { type Job } from "@/shared/console/jobs/types"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useClientPagination } from "@/shared/console/list/pagination"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { closeOnDismiss } from "@/shared/console/retain"
import { ExecutionRows } from "@/shared/console/runs/list/rows"
import { useExecutionClock } from "@/shared/console/runs/time"
import { pageSize } from "@/shared/console/runs/types"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { useNow } from "@/shared/console/time"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { folderNames } from "../../derive/folders"
import { jobMoveSubject } from "../../derive/jobs"
import { runViews } from "../../derive/runs"
import { DemoMoveDialog } from "../../dialogs/move"
import { useJobEditor } from "../../editor"
import { demoPermissions, demoSkills } from "../../fixtures/permissions"
import { useDemoWorkspace } from "../../workspace"
import { useRunRowSlots } from "../slots"

/** One job's page over the workspace: the console's own overview and
 *  the job's runs, under the header actions and the crumb the console
 *  gives a job. */
export function JobPage({ jobId }: { jobId: string }) {
  const { state } = useDemoWorkspace()
  const job = state.jobs.find((candidate) => candidate.id === jobId)

  if (job === undefined) {
    return <MaterialPlaceholder noun="job" status="not_found" />
  }

  return <JobReadyPage job={job} />
}

function JobReadyPage({ job }: { job: Job }) {
  const { actions, state } = useDemoWorkspace()
  const editor = useJobEditor()
  const [isMoving, setIsMoving] = useState(false)
  const folders = useMemo(() => folderNames(state), [state])
  const now = useNow(30_000)

  useJobCrumb(job, () => setIsMoving(true))

  return (
    <ConsolePageLayout>
      <JobHeaderActions
        isControlling={false}
        job={job}
        onEdit={editor.openEditForm}
        onPausedChange={actions.setJobPaused}
      >
        <AskJoriAction target={{ kind: "job", id: job.id }} />
      </JobHeaderActions>
      <JobDetail
        showAudience={false}
        folders={folders}
        instructions={
          <JobInstructions
            job={job}
            permissions={demoPermissions}
            skills={demoSkills}
          />
        }
        job={job}
        now={now}
        runs={<JobRuns jobId={job.id} />}
      />
      <DemoMoveDialog
        onOpenChange={closeOnDismiss(() => setIsMoving(false))}
        subject={isMoving ? jobMoveSubject(job) : undefined}
      />
    </ConsolePageLayout>
  )
}

/** The job in the chat's pane: the console's overview and the job's
 *  runs, without the page's header and crumb. Arrives with this module,
 *  which the pane loads only once a job is opened in it. */
export function JobPaneBody({ jobId }: { jobId: string }) {
  const { state } = useDemoWorkspace()
  const job = state.jobs.find((candidate) => candidate.id === jobId)
  const folders = useMemo(() => folderNames(state), [state])
  const now = useNow(30_000)

  const editor = useJobEditor()
  useMaterialBreadcrumb(
    job?.name ?? "Job",
    undefined,
    job === undefined ? undefined : (
      <VisibilityButton
        visibility={job.visibility}
        folderId={job.folderId}
        ownerId={job.ownerId}
        onClick={() => editor.openEditForm(job)}
      />
    )
  )

  if (job === undefined) {
    return null
  }

  return (
    <ChatPaneBody
      material={{
        kind: "job",
        detail: {
          showAudience: false,
          folders,
          instructions: (
            <JobInstructions
              job={job}
              permissions={demoPermissions}
              skills={demoSkills}
            />
          ),
          job,
          now,
          runs: <JobRuns jobId={job.id} />,
        },
      }}
    />
  )
}

/** The job's crumb: the Jobs surface, then its name with the menu the
 *  console hangs off it. Deleting leaves for the list. */
function useJobCrumb(job: Job, onMoveToFolder: () => void) {
  const { actions } = useDemoWorkspace()
  const editor = useJobEditor()
  const navigation = useContext(ConsoleNavigationContext)

  useMaterialBreadcrumb(
    job.name,
    <JobTitleMenu
      isControlling={false}
      isDeleting={false}
      job={job}
      onDelete={(target) => {
        actions.deleteJob(target)
        navigation?.navigate("/jobs")
      }}
      onEdit={editor.openEditForm}
      onMoveToFolder={onMoveToFolder}
      onPausedChange={actions.setJobPaused}
    />
  )
}

/** The job's runs out of the workspace, newest first, paged like the
 *  Activity page and opening to the same detail. */
function JobRuns({ jobId }: { jobId: string }) {
  const { actions, state } = useDemoWorkspace()
  const runs = useMemo(
    () => runViews(state).filter((run) => run.job?.id === jobId),
    [state, jobId]
  )
  const now = useExecutionClock(runs, state.now)
  const pagination = useClientPagination({
    hasFilters: false,
    isReady: true,
    itemLabel: { singular: "run", plural: "runs" },
    items: runs,
    pageSize,
  })
  const slots = useRunRowSlots(actions, state.activity)

  return (
    <>
      <ExecutionRows
        {...slots}
        hasFilters={false}
        isLoading={false}
        now={now}
        rows={pagination.visibleRows}
        showAudience={false}
      />
      <ConsoleListPager pagination={pagination} />
    </>
  )
}
