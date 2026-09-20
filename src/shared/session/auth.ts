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
import { useSyncExternalStore } from "react"
import { regionConfig, requireRegionOrigin } from "../region/config"
import { refreshConvexToken, useConvexConnection } from "./convex"

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
  const { isAuthenticated, isLoading } = useConvexConnection()
  const { data: session } = authClient.useSession()

  return {
    isAuthenticated,
    isLoading: isLoading || (!isAuthenticated && Boolean(session?.session)),
  }
}

/** Activates an organization without a page load. The Convex token carries
 *  the active organization as a claim, so it is swapped for one minted from
 *  the session as it now stands, and the organization queries are read again
 *  only once Convex has accepted it: nothing ever pairs one organization
 *  with the other's token.
 *
 *  Whatever is mounted for the old organization must be gone before its
 *  queries run under the new claim, so the console holds its loader for the
 *  length of the switch. `inPlace` skips that, for a caller that stays on
 *  screen and has nothing scoped to the old organization: onboarding. */
export async function activateOrganization(
  organizationId: string | null,
  { inPlace = false }: { inPlace?: boolean } = {}
) {
  await authClient.organization.setActive({
    organizationId,
    fetchOptions: { throw: true },
  })
  setSwitching(!inPlace)

  try {
    await refreshConvexToken()
    await authQueryClient.refetchQueries({
      predicate: (query) => query.queryKey.includes("organization"),
    })
  } finally {
    setSwitching(false)
  }
}

let switching = false
const switchingListeners = new Set<() => void>()

function setSwitching(next: boolean) {
  if (switching !== next) {
    switching = next

    for (const listener of switchingListeners) {
      listener()
    }
  }
}

/** Whether the console is between two organizations. */
export function useOrganizationSwitching() {
  return useSyncExternalStore(
    (listener) => {
      switchingListeners.add(listener)

      return () => switchingListeners.delete(listener)
    },
    () => switching,
    () => false
  )
}
