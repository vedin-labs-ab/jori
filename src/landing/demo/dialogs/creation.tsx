import { useEffect } from "react"
import { type CreationRequest } from "@/shared/console/folders/types"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { useJobEditor } from "../editor"
import { DemoUploadDialog } from "./upload"

/** Jobs use their editor; files upload into the workspace. The upload
 *  dialog keeps its last request through the close animation and
 *  re-mounts fresh when a later request targets a different folder. */
export function DemoCreationDialogs({
  onClose,
  request,
}: {
  onClose: () => void
  request: CreationRequest | undefined
}) {
  const editor = useJobEditor()
  const file = useRetained(request?.creation === "file" ? request : undefined)

  useEffect(() => {
    if (request?.creation === "job") {
      editor.openCreateForm(request.folderId)
      onClose()
    }
  }, [editor, onClose, request])

  return (
    <DemoUploadDialog
      initialFolderId={file?.folderId}
      isOpen={request?.creation === "file"}
      key={`file:${file?.folderId}`}
      onOpenChange={closeOnDismiss(onClose)}
    />
  )
}
