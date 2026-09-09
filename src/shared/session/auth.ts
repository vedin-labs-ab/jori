import {
  type OrganizationAuthClient,
  prefetchSession,
  useActiveOrganization as useActiveOrganizationQuery,
  useAuthenticate,
  useListOrganizations as useListOrganizationsQuery,
  useSession as useSessionQuery,
} from "@better-auth-ui/react"
import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { QueryClient } from "@tanstack/react-query"
import { organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { useConvexAuth } from "convex/react"
import { regionConfig, requireRegionOrigin } from "../region/config"

/** The single Better Auth client. Jori components read session and
 *  organization state through the hooks below so tests can mock one seam. */
export const authClient = createAuthClient({
  plugins: [organizationClient({ teams: { enabled: true } }), convexClient()],
})

const organizationAuthClient = authClient as OrganizationAuthClient

/** The auth query cache, owned here instead of inside AuthProvider so the
 *  session round-trip can start at module evaluation — first render used to
 *  be the earliest trigger, which pushed the whole gate chain (session →
 *  Convex token → organization) behind hydration. staleTime mirrors the
 *  provider's own default, so the gate's useSession dedupes into this
 *  in-flight prefetch instead of refetching. */
export const authQueryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000 } },
})

if (
  typeof document !== "undefined" &&
  window.location.origin ===
    requireRegionOrigin(regionConfig, regionConfig.current)
) {
  void prefetchSession(authQueryClient, authClient)
}

/** Session and organization state served from the same react-query cache the
 *  vendored auth components use: one fetch per query, data retained across
 *  refetches and errors, and isPending true only until the first resolution —
 *  so gates can hold a stable loader exactly until the state is known. */
export function useSession() {
  return useSessionQuery(authClient)
}

/** Session gate for protected surfaces. Signed-out visitors are sent to
 *  sign-in with the current path preserved as their post-auth destination. */
export function useAuthenticatedSession() {
  return useAuthenticate(authClient)
}

export function useActiveOrganization() {
  return useActiveOrganizationQuery(organizationAuthClient)
}

export function useListOrganizations() {
  return useListOrganizationsQuery(organizationAuthClient)
}

/** Convex keeps confirmed sessions authenticated during token rotation. If
 * refresh fails, close query gates until SessionConnection reconnects. */
export function useConvexSession() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { data: session } = authClient.useSession()

  return {
    isAuthenticated,
    isLoading: isLoading || (!isAuthenticated && Boolean(session?.session)),
  }
}

/** Activates an organization and reloads the current console route. The
 *  Convex JWT carries the active organization claim and is cached per
 *  session, so a full navigation is the reliable way to re-mint it. */
export async function activateOrganization(organizationId: string | null) {
  await authClient.organization.setActive({
    organizationId,
    fetchOptions: { throw: true },
  })
  window.location.reload()
}
