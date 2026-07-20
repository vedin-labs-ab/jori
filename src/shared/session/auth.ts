import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/** The single Better Auth client. Milo components read session and
 *  organization state from here so tests can mock one seam. */
export const authClient = createAuthClient({
  plugins: [organizationClient(), convexClient()],
})

/** True only while an auth query hook is on its first load. Refetches (for
 *  example on window focus) re-enter isPending whenever data is null — a
 *  signed-out session, no active organization — and must not tear down UI
 *  that is already showing. */
export function isSessionLoading(query: {
  isPending: boolean
  isRefetching: boolean
}) {
  return query.isPending && !query.isRefetching
}

/** Activates an organization and reloads into the console. The Convex JWT
 *  carries the active organization claim and is cached per session, so a
 *  full navigation is the reliable way to re-mint it everywhere. */
export async function activateOrganization(organizationId: string | null) {
  await authClient.organization.setActive({ organizationId })
  window.location.assign("/console")
}
