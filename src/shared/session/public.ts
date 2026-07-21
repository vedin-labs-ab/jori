import { createAuthClient } from "better-auth/react"

const publicAuthClient = createAuthClient()

/** Lightweight session state for public pages. Authenticated surfaces load
 * the full Better Auth and Convex provider graph only when they need it. */
export function usePublicSession() {
  return publicAuthClient.useSession()
}
