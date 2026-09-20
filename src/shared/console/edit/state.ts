import { createContext, useContext, useRef } from "react"
import { type StoreSummary } from "../stores/types"
import { type TableSummary } from "../tables/types"

/** What is made in place, named as it is created. */
export type CreateKind = "folder" | "table" | "store"
/** What is renamed in place: those, and a file, which arrives by upload. */
export type EditKind = CreateKind | "file"
/** Where a name is edited: the sidebar's tree, a folder's listing, a kind's
 *  own list page, or the breadcrumb over a detail page. */
export type EditSurface = "sidebar" | "contents" | "list" | "title"
export type EditItem = {
  id: string
  kind: EditKind
  name: string
  parentId?: string
  table?: TableSummary
  store?: StoreSummary
}
/** What a Rename item starts: the item, and the view of it to edit in. */
export type EditTarget = { item: EditItem; surface: EditSurface }
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
    kind: CreateKind,
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
