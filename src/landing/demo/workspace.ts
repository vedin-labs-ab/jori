import { createContext, useContext } from "react"
import { type DemoState } from "./state"
import { type DemoActions } from "./state/actions"

type DemoWorkspace = {
  actions: DemoActions
  state: DemoState
}

export const DemoWorkspaceContext = createContext<DemoWorkspace | null>(null)

/** The workspace around this mock: what it holds, and what it can be
 *  asked to do. */
export function useDemoWorkspace() {
  const workspace = useContext(DemoWorkspaceContext)

  if (workspace === null) {
    throw new Error("useDemoWorkspace needs a DemoWorkspaceProvider above it.")
  }

  return workspace
}
