import { type ReactNode, useMemo, useReducer, useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DemoJobEditor } from "./dialogs/editor"
import { createWorkspace, reduceWorkspace } from "./state"
import { createActions } from "./state/actions"
import { DemoWorkspaceContext } from "./workspace"

/** One in-memory workspace around a whole page, so an edit in one mock
 *  shows in every other. The anchor `now` is taken once, on the client
 *  and on the server alike, and every fixture time hangs off it. */
export function DemoWorkspaceProvider({
  children,
  now,
}: {
  children: ReactNode
  /** Fixed by tests; the page takes the moment it renders. */
  now?: number
}) {
  const [anchor] = useState(() => now ?? Date.now())
  const [state, dispatch] = useReducer(reduceWorkspace, anchor, createWorkspace)
  const actions = useMemo(() => createActions(dispatch), [])
  const workspace = useMemo(() => ({ actions, state }), [actions, state])

  return (
    <DemoWorkspaceContext.Provider value={workspace}>
      <TooltipProvider>
        <DemoJobEditor>{children}</DemoJobEditor>
      </TooltipProvider>
      {/* The views toast what they did; the marketing shell has no toaster
          of its own, so the workspace brings one. */}
      <Toaster theme="light" />
    </DemoWorkspaceContext.Provider>
  )
}
