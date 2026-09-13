import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { type Job } from "@/shared/console/jobs/types"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { api } from "../../../../convex/_generated/api"
import { useJobOverview } from "../../jobs/detail/overview"
import { useJobEditorHost } from "../../jobs/editor/host"

/** A job in the pane: the same overview its page mounts — the brief,
 *  how it starts, what it may touch, and its runs. */
export function PaneJob({
  id,
  organizationId,
}: {
  id: string
  organizationId: string
}) {
  const result = useQuery(api.jobs.console.get, {
    organizationId,
    jobId: id as GenericId<"jobs">,
  })

  if (result === undefined) {
    return <ConsoleListLoading />
  }

  if (result.status !== "ready") {
    return null
  }

  return <PaneOverview job={result.job} organizationId={organizationId} />
}

function PaneOverview({
  job,
  organizationId,
}: {
  job: Job
  organizationId: string
}) {
  const { permissions, editor, dialog } = useJobEditorHost(organizationId)
  useMaterialBreadcrumb(
    job.name,
    undefined,
    <VisibilityButton
      visibility={job.visibility}
      folderId={job.folderId}
      ownerId={job.ownerId}
      onClick={() => editor.openEditForm(job)}
    />
  )
  const overview = useJobOverview(organizationId, job, permissions)

  return (
    <>
      <ChatPaneBody
        material={{ kind: "job", detail: { ...overview, showAudience: false } }}
      />
      {dialog}
    </>
  )
}
