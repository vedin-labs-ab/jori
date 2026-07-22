import {
  type OrganizationAuthClient,
  useActiveOrganization as useActiveOrganizationQuery,
  useListOrganizations as useListOrganizationsQuery,
  useSession as useSessionQuery,
} from "@better-auth-ui/react"
import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { useConvexAuth } from "convex/react"

/** The single Better Auth client. Milo components read session and
 *  organization state through the hooks below so tests can mock one seam. */
export const authClient = createAuthClient({
  plugins: [organizationClient(), convexClient()],
})

const organizationAuthClient = authClient as OrganizationAuthClient

/** Session and organization state served from the same react-query cache the
 *  vendored auth components use: one fetch per query, data retained across
 *  refetches and errors, and isPending true only until the first resolution —
 *  so gates can hold a stable loader exactly until the state is known. */
export function useSession() {
  return useSessionQuery(authClient)
}

export function useActiveOrganization() {
  return useActiveOrganizationQuery(organizationAuthClient)
}

export function useListOrganizations() {
  return useListOrganizationsQuery(organizationAuthClient)
}

/** One-way latch: once this page load has authenticated with Convex, token
 *  re-mints must read as still-authenticated instead of tearing down UI. */
let convexAuthenticatedOnce = false

export function useConvexSession() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isAuthenticated) {
    convexAuthenticatedOnce = true
  }

  return {
    isAuthenticated: isAuthenticated || convexAuthenticatedOnce,
    isLoading: isLoading && !convexAuthenticatedOnce,
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
