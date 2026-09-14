import { useEffect } from "react"
import { toast } from "sonner"
import { type CreationRequest } from "@/shared/console/folders/types"
import { useJobEditor } from "../editor"

/** Jobs use their editor; file uploads need the connected console. */
export function DemoCreationDialogs({
  onClose,
  request,
}: {
  onClose: () => void
  request: CreationRequest | undefined
}) {
  const editor = useJobEditor()

  useEffect(() => {
    if (request?.creation === "job") {
      editor.openCreateForm(request.folderId)
      onClose()
    } else if (request?.creation === "file") {
      toast("Files upload from the console.")
      onClose()
    }
  }, [editor, onClose, request])

  return null
}
