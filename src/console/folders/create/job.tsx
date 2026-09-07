import { useEffect, useRef } from "react"
import { useJobEditorHost } from "../../jobs/editor/host"

/** The jobs' create flow is the shared editor, not a plain dialog.
 *  The first job request mounts its host (which lazily loads the
 *  editor chunk), each request opens a fresh create form with the folder
 *  pre-selected, and the dialog's own close reports back. */
export function JobCreation({
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
  const { dialog, editor } = useJobEditorHost(organizationId)
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
