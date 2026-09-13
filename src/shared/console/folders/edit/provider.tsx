import { type ReactNode } from "react"
import { type FolderPersistence, useFolderController } from "./controller"
import { FolderEditingContext } from "./state"

/** One edit across the workspace, with persistence supplied by its host. */
export function FolderEditingProvider({
  children,
  ...persistence
}: FolderPersistence & { children: ReactNode }) {
  const editing = useFolderController(persistence)
  return <FolderEditingContext value={editing}>{children}</FolderEditingContext>
}
