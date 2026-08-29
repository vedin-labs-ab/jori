import { useEffect, useRef } from "react"
import { useAutomationEditorHost } from "../../automations/editor/host"
import { UploadFileDialog } from "../../files/upload"
import { useRetained } from "../../shared/retain"
import { CreateStoreDialog } from "../../stores/create"
import { CreateTableDialog } from "../../tables/create"

/** What the folder surfaces can create in place, each through the same
 *  dialog its own list page uses. */
export type FolderCreation = "table" | "store" | "file" | "automation"

export type CreationRequest = {
  creation: FolderCreation
  /** Pre-selects the dialogs' Folder field; undefined starts at the root. */
  folderId?: string
}

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
  const table = useRetained(request?.creation === "table" ? request : undefined)
  const store = useRetained(request?.creation === "store" ? request : undefined)
  const file = useRetained(request?.creation === "file" ? request : undefined)
  const automation = useRetained(
    request?.creation === "automation" ? request : undefined
  )

  function closeWhenDismissed(open: boolean) {
    if (!open) {
      onClose()
    }
  }

  return (
    <>
      <CreateTableDialog
        initialFolderId={table?.folderId}
        isOpen={request?.creation === "table"}
        key={`table:${table?.folderId}`}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      <CreateStoreDialog
        initialFolderId={store?.folderId}
        isOpen={request?.creation === "store"}
        key={`store:${store?.folderId}`}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      <UploadFileDialog
        initialFolderId={file?.folderId}
        isOpen={request?.creation === "file"}
        key={`file:${file?.folderId}`}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      {automation === undefined ? null : (
        <AutomationCreation
          folderId={automation.folderId}
          isOpen={request?.creation === "automation"}
          onClose={onClose}
          organizationId={organizationId}
        />
      )}
    </>
  )
}

/** The automations' create flow is the shared editor, not a plain dialog.
 *  The first automation request mounts its host (which lazily loads the
 *  editor chunk), each request opens a fresh create form with the folder
 *  pre-selected, and the dialog's own close reports back. */
function AutomationCreation({
  folderId,
  isOpen,
  onClose,
  organizationId,
}: {
  folderId?: string
  isOpen: boolean
  onClose: () => void
  organizationId: string
}) {
  const { dialog, editor } = useAutomationEditorHost(organizationId)
  const { isFormOpen, openCreateForm } = editor
  const wasRequested = useRef(false)
  const wasFormOpen = useRef(false)

  // Open on each request's rising edge; the host outlives the request so
  // the dialog can animate closed and later reopen onto another folder.
  useEffect(() => {
    if (isOpen && !wasRequested.current) {
      openCreateForm(folderId)
    }

    wasRequested.current = isOpen
  }, [folderId, isOpen, openCreateForm])

  // Report the dialog's own close — a dismissal or a save — to the owner.
  useEffect(() => {
    if (wasFormOpen.current && !isFormOpen) {
      onClose()
    }

    wasFormOpen.current = isFormOpen
  }, [isFormOpen, onClose])

  return dialog
}
