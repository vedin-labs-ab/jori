import { useHydrated } from "@tanstack/react-router"
import { createAuthClient } from "better-auth/react"

const publicAuthClient = createAuthClient()

/** Lightweight session state for public pages. Authenticated surfaces load
 *  the full Better Auth and Convex provider graph only when they need it.
 *
 *  The server renders every public page signed out and pending. A browser
 *  that already holds a session can have the answer before React hydrates,
 *  and a first client render that disagrees with the server's markup makes
 *  React throw the whole page away and draw it again. So the session stays
 *  pending through hydration and lands one render later, the same way it
 *  lands when the fetch is the slower of the two. */
export function usePublicSession() {
  const session = publicAuthClient.useSession()
  const hydrated = useHydrated()

  return hydrated ? session : { ...session, data: undefined, isPending: true }
}
