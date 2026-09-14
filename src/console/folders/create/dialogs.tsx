import { lazy, Suspense } from "react"
import { type CreationRequest } from "@/shared/console/folders/types"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { UploadFileDialog } from "../../files/upload"

// The job's flow is the shared editor, whose host carries the form's state
// and reaches the brief's schema. These dialogs mount in the shell on every
// console page, so the host arrives with the first job request instead.
const JobCreation = lazy(async () => ({
  default: (await import("./job")).JobCreation,
}))

/** The resource creation dialogs, shared by the folder page and the sidebar
 *  tree. One request value drives them all; each dialog keeps its last
 *  request through the close animation and re-mounts fresh when a later
 *  request targets a different folder. */
export function CreationDialogs({
  onClose,
  organizationId,
  request,
}: {
  onClose: () => void
  organizationId: string
  request: CreationRequest | undefined
}) {
  const file = useRetained(request?.creation === "file" ? request : undefined)
  const job = useRetained(request?.creation === "job" ? request : undefined)

  const closeWhenDismissed = closeOnDismiss(onClose)

  return (
    <>
      <UploadFileDialog
        initialFolderId={file?.folderId}
        isOpen={request?.creation === "file"}
        key={`file:${file?.folderId}`}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      {job === undefined ? null : (
        <Suspense fallback={null}>
          <JobCreation
            folderId={job.folderId}
            isOpen={request?.creation === "job"}
            onClose={onClose}
            organizationId={organizationId}
          />
        </Suspense>
      )}
    </>
  )
}
