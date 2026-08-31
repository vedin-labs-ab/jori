import { Outlet } from "@tanstack/react-router"
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

const MaterialChrome = lazy(() => import("./chrome"))

/**
 * The frame a material section renders in, chosen once above the outlet.
 *
 * Everything below it — the console list, one material's page, the share
 * view — swaps inside a frame that stays mounted, so the sidebar, header,
 * and their state survive navigation. Pages compose `ConsolePage` as usual;
 * it recognises the frame and reuses it instead of opening a second one.
 */
export function MaterialFrame({ children }: { children: ReactNode }) {
  const mode = useResolvedMode()

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
        <MaterialChrome>{children}</MaterialChrome>
      </Suspense>
    </MaterialModeProvider>
  )
}

/** Every gate query mounts together so their round-trips overlap. */
function useResolvedMode(): MaterialMode {
  const secret = useShareSecret()
  const session = useSession()
  const convex = useConvexSession()
  const organization = useActiveOrganization()

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

/** A material section's route component. The frame outlives the move between
 *  the list and one material, so the console chrome around them is mounted
 *  once. */
export function MaterialSection() {
  return (
    <MaterialFrame>
      <Outlet />
    </MaterialFrame>
  )
}
