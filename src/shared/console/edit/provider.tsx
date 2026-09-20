import { type ReactNode, useState } from "react"
import { type EditPersistence, useEditController } from "./controller"
import { EditingContext } from "./state"

/** One edit across the workspace, with persistence supplied by its host.
 *  An edit belongs to the scope it began in: when `scope` changes, to
 *  another organization say, whatever is open is closed. The session is
 *  reset in place so that what it wraps is never remounted for it. */
export function EditingProvider({
  children,
  scope,
  ...persistence
}: EditPersistence & { children: ReactNode; scope?: string }) {
  const editing = useEditController(persistence)
  const [current, setCurrent] = useState(scope)

  if (current !== scope) {
    setCurrent(scope)
    editing.close()
  }

  return <EditingContext value={editing}>{children}</EditingContext>
}
