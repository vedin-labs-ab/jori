import { createContext, useContext, useRef } from "react"
import { type StoreSummary } from "../stores/types"
import { type TableSummary } from "../tables/types"

export type EditKind = "folder" | "table" | "store"
export type EditSurface = "sidebar" | "contents" | "title" | "table" | "store"
export type EditItem = {
  id: string
  kind: EditKind
  name: string
  parentId?: string
  table?: TableSummary
  store?: StoreSummary
}
export type Edit = {
  item: EditItem
  surface: EditSurface
  target?: string
  creating?: boolean
  created?: boolean
}
export type Editing = {
  edit: Edit | undefined
  claim: (target: string) => void
  begin: (item: EditItem, surface: EditSurface) => void
  create: (
    kind: EditKind,
    parentId: string | undefined,
    surface: EditSurface
  ) => void
  save: (item: EditItem, name: string) => Promise<unknown>
  close: () => void
  register: (finish: (() => Promise<boolean>) | undefined) => void
}
export const EditingContext = createContext<Editing | undefined>(undefined)
export const useEditing = () => useContext(EditingContext)

/** Dismissing a menu must not steal focus from the new name input. */
export function useEditMenuFocus() {
  const editing = useEditing()
  const current = useRef(editing)
  current.current = editing
  return (event: Event) => {
    if (current.current?.edit !== undefined) {
      event.preventDefault()
    }
  }
}

/** Creation stays pinned even before the new item reaches the live query. */
export function useCreatedItem(surface: EditSurface, parentId?: string) {
  const edit = useEditing()?.edit
  return edit &&
    (edit.item.kind !== "folder" || surface === "contents") &&
    edit.surface === surface &&
    (surface !== "contents" || edit.item.parentId === parentId) &&
    (edit.creating || edit.created)
    ? edit
    : undefined
}
