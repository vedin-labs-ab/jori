import { type ReactNode } from "react"
import { type EditPersistence, useEditController } from "./controller"
import { EditingContext } from "./state"

/** One edit across the workspace, with persistence supplied by its host. */
export function EditingProvider({
  children,
  ...persistence
}: EditPersistence & { children: ReactNode }) {
  const editing = useEditController(persistence)
  return <EditingContext value={editing}>{children}</EditingContext>
}
