import { type ReactNode, Suspense } from "react"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import {
  useActiveOrganization,
  useConvexSession,
  useSession,
} from "@/shared/session/auth"

/** The dual-mode fork every material page shares: an anonymous visitor
 *  gets the read-only share view — which answers to a share secret or to
 *  the material's public visibility; a signed-in member gets the lazily
 *  loaded console view, falling back to the share view when the session
 *  cannot reach an organization. */
export function MaterialAccess({
  label,
  renderMember,
  renderShare,
  secret,
}: {
  label: string
  renderMember: (fallback: ReactNode | undefined) => ReactNode
  renderShare: () => ReactNode
  secret: string | null
}) {
  const session = useSession()
  const convex = useConvexSession()
  const organization = useActiveOrganization()
  const isSignedIn = session.data !== null && session.data !== undefined
  const loading = <FullscreenSkeletonLoader aria-label={label} />

  if (session.isPending) {
    return loading
  }

  if (!isSignedIn) {
    return renderShare()
  }

  if (
    secret !== null &&
    (convex.isLoading || (isSignedIn && organization.isPending))
  ) {
    return loading
  }

  const shareFallback = secret === null ? undefined : renderShare()

  if (
    shareFallback !== undefined &&
    (!convex.isAuthenticated ||
      organization.data === null ||
      organization.data === undefined)
  ) {
    return shareFallback
  }

  return <Suspense fallback={loading}>{renderMember(shareFallback)}</Suspense>
}
