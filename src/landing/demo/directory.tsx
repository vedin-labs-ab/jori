import { type ReactNode, useMemo } from "react"
import { VisibilityDirectoryContext } from "@/shared/console/visibility/directory"
import { grantOptions, viewerId } from "./fixtures/people"
import { useDemoWorkspace } from "./workspace"

export function DemoVisibilityDirectory({ children }: { children: ReactNode }) {
  const { state } = useDemoWorkspace()
  const directory = useMemo(
    () => ({ ...grantOptions, viewerId, folders: state.folders }),
    [state.folders]
  )
  return (
    <VisibilityDirectoryContext.Provider value={directory}>
      {children}
    </VisibilityDirectoryContext.Provider>
  )
}
