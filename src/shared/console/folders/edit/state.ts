import { useState } from "react"
import { type EditSurface, useEditing } from "../../edit/state"
import { type FolderDialogRequest } from "../types"

/** Name operations stay inline; only operations needing a dialog reach
 *  the host's dialog state. The callback is stable for breadcrumb effects. */
export function useFolderRequests(surface: EditSurface) {
  const editing = useEditing()
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const [request] = useState(() => {
    return (value: FolderDialogRequest | undefined) => {
      if (value?.type === "create") {
        editing?.create("folder", value.parentId, surface)
      } else if (value?.type === "rename") {
        editing?.begin(
          {
            id: value.folder.folderId,
            kind: "folder",
            name: value.folder.name,
            parentId: value.folder.parentId,
          },
          surface
        )
      } else {
        setDialog(value)
      }
    }
  })
  return [dialog, request] as const
}

export function usePendingFolder(
  parentId: string | undefined,
  surface: EditSurface
) {
  const editing = useEditing()
  const edit = editing?.edit
  return edit?.creating &&
    edit.item.kind === "folder" &&
    edit.surface === surface &&
    edit.item.parentId === parentId
    ? {
        folderId: edit.item.id,
        name: edit.item.name,
        parentId: edit.item.parentId,
      }
    : undefined
}
