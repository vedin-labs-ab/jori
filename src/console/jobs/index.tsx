import { useState } from "react"
import {
  type MoveResourceTarget,
  moveTarget,
} from "@/shared/console/folders/types"
import { JobList } from "@/shared/console/jobs/list"
import { jobNoun } from "@/shared/console/jobs/list/config"
import { JobFilters } from "@/shared/console/jobs/list/filters"
import { type Job } from "@/shared/console/jobs/types"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListBody } from "@/shared/console/list/pager"
import { MoveResourcesDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { useJobEditorHost } from "./editor/host"
import { defaultJobFilter, useJobBulk, useJobListPage } from "./list"

export function Jobs() {
  return (
    <ConsolePage>
      {(organizationId) => <JobListView organizationId={organizationId} />}
    </ConsolePage>
  )
}

function useJobsPage(organizationId: string) {
  const page = useJobListPage(organizationId)
  const [moving, setMoving] = useState<MoveResourceTarget[]>()

  return {
    ...page,
    bulk: useJobBulk(organizationId, page.selection),
    host: useJobEditorHost(organizationId),
    moving,
    setMoving,
  }
}

function JobListView({ organizationId }: { organizationId: string }) {
  const page = useJobsPage(organizationId)
  const { editor, preloadDialog } = page.host
  const create = () => {
    void preloadDialog()
    editor.openCreateForm()
  }

  return (
    <JobFilters
      audience={page.audience}
      defaultStatus={defaultJobFilter}
      onAudienceChange={page.setAudience}
      onCreate={editor.openCreateForm}
      onCreateIntent={preloadDialog}
      onQueryChange={page.setQuery}
      onStatusChange={page.setFilter}
      query={page.query}
      status={page.filter}
    >
      <ConsoleListLayout>
        <ConsoleListBody
          isLoading={page.list === undefined}
          pagination={
            page.list?.status === "ready" ? page.pagination : undefined
          }
        >
          <JobList
            config={page.config}
            controllingJobId={editor.controllingJobId}
            controls={page.controls}
            deletingJobId={editor.deletingJobId}
            folders={page.folders}
            hasFilters={page.hasFilters}
            jobs={page.pagination.visibleRows}
            onCreate={create}
            onDelete={(job) => void editor.deleteJob(job)}
            onEdit={editor.openEditForm}
            onMoveToFolder={(job) => page.setMoving([toMoveTarget(job)])}
            onPausedChange={(job, paused) =>
              void editor.setJobPaused(job, paused)
            }
            selection={page.selection}
            selectionActions={{
              isBusy: page.bulk.isBusy,
              noun: jobNoun,
              onMove: () =>
                page.setMoving(page.selection.selected.map(toMoveTarget)),
              onRemove: page.bulk.removeSelected,
              removal: page.bulk.removal,
            }}
            unauthorizedMessage={
              page.list?.status === "unauthorized"
                ? page.list.message
                : undefined
            }
          />
        </ConsoleListBody>
        <JobsOverlays organizationId={organizationId} page={page} />
      </ConsoleListLayout>
    </JobFilters>
  )
}

/** The page's dialogs. */
function JobsOverlays({
  organizationId,
  page,
}: {
  organizationId: string
  page: ReturnType<typeof useJobsPage>
}) {
  return (
    <>
      <MoveResourcesDialog
        onClose={() => page.setMoving(undefined)}
        organizationId={organizationId}
        resources={page.moving}
      />
      {page.host.dialog}
    </>
  )
}

function toMoveTarget(job: Job) {
  return moveTarget("job", job.id, job)
}
