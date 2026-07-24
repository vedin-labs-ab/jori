import { type GenericId } from "convex/values"
import { lazy, Suspense } from "react"
import { AppShareView } from "@/shared/apps/share"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import {
  useActiveOrganization,
  useConvexSession,
  useSession,
} from "@/shared/session/auth"

/** Lazy so anonymous share-link visitors do not download the member console
 *  graph after the session check establishes that there is no member. */
const AppView = lazy(() =>
  import("@/console/apps/view").then((module) => ({
    default: module.AppView,
  }))
)

export function AppAccess({
  appId,
  secret,
}: {
  appId: string
  secret: string | null
}) {
  const session = useSession()
  const convex = useConvexSession()
  const organization = useActiveOrganization()
  const isSignedIn = session.data !== null && session.data !== undefined
  const loading = <FullscreenSkeletonLoader aria-label="Loading app" />

  if (session.isPending) {
    return loading
  }

  if (secret !== null && !isSignedIn) {
    return <AppShareView appId={appId} secret={secret} />
  }

  if (
    secret !== null &&
    (convex.isLoading || (isSignedIn && organization.isPending))
  ) {
    return loading
  }

  const shareFallback =
    secret === null ? undefined : <AppShareView appId={appId} secret={secret} />

  if (
    shareFallback !== undefined &&
    (!convex.isAuthenticated ||
      organization.data === null ||
      organization.data === undefined)
  ) {
    return shareFallback
  }

  return (
    <Suspense fallback={loading}>
      <AppView appId={appId as GenericId<"apps">} fallback={shareFallback} />
    </Suspense>
  )
}
