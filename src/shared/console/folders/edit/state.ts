import { createContext, useContext, useRef, useState } from "react"
import { type FolderSummary } from "../tree"
import { type FolderDialogRequest } from "../types"

export type FolderSurface = "sidebar" | "contents" | "title"
export type FolderEdit = {
  folder: FolderSummary
  surface: FolderSurface
  target?: string
  creating?: boolean
}
export type FolderEditing = {
  claim: (target: string) => void
  edit: FolderEdit | undefined
  begin: (folder: FolderSummary, surface: FolderSurface) => void
  create: (parentId: string | undefined, surface: FolderSurface) => void
  save: (folderId: string, name: string) => Promise<unknown>
  close: () => void
  register: (finish: (() => Promise<boolean>) | undefined) => void
}
export const FolderEditingContext = createContext<FolderEditing | undefined>(
  undefined
)
export const useFolderEditing = () => useContext(FolderEditingContext)

/** Name operations stay inline; only operations needing a dialog reach
 *  the host's dialog state. The callback is stable for breadcrumb effects. */
export function useFolderRequests(surface: FolderSurface) {
  const editing = useFolderEditing()
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const [request] = useState(() => {
    return (value: FolderDialogRequest | undefined) => {
      if (value?.type === "create") {
        editing?.create(value.parentId, surface)
      } else if (value?.type === "rename") {
        editing?.begin(value.folder, surface)
      } else {
        setDialog(value)
      }
    }
  })
  return [dialog, request] as const
}

export function usePendingFolder(
  parentId: string | undefined,
  surface: FolderSurface
) {
  const editing = useFolderEditing()
  const edit = editing?.edit
  return edit?.creating &&
    edit.surface === surface &&
    edit.folder.parentId === parentId
    ? edit.folder
    : undefined
}

/** A dismissed menu must not pull focus back out of the inline editor. */
export function useFolderMenuFocus() {
  const editing = useFolderEditing()
  const current = useRef(editing)
  current.current = editing
  return (event: Event) => {
    if (current.current?.edit !== undefined) {
      event.preventDefault()
    }
  }
}
