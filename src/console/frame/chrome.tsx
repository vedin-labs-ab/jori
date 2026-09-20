import { useRouterState } from "@tanstack/react-router"
import { type ReactNode, Suspense } from "react"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { ConsolePage } from "../page"

/**
 * The member workspace frame. Imported lazily, so a visitor who
 * only holds a share link never downloads the console.
 *
 * The suspense fallback is a page skeleton rather than a fullscreen loader:
 * the chrome around it is already mounted and must stay visible, or moving
 * between a list and one material reads as a page load.
 */
export default function WorkspaceChrome({ children }: { children: ReactNode }) {
  // Starting an organization is a page of the workspace like any other, so
  // the gate that onboards it is the one that then opens its console.
  const creating = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === "/_workspace/new"),
  })

  return (
    <ConsolePage creating={creating}>
      {() => (
        <Suspense
          fallback={
            <ConsolePageLayout>
              <ConsoleListLoading />
            </ConsolePageLayout>
          }
        >
          {children}
        </Suspense>
      )}
    </ConsolePage>
  )
}
