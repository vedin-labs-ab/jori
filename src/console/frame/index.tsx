import { Outlet, useRouterState } from "@tanstack/react-router"
import { lazy, type ReactNode, Suspense } from "react"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import {
  useActiveOrganization,
  useConvexSession,
  useSession,
} from "@/shared/session/auth"
import { useShareSecret } from "@/shared/share/link"
import {
  type MaterialMode,
  MaterialModeProvider,
  resolveMaterialMode,
} from "./mode"

const WorkspaceChrome = lazy(() => import("./chrome"))

/** Resolves the viewer above every workspace route. Only material detail
 *  routes allow anonymous share access; all other pages use the session gate.
 *  Keeping the same frame here preserves the shell across sections. */
export function WorkspaceFrame({
  children,
  shareable,
}: {
  children: ReactNode
  shareable: boolean
}) {
  const mode = useResolvedMode(shareable)

  if (mode === "resolving") {
    return <FullscreenSkeletonLoader />
  }

  if (mode === "share") {
    return (
      <MaterialModeProvider value="share">
        <Suspense fallback={<FullscreenSkeletonLoader />}>{children}</Suspense>
      </MaterialModeProvider>
    )
  }

  return (
    <MaterialModeProvider value="console">
      <Suspense fallback={<FullscreenSkeletonLoader />}>
        <WorkspaceChrome>{children}</WorkspaceChrome>
      </Suspense>
    </MaterialModeProvider>
  )
}

/** Every gate query mounts together so their round-trips overlap. */
function useResolvedMode(shareable: boolean): MaterialMode {
  const secret = useShareSecret()
  const session = useSession()
  const convex = useConvexSession()
  const organization = useActiveOrganization()

  if (!shareable) {
    return "console"
  }

  return resolveMaterialMode({
    hasOrganization:
      organization.data !== null && organization.data !== undefined,
    isConvexAuthenticated: convex.isAuthenticated,
    isConvexLoading: convex.isLoading,
    isOrganizationPending: organization.isPending,
    isSessionPending: session.isPending,
    isSignedIn: session.data !== null && session.data !== undefined,
    secret,
  })
}

/** Match the committed route, so a pending navigation cannot change the
 *  viewer mode around the page that is still on screen. */
export function WorkspaceSection() {
  const shareable = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) =>
          match.routeId === "/_workspace/files/$fileId/" ||
          match.routeId === "/_workspace/stores/$storeId/" ||
          match.routeId === "/_workspace/tables/$tableId/"
      ),
  })

  return (
    <WorkspaceFrame shareable={shareable}>
      <Outlet />
    </WorkspaceFrame>
  )
}
